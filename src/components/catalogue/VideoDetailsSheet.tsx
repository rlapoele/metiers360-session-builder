import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';

import {
  fetchVideo,
  type CatalogueReferences,
} from '../../features/catalogue/api';
import { VideoDetailsContent } from './VideoDetailsContent';

interface VideoDetailsSheetProps {
  videoId?: string;
  references?: CatalogueReferences;
  isSelected: boolean;
  onClose: () => void;
  onToggle: (videoId: string) => void;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function VideoDetailsSheet({
  videoId,
  references,
  isSelected,
  onClose,
  onToggle,
}: VideoDetailsSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoQuery = useQuery({
    queryKey: ['video-details', videoId],
    queryFn: ({ signal }) => {
      if (!videoId) throw new Error('Identifiant vidéo manquant.');
      return fetchVideo(videoId, signal);
    },
    enabled: Boolean(videoId),
  });

  useEffect(() => {
    if (!videoId || !dialogRef.current) return;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current.showModal();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [videoId]);

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    );
    const firstElement = focusableElements.at(0);
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) return;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="video-details-dialog-title"
      onClose={onClose}
      onKeyDown={keepFocusInside}
      className="bg-card text-foreground fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden shadow-xl backdrop:bg-foreground/40 sm:inset-y-0 sm:right-0 sm:left-auto sm:max-w-lg sm:border-l"
    >
      <div className="flex h-full flex-col">
        <header className="border-border bg-card flex min-h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6">
          <h2 id="video-details-dialog-title" className="text-xl font-semibold">
            Détails de la vidéo
          </h2>
          <Button
            type="button"
            variant="ghost"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="px-2"
          >
            <XMarkIcon aria-hidden="true" className="size-5" />
            Fermer
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
          {videoQuery.isPending && videoId && (
            <div
              role="status"
              aria-live="polite"
              className="space-y-5"
              aria-label="Chargement des détails de la vidéo"
            >
              <p className="text-muted-foreground text-sm">
                Chargement des détails…
              </p>
              <div className="bg-muted aspect-video animate-pulse rounded-md motion-reduce:animate-none" />
              <div className="space-y-3" aria-hidden="true">
                <div className="bg-muted h-6 w-3/4 animate-pulse rounded-sm motion-reduce:animate-none" />
                <div className="bg-muted h-4 w-1/3 animate-pulse rounded-sm motion-reduce:animate-none" />
                <div className="bg-muted h-20 animate-pulse rounded-sm motion-reduce:animate-none" />
              </div>
            </div>
          )}

          {videoQuery.isError && (
            <div role="alert" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Impossible de charger les détails
                </h3>
                <p className="text-muted-foreground text-sm leading-6">
                  Les détails de cette vidéo n’ont pas pu être chargés.
                  Réessayez.
                </p>
              </div>
              <Button type="button" onClick={() => void videoQuery.refetch()}>
                Réessayer
              </Button>
            </div>
          )}

          {videoQuery.data && (
            <VideoDetailsContent
              video={videoQuery.data}
              references={references}
            />
          )}
        </div>

        {videoQuery.data && videoId && (
          <footer className="border-border bg-card shrink-0 border-t p-4 sm:p-6">
            <Button
              type="button"
              variant={isSelected ? 'outline' : 'default'}
              aria-pressed={isSelected}
              onClick={() => onToggle(videoId)}
              className={
                isSelected
                  ? 'border-primary bg-accent text-accent-foreground min-h-12 w-full'
                  : 'min-h-12 w-full'
              }
            >
              {isSelected ? (
                <XMarkIcon aria-hidden="true" className="size-5" />
              ) : (
                <PlusIcon aria-hidden="true" className="size-5" />
              )}
              {isSelected ? 'Retirer de ma séance' : 'Ajouter à ma séance'}
            </Button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
