import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import {
  $sessionDraftCount,
  $sessionDraftHydrated,
  hydrateSessionDraft,
} from '../../features/sessions/session-draft.store';
import { requestSessionDraftOpen } from '../../features/sessions/session-draft.events';

function countLabel(count: number) {
  return `Ma séance, ${count} ${count > 1 ? 'vidéos' : 'vidéo'}`;
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

  const label = isHydrated ? countLabel(count) : 'Ma séance, chargement…';
  const content = (
    <>
      Ma séance{' '}
      {isHydrated ? (
        <Badge aria-hidden="true" className="size-6 p-0">
          {count}
        </Badge>
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
