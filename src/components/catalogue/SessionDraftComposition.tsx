import { useStore } from '@nanostores/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@components/ui/button';

import { fetchVideo, type CatalogueReferences } from '@features/catalogue/api';
import { formatDuration } from '@features/catalogue/format';
import {
  OPEN_SESSION_DRAFT_EVENT,
  type OpenSessionDraftDetail,
} from '@features/sessions/session-draft.events';
import {
  $sessionDraft,
  $sessionDraftHydrated,
  $sessionDraftTotalDurationSeconds,
  clearDraftAfterSave,
  moveDraftVideoDown,
  moveDraftVideoUp,
  registerDraftVideos,
  removeVideoFromDraft,
  setDraftHeadset,
  setDraftName,
} from '@features/sessions/session-draft.store';
import type { Session, Video } from '@lib/api/schemas';
import {
  SessionDraftContent,
  type DraftVideoItem,
} from '@components/catalogue/SessionDraftContent';
import { SessionFinalisationDialog } from '@components/catalogue/SessionFinalisationDialog';

interface SessionDraftCompositionProps {
  canObserveDraft: boolean;
  references?: CatalogueReferences;
  initialVideos: Video[];
}

const focusableSelector =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function countLabel(count: number) {
  if (count === 0) return 'Aucune vidéo';
  return `${count} ${count === 1 ? 'vidéo' : 'vidéos'}`;
}

export function SessionDraftComposition({
  canObserveDraft,
  references,
  initialVideos,
}: SessionDraftCompositionProps) {
  const storedDraft = useStore($sessionDraft);
  const isHydrated = useStore($sessionDraftHydrated);
  const storedTotalDuration = useStore($sessionDraftTotalDurationSeconds);
  const draft = canObserveDraft
    ? storedDraft
    : { version: 1 as const, name: '', video_ids: [], headset_id: null };
  const totalDuration = canObserveDraft ? storedTotalDuration : 0;
  const [isOpen, setIsOpen] = useState(false);
  const [isFinalising, setIsFinalising] = useState(false);
  const [returnToDraftSheet, setReturnToDraftSheet] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const finalisationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const initialVideosById = new Map(
    initialVideos.map((video) => [video.id, video]),
  );
  const videoQueries = useQueries({
    queries: draft.video_ids.map((videoId) => ({
      queryKey: ['video-details', videoId],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const video = await fetchVideo(videoId, signal);
        registerDraftVideos([video]);
        return video;
      },
      initialData: initialVideosById.get(videoId),
    })),
  });
  const items: DraftVideoItem[] = draft.video_ids.map((id, index) => ({
    id,
    video: videoQueries[index]?.data,
    isPending: videoQueries[index]?.isPending ?? true,
    isError: videoQueries[index]?.isError ?? false,
    retry: () => void videoQueries[index]?.refetch(),
  }));
  const headsetName = references?.headsets.data.find(
    (headset) => headset.id === draft.headset_id,
  )?.name;
  const durationLabel =
    items.some((item) => !item.video && !item.isError) && items.length > 0
      ? 'durée en cours de calcul'
      : items.some((item) => !item.video)
        ? 'durée à confirmer'
        : formatDuration(totalDuration);
  const summary = `${countLabel(draft.video_ids.length)} · ${durationLabel}`;

  useEffect(() => {
    function revealDraft(trigger: HTMLElement | null) {
      triggerRef.current = trigger;
      if (window.matchMedia?.('(min-width: 80rem)').matches) {
        panelHeadingRef.current?.focus();
      } else {
        setIsOpen(true);
      }
    }

    function openFromHeader(event: Event) {
      const { trigger } = (event as CustomEvent<OpenSessionDraftDetail>).detail;
      revealDraft(trigger);
    }

    document.addEventListener(OPEN_SESSION_DRAFT_EVENT, openFromHeader);
    if (window.location.hash === '#ma-seance') {
      revealDraft(
        document.querySelector<HTMLElement>('[data-session-draft-trigger]'),
      );
    }
    return () =>
      document.removeEventListener(OPEN_SESSION_DRAFT_EVENT, openFromHeader);
  }, []);

  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current.showModal();
    closeButtonRef.current?.focus();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function openSheet(trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setIsOpen(true);
  }

  function closeSheet() {
    setIsOpen(false);
    if (window.location.hash === '#ma-seance') {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    }
    const trigger =
      triggerRef.current ??
      document.querySelector<HTMLElement>('[data-session-draft-trigger]');
    trigger?.focus();
  }

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    );
    const first = elements.at(0);
    const last = elements.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openFinalisation(
    trigger: HTMLButtonElement,
    fromDraftSheet: boolean,
  ) {
    finalisationTriggerRef.current = trigger;
    setReturnToDraftSheet(fromDraftSheet);
    if (fromDraftSheet) setIsOpen(false);
    setIsFinalising(true);
  }

  function closeFinalisation() {
    setIsFinalising(false);
    if (returnToDraftSheet) {
      setIsOpen(true);
    } else {
      requestAnimationFrame(() => finalisationTriggerRef.current?.focus());
    }
  }

  function completeSave(session: Session) {
    clearDraftAfterSave();
    window.location.assign(
      `/sessions?created=${encodeURIComponent(session.id)}`,
    );
  }

  const canFinalise =
    canObserveDraft &&
    isHydrated &&
    draft.video_ids.length >= 1 &&
    draft.video_ids.length <= 30;

  const contentProps = {
    items,
    headsetId: draft.headset_id,
    headsetName,
    onMoveUp: moveDraftVideoUp,
    onMoveDown: moveDraftVideoDown,
    onRemove: removeVideoFromDraft,
  };

  return (
    <>
      <aside
        id="ma-seance"
        aria-labelledby="session-draft-panel-title"
        className="border-border bg-card sticky top-6 hidden max-h-draft-panel flex-col overflow-hidden rounded-lg border shadow-sm xl:flex"
      >
        <header
          data-slot="session-draft-summary"
          className="border-border shrink-0 border-b p-5"
        >
          <h2
            ref={panelHeadingRef}
            id="session-draft-panel-title"
            tabIndex={-1}
            className="text-xl font-semibold"
          >
            Ma séance
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="text-muted-foreground mt-1 text-sm"
          >
            {canObserveDraft && isHydrated
              ? summary
              : 'Chargement de la séance…'}
          </p>
        </header>
        <div
          data-slot="session-draft-scroll-region"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"
        >
          <SessionDraftContent idPrefix="panel-draft" {...contentProps} />
        </div>
        <footer className="border-border bg-card shrink-0 border-t p-5">
          <Button
            type="button"
            disabled={!canFinalise}
            onClick={(event) => openFinalisation(event.currentTarget, false)}
            className="w-full"
          >
            Finaliser ma séance
          </Button>
          {draft.video_ids.length === 0 && (
            <p className="text-muted-foreground mt-2 text-center text-sm">
              Ajoutez une vidéo pour continuer.
            </p>
          )}
        </footer>
      </aside>

      <div className="border-border bg-card fixed inset-x-0 bottom-0 z-20 border-t p-3 shadow-lg xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold">Ma séance</p>
            <p className="text-muted-foreground truncate text-sm">
              {canObserveDraft && isHydrated ? summary : 'Chargement…'}
            </p>
          </div>
          <Button
            type="button"
            aria-label={`Consulter ma séance, ${countLabel(draft.video_ids.length).toLowerCase()}, ${durationLabel}`}
            onClick={(event) => openSheet(event.currentTarget)}
          >
            Consulter
          </Button>
        </div>
      </div>

      {isOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="session-draft-dialog-title"
          onClose={closeSheet}
          onKeyDown={keepFocusInside}
          className="bg-card text-foreground fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden shadow-xl backdrop:bg-foreground/40 xl:hidden"
        >
          <div className="flex h-full flex-col">
            <header className="border-border bg-card shrink-0 border-b px-4 py-3 sm:px-6">
              <div className="flex min-h-11 items-center justify-between gap-4">
                <h2
                  id="session-draft-dialog-title"
                  className="text-xl font-semibold"
                >
                  Ma séance
                </h2>
                <Button
                  ref={closeButtonRef}
                  type="button"
                  variant="ghost"
                  onClick={() => dialogRef.current?.close()}
                  className="px-2"
                >
                  <XMarkIcon aria-hidden="true" className="size-5" />
                  Fermer
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">{summary}</p>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <SessionDraftContent idPrefix="dialog-draft" {...contentProps} />
            </div>
            <footer className="border-border bg-card shrink-0 border-t p-4 sm:px-6">
              <Button
                type="button"
                disabled={!canFinalise}
                onClick={(event) => openFinalisation(event.currentTarget, true)}
                className="w-full"
              >
                Finaliser ma séance
              </Button>
              {draft.video_ids.length === 0 && (
                <p className="text-muted-foreground mt-2 text-center text-sm">
                  Ajoutez une vidéo pour continuer.
                </p>
              )}
            </footer>
          </div>
        </dialog>
      )}

      {isFinalising && (
        <SessionFinalisationDialog
          draft={draft}
          items={items}
          headsets={references?.headsets.data ?? []}
          onNameChange={setDraftName}
          onHeadsetChange={setDraftHeadset}
          onClose={closeFinalisation}
          onSaved={completeSave}
        />
      )}
    </>
  );
}
