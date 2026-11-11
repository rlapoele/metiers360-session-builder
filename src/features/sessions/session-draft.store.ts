import { atom, computed } from 'nanostores';

import {
  SessionDraftSchema,
  type SessionDraft,
  type Video,
} from '@lib/api/schemas';
import {
  EMPTY_SESSION_DRAFT,
  SESSION_DRAFT_STORAGE_KEY,
  SESSION_DRAFT_LOCK,
  emptyDraftRecord,
  parsePersistedDraft,
  type PersistedSessionDraft,
} from '@features/sessions/session-draft.persistence';

export {
  EMPTY_SESSION_DRAFT,
  SESSION_DRAFT_STORAGE_KEY,
} from '@features/sessions/session-draft.persistence';

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DraftCompatibility {
  status: 'not-selected' | 'compatible' | 'incompatible' | 'unknown';
  incompatibleVideoIds: string[];
  unresolvedVideoIds: string[];
}

function browserStorage(): DraftStorage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function swap(items: string[], firstIndex: number, secondIndex: number) {
  const nextItems = [...items];
  const firstItem = nextItems[firstIndex];
  const secondItem = nextItems[secondIndex];

  if (firstItem === undefined || secondItem === undefined) return items;

  nextItems[firstIndex] = secondItem;
  nextItems[secondIndex] = firstItem;
  return nextItems;
}

function unresolvedVideoIdsFor(
  draft: SessionDraft,
  videosById: Record<string, Video>,
) {
  return draft.video_ids.filter((videoId) => videosById[videoId] === undefined);
}

interface DraftStoreOptions {
  runExclusive?: (change: () => boolean) => Promise<boolean>;
}

export function createSessionDraftStore(options: DraftStoreOptions = {}) {
  const $draft = atom<SessionDraft>({ ...EMPTY_SESSION_DRAFT });
  const $isHydrated = atom(false);
  const $videosById = atom<Record<string, Video>>({});
  const $count = computed($draft, (draft) => draft.video_ids.length);
  const $unresolvedVideoIds = computed(
    [$draft, $videosById],
    unresolvedVideoIdsFor,
  );
  const $totalDurationSeconds = computed(
    [$draft, $videosById],
    (draft, videosById) =>
      draft.video_ids.reduce(
        (total, videoId) =>
          total + (videosById[videoId]?.duration_seconds ?? 0),
        0,
      ),
  );
  const $compatibility = computed(
    [$draft, $videosById],
    (draft, videosById): DraftCompatibility => {
      if (draft.headset_id === null) {
        return {
          status: 'not-selected',
          incompatibleVideoIds: [],
          unresolvedVideoIds: [],
        };
      }

      const headsetId = draft.headset_id;
      const unresolvedVideoIds = unresolvedVideoIdsFor(draft, videosById);
      const incompatibleVideoIds = draft.video_ids.filter((videoId) => {
        const video = videosById[videoId];
        return (
          video !== undefined && !video.compatible_headsets.includes(headsetId)
        );
      });

      return {
        status:
          incompatibleVideoIds.length > 0
            ? 'incompatible'
            : unresolvedVideoIds.length > 0
              ? 'unknown'
              : 'compatible',
        incompatibleVideoIds,
        unresolvedVideoIds,
      };
    },
  );

  let storage: DraftStorage | undefined;
  let record: PersistedSessionDraft = emptyDraftRecord();
  type Change = (draft: SessionDraft) => SessionDraft;
  const pending: { draftId: string; revision: number; change: Change }[] = [];
  let detach: (() => void) | undefined;
  let disposed = false;
  const runExclusive =
    options.runExclusive ??
    (typeof navigator !== 'undefined' && navigator.locks
      ? (change: () => boolean) =>
          navigator.locks.request(SESSION_DRAFT_LOCK, change)
      : undefined);

  function publish() {
    let draft = record.draft;
    // Preserve fast local typing while earlier writes wait for the Web Lock.
    for (const action of pending) {
      if (
        action.draftId !== record.draft_id ||
        action.revision > record.revision
      )
        continue;
      const parsed = SessionDraftSchema.safeParse(action.change(draft));
      if (parsed.success) draft = parsed.data;
    }
    if (JSON.stringify(draft) !== JSON.stringify($draft.get()))
      $draft.set(draft);
  }

  function readLatest(initial = false) {
    if (!storage) return;
    try {
      const raw = storage.getItem(SESSION_DRAFT_STORAGE_KEY);
      if (raw === null && !initial) record = emptyDraftRecord();
      else {
        const parsed = raw === null ? undefined : parsePersistedDraft(raw);
        if (parsed) record = parsed;
        else if (initial && raw !== null)
          storage.removeItem(SESSION_DRAFT_STORAGE_KEY);
      }
    } catch {
      storage = undefined;
    }
  }

  function refresh() {
    readLatest();
    publish();
  }

  function mutate(change: Change, reset = false): Promise<boolean> {
    readLatest();
    const action = {
      draftId: record.draft_id,
      revision: record.revision,
      change,
    };
    pending.push(action);
    publish();
    function finish() {
      const index = pending.indexOf(action);
      if (index !== -1) pending.splice(index, 1);
      publish();
    }
    function commit() {
      if (disposed) {
        finish();
        return false;
      }
      readLatest();
      if (
        action.draftId !== record.draft_id ||
        action.revision > record.revision
      ) {
        finish();
        return false;
      }
      const parsed = SessionDraftSchema.safeParse(change(record.draft));
      if (!parsed.success) {
        finish();
        return false;
      }
      if (
        reset ||
        JSON.stringify(parsed.data) !== JSON.stringify(record.draft)
      ) {
        record = {
          version: 2,
          draft_id: reset ? crypto.randomUUID() : record.draft_id,
          revision: reset ? 0 : record.revision + 1,
          draft: parsed.data,
        };
        try {
          storage?.setItem(SESSION_DRAFT_STORAGE_KEY, JSON.stringify(record));
        } catch {
          // Keep the latest edits in memory if persistence becomes unavailable.
          storage = undefined;
        }
      }
      finish();
      return true;
    }
    return runExclusive
      ? runExclusive(commit).catch(() => {
          finish();
          return false;
        })
      : Promise.resolve(commit());
  }

  function hydrate(nextStorage: DraftStorage | undefined = browserStorage()) {
    if ($isHydrated.get()) return true;
    disposed = false;
    storage = nextStorage;
    readLatest(true);
    publish();
    if (typeof window !== 'undefined') {
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea !== storage) return;
        if (event.key === null || event.key === SESSION_DRAFT_STORAGE_KEY)
          refresh();
      };
      const onVisible = () => {
        if (document.visibilityState === 'visible') refresh();
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener('focus', refresh);
      window.addEventListener('pageshow', refresh);
      document.addEventListener('visibilitychange', onVisible);
      detach = () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('focus', refresh);
        window.removeEventListener('pageshow', refresh);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }
    $isHydrated.set(true);
    return true;
  }

  function registerVideos(videos: Video[]) {
    if (videos.length === 0) return;

    const current = $videosById.get();
    if (videos.every((video) => current[video.id] === video)) return;
    const next = { ...current };
    for (const video of videos) next[video.id] = video;
    $videosById.set(next);
  }

  function addVideo(video: Video) {
    registerVideos([video]);
    return mutate((draft) =>
      draft.video_ids.includes(video.id)
        ? draft
        : {
            ...draft,
            video_ids: [...draft.video_ids, video.id],
          },
    );
  }

  function removeVideo(videoId: string) {
    return mutate((draft) => ({
      ...draft,
      video_ids: draft.video_ids.filter((id) => id !== videoId),
    }));
  }

  function moveVideo(videoId: string, offset: -1 | 1) {
    return mutate((draft) => {
      const currentIndex = draft.video_ids.indexOf(videoId);
      const nextIndex = currentIndex + offset;

      if (
        currentIndex === -1 ||
        nextIndex < 0 ||
        nextIndex >= draft.video_ids.length
      ) {
        return draft;
      }

      return {
        ...draft,
        video_ids: swap(draft.video_ids, currentIndex, nextIndex),
      };
    });
  }

  function setName(name: string) {
    return mutate((draft) => ({ ...draft, name }));
  }

  function setHeadset(headsetId: string | null) {
    return mutate((draft) => ({ ...draft, headset_id: headsetId }));
  }

  function clearAfterSave() {
    $videosById.set({});
    return mutate(() => ({ ...EMPTY_SESSION_DRAFT }), true);
  }

  return {
    $draft,
    $isHydrated,
    $count,
    $unresolvedVideoIds,
    $totalDurationSeconds,
    $compatibility,
    hydrate,
    registerVideos,
    addVideo,
    removeVideo,
    moveVideoUp: (videoId: string) => moveVideo(videoId, -1),
    moveVideoDown: (videoId: string) => moveVideo(videoId, 1),
    setName,
    setHeadset,
    clearAfterSave,
    dispose() {
      disposed = true;
      detach?.();
      detach = undefined;
    },
  };
}

export const sessionDraftStore = createSessionDraftStore();

export const {
  $draft: $sessionDraft,
  $isHydrated: $sessionDraftHydrated,
  $count: $sessionDraftCount,
  $unresolvedVideoIds: $sessionDraftUnresolvedVideoIds,
  $totalDurationSeconds: $sessionDraftTotalDurationSeconds,
  $compatibility: $sessionDraftCompatibility,
  hydrate: hydrateSessionDraft,
  registerVideos: registerDraftVideos,
  addVideo: addVideoToDraft,
  removeVideo: removeVideoFromDraft,
  moveVideoUp: moveDraftVideoUp,
  moveVideoDown: moveDraftVideoDown,
  setName: setDraftName,
  setHeadset: setDraftHeadset,
  clearAfterSave: clearDraftAfterSave,
} = sessionDraftStore;

if (import.meta.hot) import.meta.hot.dispose(() => sessionDraftStore.dispose());
