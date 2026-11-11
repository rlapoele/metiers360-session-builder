// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSessionDraftStore,
  SESSION_DRAFT_STORAGE_KEY,
} from '@features/sessions/session-draft.store';
import type { Video } from '@lib/api/schemas';

const video = (id: string): Video => ({
  id,
  title: id,
  description: '',
  duration_seconds: 60,
  jobs: [],
  audiences: [],
  compatible_headsets: ['pico-4'],
  thumbnail_url: null,
  published_at: '2024-01-01',
});
const stores: ReturnType<typeof createSessionDraftStore>[] = [];
const makeStore = (options?: Parameters<typeof createSessionDraftStore>[0]) => {
  const store = createSessionDraftStore(options);
  stores.push(store);
  store.hydrate(localStorage);
  return store;
};
const notify = () =>
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: SESSION_DRAFT_STORAGE_KEY,
      storageArea: localStorage,
      // Deliberately old: notifications must read the current storage value.
      newValue: '{}',
    }),
  );

afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose());
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cross-tab draft synchronization', () => {
  it('preserves legacy fields and order when the first edit migrates storage', async () => {
    const draft = {
      version: 1,
      name: 'Ancien brouillon',
      video_ids: ['two', 'one'],
      headset_id: 'pico-4',
    };
    localStorage.setItem(SESSION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    const first = makeStore();
    const second = makeStore();
    expect(second.$draft.get()).toEqual(draft);
    await first.setName('Nouveau nom');
    notify();
    expect(second.$draft.get()).toEqual({ ...draft, name: 'Nouveau nom' });
    expect(
      JSON.parse(localStorage.getItem(SESSION_DRAFT_STORAGE_KEY)!),
    ).toMatchObject({
      version: 2,
      draft_id: 'legacy',
      revision: 1,
      draft: { ...draft, name: 'Nouveau nom' },
    });
  });

  it('receives the current draft without echoing a storage notification', async () => {
    const first = makeStore();
    const second = makeStore();
    await first.addVideo(video('one'));
    await first.setName('Atelier');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    notify();
    expect(second.$draft.get()).toEqual(first.$draft.get());
    expect(second.$count.get()).toBe(1);
    expect(write).not.toHaveBeenCalled();
    await second.setHeadset('pico-4');
    notify();
    expect(first.$draft.get().headset_id).toBe('pico-4');
  });

  it('refreshes on focus and keeps valid state when an external payload is corrupt', async () => {
    const first = makeStore();
    const second = makeStore();
    await first.addVideo(video('one'));
    window.dispatchEvent(new Event('focus'));
    expect(second.$draft.get().video_ids).toEqual(['one']);
    localStorage.setItem(SESSION_DRAFT_STORAGE_KEY, '{broken');
    notify();
    expect(second.$draft.get().video_ids).toEqual(['one']);
  });

  it('merges simultaneous actions against latest storage inside a shared lock', async () => {
    let queue = Promise.resolve(true);
    const runExclusive = (change: () => boolean) => {
      const next = queue.then(change);
      queue = next;
      return next;
    };
    const first = makeStore({ runExclusive });
    const second = makeStore({ runExclusive });
    await Promise.all([
      first.addVideo(video('one')),
      second.addVideo(video('two')),
    ]);
    notify();
    expect(first.$draft.get().video_ids).toEqual(['one', 'two']);
    expect(second.$draft.get()).toEqual(first.$draft.get());
    await Promise.all([first.setName('Atelier'), second.setHeadset('pico-4')]);
    notify();
    expect(first.$draft.get()).toMatchObject({
      name: 'Atelier',
      headset_id: 'pico-4',
    });
  });

  it('keeps the latest typed name visible while earlier writes are queued', async () => {
    const store = makeStore({
      runExclusive: (change) => Promise.resolve().then(change),
    });
    const writes = ['A', 'At', 'Atelier'].map((name) => store.setName(name));
    expect(store.$draft.get().name).toBe('Atelier');
    await writes[0];
    expect(store.$draft.get().name).toBe('Atelier');
    await Promise.all(writes);
    expect(
      JSON.parse(localStorage.getItem(SESSION_DRAFT_STORAGE_KEY)!).draft.name,
    ).toBe('Atelier');
  });

  it('does not replay queued edits into a draft that another tab has cleared', async () => {
    let release: (() => void) | undefined;
    const first = makeStore();
    await first.addVideo(video('one'));
    const second = makeStore({
      runExclusive: (change) =>
        new Promise((resolve) => {
          release = () => resolve(change());
        }),
    });
    const pending = second.setName('Old draft edit');
    await first.clearAfterSave();
    release?.();
    expect(await pending).toBe(false);
    expect(second.$draft.get().name).toBe('');
    expect(second.$count.get()).toBe(0);
  });

  it('handles key removal, ignores other storage areas, and refreshes on pageshow', async () => {
    const first = makeStore();
    const second = makeStore();
    await first.addVideo(video('one'));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSION_DRAFT_STORAGE_KEY,
        storageArea: sessionStorage,
      }),
    );
    expect(second.$count.get()).toBe(0);
    window.dispatchEvent(new Event('pageshow'));
    expect(second.$count.get()).toBe(1);
    localStorage.removeItem(SESSION_DRAFT_STORAGE_KEY);
    notify();
    expect(second.$count.get()).toBe(0);
  });

  it('does not restore a queued edit after the persisted draft is removed', async () => {
    const first = makeStore();
    await first.addVideo(video('one'));
    let release: (() => void) | undefined;
    const second = makeStore({
      runExclusive: (change) =>
        new Promise((resolve) => {
          release = () => resolve(change());
        }),
    });
    const pending = second.setName('Old draft');
    localStorage.removeItem(SESSION_DRAFT_STORAGE_KEY);
    notify();
    expect(second.$draft.get().name).toBe('');
    release?.();
    expect(await pending).toBe(false);
    expect(second.$count.get()).toBe(0);
    expect(localStorage.getItem(SESSION_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('keeps a draft usable in memory after a write fails', async () => {
    const first = makeStore();
    await first.addVideo(video('one'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    await first.setName('Still here');
    window.dispatchEvent(new Event('focus'));
    await first.addVideo(video('two'));
    expect(first.$draft.get()).toMatchObject({
      name: 'Still here',
      video_ids: ['one', 'two'],
    });
  });

  it('propagates a clear and detaches its browser listeners when disposed', async () => {
    const first = makeStore();
    const second = makeStore();
    await first.addVideo(video('one'));
    notify();
    await first.clearAfterSave();
    notify();
    expect(second.$count.get()).toBe(0);
    second.dispose();
    await first.addVideo(video('two'));
    notify();
    expect(second.$count.get()).toBe(0);
  });
});
