import { useStore } from '@nanostores/react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';

import {
  fetchSessionsOverview,
  type SessionsOverview,
} from '../../features/sessions/api';
import {
  $sessionDraft,
  $sessionDraftHydrated,
  $sessionDraftTotalDurationSeconds,
  hydrateSessionDraft,
} from '../../features/sessions/session-draft.store';
import { cn } from '../../lib/utils';
import { CurrentDraftSection } from './CurrentDraftSection';
import { SavedSessionsSection } from './SavedSessionsSection';

interface SessionsAppProps {
  initialOverview?: SessionsOverview;
  createdSessionId?: string;
}

function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function SessionsApp(props: SessionsAppProps) {
  return (
    <QueryProvider>
      <SessionsContent {...props} />
    </QueryProvider>
  );
}

function SessionsContent({
  initialOverview,
  createdSessionId,
}: SessionsAppProps) {
  const [canObserveDraft, setCanObserveDraft] = useState(false);
  const draft = useStore($sessionDraft);
  const isDraftHydrated = useStore($sessionDraftHydrated);
  const draftDuration = useStore($sessionDraftTotalDurationSeconds);
  const overviewQuery = useQuery({
    queryKey: ['sessions-overview'],
    queryFn: ({ signal }) => fetchSessionsOverview(signal),
    initialData: initialOverview,
  });

  useEffect(() => {
    hydrateSessionDraft();
    setCanObserveDraft(true);
  }, []);

  return (
    <div className="space-y-8">
      {createdSessionId && (
        <div
          role="status"
          className="border-success bg-card rounded-lg border p-5"
        >
          <h2 className="text-lg font-semibold">Séance enregistrée</h2>
          <p className="text-muted-foreground mt-1 leading-6">
            Votre séance a bien été enregistrée.
          </p>
          <a
            href={`/sessions/${encodeURIComponent(createdSessionId)}`}
            className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
          >
            Consulter la séance
            <ArrowRightIcon aria-hidden="true" className="size-5" />
          </a>
        </div>
      )}

      <CurrentDraftSection
        canObserveDraft={canObserveDraft}
        isHydrated={isDraftHydrated}
        draft={draft}
        durationSeconds={draftDuration}
      />
      {overviewQuery.isPending ? (
        <section aria-labelledby="saved-sessions-loading-title">
          <h2
            id="saved-sessions-loading-title"
            className="text-xl font-semibold"
          >
            Séances enregistrées
          </h2>
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="border-border bg-card mt-4 rounded-lg border p-6"
          >
            <p className="font-semibold">
              Chargement des séances enregistrées…
            </p>
            <div className="bg-muted mt-4 h-24 animate-pulse rounded-md" />
          </div>
        </section>
      ) : overviewQuery.isError ? (
        <section aria-labelledby="saved-sessions-error-title">
          <h2 id="saved-sessions-error-title" className="text-xl font-semibold">
            Séances enregistrées
          </h2>
          <div
            role="alert"
            className="border-border bg-card mt-4 rounded-lg border p-6"
          >
            <p className="font-semibold">
              Les séances enregistrées ne peuvent pas être chargées.
            </p>
            <p className="text-muted-foreground mt-2 leading-6">
              Réessayez dans quelques instants. Votre séance en cours est
              conservée.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void overviewQuery.refetch()}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        </section>
      ) : (
        <SavedSessionsSection overview={overviewQuery.data} />
      )}
    </div>
  );
}
