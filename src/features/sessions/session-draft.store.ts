import type { SaveOperation } from '@features/sessions/save-operation-contracts';
import { atom, computed } from 'nanostores';

import {
  CreateSessionSchema,
  type CreateSession,
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
  isDraftSaveLocked,
  type DraftSave,
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
  const $saveState = atom<DraftSave | undefined>();
  const $isReadOnly = computed($saveState, isDraftSaveLocked);
  const $canSave = atom(false);
  const $saveIssue = atom<string | undefined>();
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
    if (JSON.stringify($saveState.get()) !== JSON.stringify(record.save))
      $saveState.set(record.save);
    let draft = record.draft;
    // Preserve fast local typing while earlier writes wait for the Web Lock.
    for (const action of isDraftSaveLocked(record.save) ? [] : pending) {
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
      if (raw === null && !initial) {
        if (isDraftSaveLocked(record.save))
          $saveIssue.set(
            'Le suivi local est indisponible. La séance reste protégée.',
          );
        else record = emptyDraftRecord();
      } else {
        const parsed = raw === null ? undefined : parsePersistedDraft(raw);
        if (parsed) record = parsed;
        else if (initial && raw !== null)
          storage.removeItem(SESSION_DRAFT_STORAGE_KEY);
      }
    } catch {
      storage = undefined;
      $canSave.set(false);
      if (isDraftSaveLocked(record.save))
        $saveIssue.set(
          'Le stockage partagé est inaccessible. Rechargez la page après avoir rétabli l’accès ; la séance reste protégée.',
        );
    }
  }

  function refresh() {
    readLatest();
    publish();
  }

  function mutate(change: Change, reset = false): Promise<boolean> {
    readLatest();
    if (isDraftSaveLocked(record.save)) {
      publish();
      return Promise.resolve(false);
    }
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
        isDraftSaveLocked(record.save) ||
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
          ...record,
          save: undefined,
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
          $canSave.set(false);
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
    $canSave.set(Boolean(storage && runExclusive));
    $isHydrated.set(true);
    return true;
  }

  function saveWrite(next: PersistedSessionDraft) {
    if (!storage || !runExclusive) return false;
    if (JSON.stringify(next) === JSON.stringify(record) && !$saveIssue.get())
      return true;
    try {
      storage.setItem(SESSION_DRAFT_STORAGE_KEY, JSON.stringify(next));
      record = next;
      $canSave.set(true);
      $saveIssue.set(undefined);
      publish();
      return true;
    } catch {
      $canSave.set(false);
      $saveIssue.set(
        'Le stockage du suivi est indisponible. La séance reste protégée.',
      );
      return false;
    }
  }

  async function beginSave(
    expected: CreateSession,
    runtimeId: string,
  ): Promise<DraftSave> {
    let captured: DraftSave | undefined;
    let message =
      'L’enregistrement n’est pas disponible dans ce navigateur. Autorisez le stockage local et utilisez un navigateur récent.';
    await runExclusive?.(() => {
      readLatest();
      if (isDraftSaveLocked(record.save)) {
        captured = record.save;
        publish();
        return true;
      }
      const current = CreateSessionSchema.safeParse({
        name: record.draft.name,
        video_ids: record.draft.video_ids,
        headset_id: record.draft.headset_id,
      });
      const canonical = (value: CreateSession) =>
        JSON.stringify([
          value.name.trim(),
          value.video_ids,
          value.headset_id ?? null,
        ]);
      if (!current.success || canonical(current.data) !== canonical(expected)) {
        message =
          'Le brouillon a été modifié. Vérifiez son contenu avant de l’enregistrer.';
        publish();
        return false;
      }
      const clientId = record.client_id ?? crypto.randomUUID();
      const save: DraftSave = {
        request: {
          operation_id: crypto.randomUUID(),
          client_id: clientId,
          draft_id: record.draft_id,
          revision: record.revision,
          expected_runtime_id: runtimeId,
          session: {
            ...current.data,
            headset_id: current.data.headset_id ?? null,
          },
        },
        started_at: Date.now(),
      };
      if (!saveWrite({ ...record, client_id: clientId, save })) return false;
      captured = save;
      return true;
    });
    if (!captured) throw new Error(message);
    return captured;
  }

  async function applySaveResult(result: SaveOperation) {
    return (
      (await runExclusive?.(() => {
        readLatest();
        const save = record.save;
        if (
          !save ||
          save.request.operation_id !== result.operation_id ||
          save.request.client_id !== result.client_id ||
          save.request.draft_id !== result.draft_id ||
          save.request.revision !== result.revision ||
          save.request.expected_runtime_id !== result.runtime_id
        )
          return false;
        if (save.result && save.result.status !== 'pending') return true;
        const next = {
          ...record,
          save: { ...save, result, uncertain: undefined },
        };
        if (result.status === 'succeeded') {
          if (record.draft_id !== save.request.draft_id) return false;
          next.draft = { ...EMPTY_SESSION_DRAFT };
          next.draft_id = crypto.randomUUID();
          next.revision = 0;
        }
        return saveWrite(next);
      })) ?? false
    );
  }

  async function markSaveUncertain(
    operationId: string,
    reason: NonNullable<DraftSave['uncertain']>,
  ) {
    return (
      (await runExclusive?.(() => {
        readLatest();
        const save = record.save;
        if (
          !save ||
          save.request.operation_id !== operationId ||
          !isDraftSaveLocked(save)
        )
          return false;
        return saveWrite({ ...record, save: { ...save, uncertain: reason } });
      })) ?? false
    );
  }

  async function releaseUncertainSave(operationId: string) {
    return (
      (await runExclusive?.(() => {
        readLatest();
        const save = record.save;
        if (
          !save ||
          save.request.operation_id !== operationId ||
          save.uncertain !== 'runtime' ||
          !isDraftSaveLocked(save)
        )
          return false;
        return saveWrite({
          ...record,
          draft_id: crypto.randomUUID(),
          revision: 0,
          save: undefined,
        });
      })) ?? false
    );
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
    $saveState,
    $isReadOnly,
    $canSave,
    $saveIssue,
    beginSave,
    applySaveResult,
    markSaveUncertain,
    releaseUncertainSave,
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
  $saveState: $draftSaveState,
  $isReadOnly: $draftReadOnly,
  $canSave: $draftCanSave,
  $saveIssue: $draftSaveIssue,
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
