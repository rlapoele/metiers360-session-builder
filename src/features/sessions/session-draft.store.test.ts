import { describe, expect, it } from 'vitest';

import type { Video } from '@lib/api/schemas';
import {
  EMPTY_SESSION_DRAFT,
  SESSION_DRAFT_STORAGE_KEY,
  createSessionDraftStore,
} from '@features/sessions/session-draft.store';

function createMemoryStorage(initialValue?: string) {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(SESSION_DRAFT_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

const videos: Video[] = [
  {
    id: 'vid_001',
    title: 'Jardinier municipal',
    description: 'Une immersion.',
    duration_seconds: 455,
    jobs: ['A1203'],
    audiences: ['adultes-reconversion'],
    compatible_headsets: ['pico-4', 'quest-3'],
    thumbnail_url: 'https://example.test/vid_001.svg',
    published_at: '2024-04-11',
  },
  {
    id: 'vid_002',
    title: 'Aide-soignante',
    description: 'Une autre immersion.',
    duration_seconds: 305,
    jobs: ['J1501'],
    audiences: ['lyceens'],
    compatible_headsets: ['quest-3'],
    thumbnail_url: null,
    published_at: '2024-05-03',
  },
];

describe('session draft store', () => {
  it('restores a valid persisted draft only after explicit hydration', () => {
    const storage = createMemoryStorage(
      JSON.stringify({
        version: 1,
        name: 'Découverte des métiers verts',
        video_ids: ['vid_002', 'vid_001'],
        headset_id: 'quest-3',
      }),
    );
    const store = createSessionDraftStore();

    expect(store.$isHydrated.get()).toBe(false);
    expect(store.$draft.get()).toEqual(EMPTY_SESSION_DRAFT);

    store.hydrate(storage);

    expect(store.$isHydrated.get()).toBe(true);
    expect(store.$draft.get()).toEqual({
      version: 1,
      name: 'Découverte des métiers verts',
      video_ids: ['vid_002', 'vid_001'],
      headset_id: 'quest-3',
    });
    expect(store.$count.get()).toBe(2);
  });

  it('falls back to an in-memory draft when browser storage is unavailable', () => {
    const blockedStorage = {
      getItem() {
        throw new Error('Storage is blocked');
      },
      setItem() {
        throw new Error('Storage is blocked');
      },
      removeItem() {
        throw new Error('Storage is blocked');
      },
    };
    const store = createSessionDraftStore();

    expect(() => store.hydrate(blockedStorage)).not.toThrow();
    expect(store.$isHydrated.get()).toBe(true);
    expect(() => store.addVideo(videos[0])).not.toThrow();
    expect(store.$draft.get().video_ids).toEqual(['vid_001']);
  });

  it.each([
    ['invalid JSON', '{not-json'],
    [
      'invalid data',
      JSON.stringify({
        version: 1,
        name: '',
        video_ids: Array.from({ length: 31 }, (_, index) => `vid_${index}`),
        headset_id: null,
      }),
    ],
    [
      'duplicate video IDs',
      JSON.stringify({
        version: 1,
        name: '',
        video_ids: ['vid_001', 'vid_001'],
        headset_id: null,
      }),
    ],
  ])('discards %s instead of restoring it', (_label, persistedValue) => {
    const storage = createMemoryStorage(persistedValue);
    const store = createSessionDraftStore();

    store.hydrate(storage);

    expect(store.$draft.get()).toEqual(EMPTY_SESSION_DRAFT);
    expect(storage.getItem(SESSION_DRAFT_STORAGE_KEY)).toBeNull();
    expect(store.$isHydrated.get()).toBe(true);
  });

  it('adds each video once, removes it and persists the canonical draft', () => {
    const storage = createMemoryStorage();
    const store = createSessionDraftStore();
    store.hydrate(storage);

    store.addVideo(videos[0]);
    store.addVideo(videos[0]);
    store.addVideo(videos[1]);

    expect(store.$draft.get().video_ids).toEqual(['vid_001', 'vid_002']);
    expect(store.$count.get()).toBe(2);
    expect(
      JSON.parse(storage.getItem(SESSION_DRAFT_STORAGE_KEY) ?? ''),
    ).toEqual({
      version: 1,
      name: '',
      video_ids: ['vid_001', 'vid_002'],
      headset_id: null,
    });

    store.removeVideo('vid_001');

    expect(store.$draft.get().video_ids).toEqual(['vid_002']);
    expect(store.$count.get()).toBe(1);
  });

  it('moves videos within bounds while preserving their explicit order', () => {
    const store = createSessionDraftStore();
    store.hydrate(createMemoryStorage());
    store.addVideo(videos[0]);
    store.addVideo(videos[1]);

    store.moveVideoUp('vid_002');
    expect(store.$draft.get().video_ids).toEqual(['vid_002', 'vid_001']);

    store.moveVideoUp('vid_002');
    store.moveVideoDown('vid_001');
    expect(store.$draft.get().video_ids).toEqual(['vid_002', 'vid_001']);

    store.moveVideoDown('vid_002');
    expect(store.$draft.get().video_ids).toEqual(['vid_001', 'vid_002']);
  });

  it('owns the draft name and optional headset without accepting invalid values', () => {
    const store = createSessionDraftStore();
    store.hydrate(createMemoryStorage());

    expect(store.setName('Atelier orientation')).toBe(true);
    expect(store.setHeadset('quest-3')).toBe(true);
    expect(store.$draft.get()).toMatchObject({
      name: 'Atelier orientation',
      headset_id: 'quest-3',
    });

    expect(store.setName('x'.repeat(121))).toBe(false);
    expect(store.setHeadset('')).toBe(false);
    expect(store.$draft.get()).toMatchObject({
      name: 'Atelier orientation',
      headset_id: 'quest-3',
    });
  });

  it('derives duration and headset compatibility from registered video data', () => {
    const store = createSessionDraftStore();
    store.hydrate(createMemoryStorage());
    store.addVideo(videos[0]);
    store.addVideo(videos[1]);

    expect(store.$totalDurationSeconds.get()).toBe(760);
    expect(store.$compatibility.get()).toEqual({
      status: 'not-selected',
      incompatibleVideoIds: [],
      unresolvedVideoIds: [],
    });

    store.setHeadset('pico-4');

    expect(store.$compatibility.get()).toEqual({
      status: 'incompatible',
      incompatibleVideoIds: ['vid_002'],
      unresolvedVideoIds: [],
    });
  });

  it('reports unresolved derived data after restoring IDs without snapshots', () => {
    const store = createSessionDraftStore();
    store.hydrate(
      createMemoryStorage(
        JSON.stringify({
          version: 1,
          name: '',
          video_ids: ['vid_001'],
          headset_id: 'pico-4',
        }),
      ),
    );

    expect(store.$totalDurationSeconds.get()).toBe(0);
    expect(store.$unresolvedVideoIds.get()).toEqual(['vid_001']);
    expect(store.$compatibility.get()).toEqual({
      status: 'unknown',
      incompatibleVideoIds: [],
      unresolvedVideoIds: ['vid_001'],
    });

    store.registerVideos([videos[0]]);

    expect(store.$totalDurationSeconds.get()).toBe(455);
    expect(store.$unresolvedVideoIds.get()).toEqual([]);
    expect(store.$compatibility.get()).toEqual({
      status: 'compatible',
      incompatibleVideoIds: [],
      unresolvedVideoIds: [],
    });
  });

  it('clears the draft after a successful save', () => {
    const storage = createMemoryStorage();
    const store = createSessionDraftStore();
    store.hydrate(storage);
    store.setName('Ma séance');
    store.setHeadset('quest-3');
    store.addVideo(videos[0]);

    store.clearAfterSave();

    expect(store.$draft.get()).toEqual(EMPTY_SESSION_DRAFT);
    expect(store.$count.get()).toBe(0);
    expect(
      JSON.parse(storage.getItem(SESSION_DRAFT_STORAGE_KEY) ?? ''),
    ).toEqual(EMPTY_SESSION_DRAFT);
  });
});
