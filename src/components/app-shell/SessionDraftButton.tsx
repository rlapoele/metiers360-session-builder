import { useStore } from '@nanostores/react';
import { useEffect } from 'react';

import {
  $sessionDraftCount,
  $sessionDraftHydrated,
  hydrateSessionDraft,
} from '../../features/sessions/session-draft.store';

function countLabel(count: number) {
  if (count === 0) return 'aucune vidéo dans ma séance';
  if (count === 1) return '1 vidéo dans ma séance';
  return `${count} vidéos dans ma séance`;
}

export function SessionDraftButton() {
  const isHydrated = useStore($sessionDraftHydrated);
  const count = useStore($sessionDraftCount);

  useEffect(() => {
    hydrateSessionDraft();
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isHydrated ? countLabel(count) : 'Chargement de ma séance'}
      className="border-border text-muted-foreground order-2 ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium sm:order-3"
    >
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
    </div>
  );
}
