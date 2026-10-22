import { atom, computed } from 'nanostores';

import {
  SessionDraftSchema,
  type SessionDraft,
  type Video,
} from '../../lib/api/schemas';

export const SESSION_DRAFT_STORAGE_KEY = 'metiers360.session-draft.v1';

export const EMPTY_SESSION_DRAFT: SessionDraft = {
  version: 1,
  name: '',
  video_ids: [],
  headset_id: null,
};

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

export function createSessionDraftStore() {
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

  function setDraft(candidate: SessionDraft) {
    const parsed = SessionDraftSchema.safeParse(candidate);
    if (!parsed.success) return false;

    $draft.set(parsed.data);
    return true;
  }

  function hydrate(nextStorage: DraftStorage | undefined = browserStorage()) {
    if ($isHydrated.get()) return true;
    if (!nextStorage) return false;

    storage = nextStorage;
    let persistedValue: string | null = null;

    try {
      persistedValue = storage.getItem(SESSION_DRAFT_STORAGE_KEY);
    } catch {
      // The draft remains usable in memory when browser storage is blocked.
    }

    if (persistedValue !== null) {
      try {
        const parsed = SessionDraftSchema.safeParse(
          JSON.parse(persistedValue) as unknown,
        );
        if (parsed.success) $draft.set(parsed.data);
        else {
          try {
            storage.removeItem(SESSION_DRAFT_STORAGE_KEY);
          } catch {
            // Ignore storage restrictions after rejecting the persisted value.
          }
        }
      } catch {
        try {
          storage.removeItem(SESSION_DRAFT_STORAGE_KEY);
        } catch {
          // Ignore storage restrictions after rejecting the persisted value.
        }
      }
    }

    $draft.listen((draft) => {
      try {
        storage?.setItem(SESSION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Keep the in-memory draft usable if persistence becomes unavailable.
      }
    });
    $isHydrated.set(true);
    return true;
  }

  function registerVideos(videos: Video[]) {
    if (videos.length === 0) return;

    const current = $videosById.get();
    const next = { ...current };
    for (const video of videos) next[video.id] = video;
    $videosById.set(next);
  }

  function addVideo(video: Video) {
    registerVideos([video]);
    const draft = $draft.get();
    if (draft.video_ids.includes(video.id)) return true;

    return setDraft({
      ...draft,
      video_ids: [...draft.video_ids, video.id],
    });
  }

  function removeVideo(videoId: string) {
    const draft = $draft.get();
    if (!draft.video_ids.includes(videoId)) return true;

    return setDraft({
      ...draft,
      video_ids: draft.video_ids.filter((id) => id !== videoId),
    });
  }

  function moveVideo(videoId: string, offset: -1 | 1) {
    const draft = $draft.get();
    const currentIndex = draft.video_ids.indexOf(videoId);
    const nextIndex = currentIndex + offset;

    if (
      currentIndex === -1 ||
      nextIndex < 0 ||
      nextIndex >= draft.video_ids.length
    ) {
      return true;
    }

    return setDraft({
      ...draft,
      video_ids: swap(draft.video_ids, currentIndex, nextIndex),
    });
  }

  function setName(name: string) {
    return setDraft({ ...$draft.get(), name });
  }

  function setHeadset(headsetId: string | null) {
    return setDraft({ ...$draft.get(), headset_id: headsetId });
  }

  function clearAfterSave() {
    $videosById.set({});
    return setDraft({ ...EMPTY_SESSION_DRAFT });
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
