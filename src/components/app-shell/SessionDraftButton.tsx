import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  $sessionDraftCount,
  $sessionDraftHydrated,
  hydrateSessionDraft,
} from '../../features/sessions/session-draft.store';
import { requestSessionDraftOpen } from '../../features/sessions/session-draft.events';

function countLabel(count: number) {
  if (count === 0) return 'aucune vidéo dans ma séance';
  if (count === 1) return '1 vidéo dans ma séance';
  return `${count} vidéos dans ma séance`;
}

export function SessionDraftButton({
  currentPath = '/',
}: {
  currentPath?: string;
}) {
  const isHydrated = useStore($sessionDraftHydrated);
  const count = useStore($sessionDraftCount);

  useEffect(() => {
    hydrateSessionDraft();
  }, []);

  const label = isHydrated ? countLabel(count) : 'Chargement de ma séance';
  const content = (
    <>
      Ma séance
      {isHydrated ? (
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold"
        >
          {count}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="bg-muted inline-flex size-6 animate-pulse rounded-full"
        />
      )}
    </>
  );

  return (
    <>
      {currentPath === '/' ? (
        <Button
          type="button"
          variant="outline"
          data-session-draft-trigger
          aria-label={label}
          onClick={(event) => requestSessionDraftOpen(event.currentTarget)}
          className="text-muted-foreground order-2 ml-auto px-3 font-medium sm:order-3"
        >
          {content}
        </Button>
      ) : (
        <a
          href="/#ma-seance"
          aria-label={`${label}, ouvrir dans le catalogue`}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'text-muted-foreground order-2 ml-auto px-3 font-medium sm:order-3',
          )}
        >
          {content}
        </a>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {label}
      </span>
    </>
  );
}
