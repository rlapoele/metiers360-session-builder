import { saveCoordinator } from '@features/sessions/save-coordinator';
import { SaveStatusBanner } from '@components/sessions/SessionSaveStatus';
import { keepFocusInside } from '@lib/dialog-focus';
import { useStore } from '@nanostores/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@components/ui/button';

import type { CatalogueReferences } from '@features/catalogue/api';
import { useDraftVideos } from '@features/sessions/use-draft-videos';
import { formatDuration } from '@features/catalogue/format';
import {
  OPEN_SESSION_DRAFT_EVENT,
  type OpenSessionDraftDetail,
} from '@features/sessions/session-draft.events';
import {
  $sessionDraft,
  $sessionDraftHydrated,
  $sessionDraftTotalDurationSeconds,
  $draftReadOnly,
  $draftCanSave,
  moveDraftVideoDown,
  moveDraftVideoUp,
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

const PANEL_MEDIA_QUERY = '(min-width: 64rem)';

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
  const readOnly = useStore($draftReadOnly);
  const canSave = useStore($draftCanSave);
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
  const videoQueries = useDraftVideos(draft.video_ids, initialVideos);
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
      if (window.matchMedia?.(PANEL_MEDIA_QUERY).matches) {
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
    const media = window.matchMedia?.(PANEL_MEDIA_QUERY);
    const switchToPanel = () => {
      if (!media?.matches) return;
      setIsOpen(false);
      requestAnimationFrame(() => panelHeadingRef.current?.focus());
    };
    if (media?.matches) {
      switchToPanel();
      return;
    }
    media?.addEventListener('change', switchToPanel);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current.showModal();
    closeButtonRef.current?.focus();

    return () => {
      media?.removeEventListener('change', switchToPanel);
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
    if (!window.matchMedia?.(PANEL_MEDIA_QUERY).matches) {
      setIsOpen(true);
    } else {
      requestAnimationFrame(() => {
        const target = returnToDraftSheet
          ? panelHeadingRef.current
          : finalisationTriggerRef.current;
        target?.focus();
      });
    }
  }

  function completeSave(session: Session) {
    window.location.assign(
      `/sessions?created=${encodeURIComponent(session.id)}`,
    );
  }

  const canFinalise =
    !readOnly &&
    canObserveDraft &&
    isHydrated &&
    draft.video_ids.length >= 1 &&
    draft.video_ids.length <= 30;

  const contentProps = {
    readOnly,
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
        className="border-border bg-card sticky top-6 hidden max-h-draft-panel flex-col overflow-hidden rounded-lg border shadow-sm lg:flex"
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

      <div className="border-border bg-card fixed inset-x-0 bottom-0 z-20 border-t p-3 shadow-lg lg:hidden">
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
          className="bg-card text-foreground fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden shadow-xl backdrop:bg-foreground/40 lg:hidden"
        >
          <div className="flex h-full flex-col">
            <SaveStatusBanner onlyOperation />
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
          readOnly={readOnly}
          canSave={canSave}
          saveSession={saveCoordinator.save}
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
