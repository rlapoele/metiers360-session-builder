// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  createSessionDraftStore,
  SESSION_DRAFT_STORAGE_KEY,
} from '@features/sessions/session-draft.store';
import type { SaveOperation } from '@features/sessions/save-operation-contracts';

const stores: ReturnType<typeof createSessionDraftStore>[] = [];
const runtime = crypto.randomUUID();
const draft = { name: 'Atelier', video_ids: ['one'], headset_id: null };
function make() {
  const store = createSessionDraftStore({ runExclusive: async (fn) => fn() });
  stores.push(store);
  store.hydrate(localStorage);
  return store;
}
function notify() {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: SESSION_DRAFT_STORAGE_KEY,
      storageArea: localStorage,
    }),
  );
}
async function ready() {
  localStorage.setItem(
    SESSION_DRAFT_STORAGE_KEY,
    JSON.stringify({ version: 1, ...draft }),
  );
  return make();
}
afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose());
  localStorage.clear();
});

describe('atomic cross-tab save lifecycle', () => {
  it('persists one operation before sending and rejects edits and another save in both tabs', async () => {
    const first = await ready();
    const second = make();
    const operation = await first.beginSave(draft, runtime);
    notify();
    expect(second.$saveState.get()?.request.operation_id).toBe(
      operation.request.operation_id,
    );
    expect(await second.setName('Overwritten')).toBe(false);
    expect(await first.removeVideo('one')).toBe(false);
    expect((await second.beginSave(draft, runtime)).request.operation_id).toBe(
      operation.request.operation_id,
    );
    expect(first.$draft.get().name).toBe('Atelier');
  });
  it('clears exactly once on confirmed success, rejects stale results and protects the next draft', async () => {
    const first = await ready();
    const second = make();
    const save = await first.beginSave(draft, runtime);
    const result: SaveOperation = {
      ...save.request,
      runtime_id: runtime,
      status: 'succeeded',
      session: {
        id: 'saved',
        ...draft,
        created_at: '2026-11-11T12:00:00Z',
        total_duration_seconds: 60,
      },
    };
    expect(await first.applySaveResult(result)).toBe(true);
    notify();
    expect(second.$draft.get().video_ids).toEqual([]);
    await second.setName('New draft');
    notify();
    expect(await first.applySaveResult(result)).toBe(false);
    expect(first.$draft.get().name).toBe('New draft');
  });
  it('retains the original draft on failure, unlocks it and uses a fresh operation for an explicit retry', async () => {
    const store = await ready();
    const save = await store.beginSave(draft, runtime);
    await store.applySaveResult({
      ...save.request,
      runtime_id: runtime,
      status: 'failed',
      failure: {
        http_status: 503,
        body: { error: 'unavailable', message: 'Try later' },
      },
    });
    expect(store.$draft.get().video_ids).toEqual(['one']);
    expect(await store.setName('Changed')).toBe(true);
    const retry = await store.beginSave({ ...draft, name: 'Changed' }, runtime);
    expect(retry.request.operation_id).not.toBe(save.request.operation_id);
    expect(retry.request.client_id).toBe(save.request.client_id);
  });
  it('keeps uncertainty read-only across reload and never lets a mismatched result clear the draft', async () => {
    const store = await ready();
    const save = await store.beginSave(draft, runtime);
    await store.markSaveUncertain(save.request.operation_id, 'network');
    const reloaded = make();
    expect(reloaded.$isReadOnly.get()).toBe(true);
    expect(
      await reloaded.applySaveResult({
        ...save.request,
        runtime_id: crypto.randomUUID(),
        status: 'pending',
      }),
    ).toBe(false);
    expect(await reloaded.setName('Lost')).toBe(false);
  });
  it('refuses to submit an obsolete snapshot or start without writable shared storage', async () => {
    const store = await ready();
    await store.setName('Changed elsewhere');
    await expect(store.beginSave(draft, runtime)).rejects.toThrow(/modifi/);
    const broken = createSessionDraftStore({
      runExclusive: async (fn) => fn(),
    });
    stores.push(broken);
    broken.hydrate({
      getItem: () => JSON.stringify({ version: 1, ...draft }),
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    });
    await expect(broken.beginSave(draft, runtime)).rejects.toThrow(/stockage/);
    expect(broken.$saveState.get()).toBeUndefined();
  });

  it('allows manual recovery only after lost tracking, then rejects late outcomes for the abandoned draft', async () => {
    const store = await ready();
    const save = await store.beginSave(draft, runtime);
    expect(await store.releaseUncertainSave(save.request.operation_id)).toBe(
      false,
    );
    await store.markSaveUncertain(save.request.operation_id, 'network');
    expect(await store.releaseUncertainSave(save.request.operation_id)).toBe(
      false,
    );
    await store.markSaveUncertain(save.request.operation_id, 'runtime');
    expect(await store.releaseUncertainSave(save.request.operation_id)).toBe(
      true,
    );
    expect(store.$draft.get().name).toBe('Atelier');
    expect(store.$isReadOnly.get()).toBe(false);
    expect(
      await store.applySaveResult({
        ...save.request,
        runtime_id: runtime,
        status: 'succeeded',
        session: {
          id: 'late',
          ...draft,
          created_at: '2026-11-11T12:00:00Z',
          total_duration_seconds: 60,
        },
      }),
    ).toBe(false);
    const next = await store.beginSave(draft, runtime);
    expect(next.request.draft_id).not.toBe(save.request.draft_id);
  });
});
