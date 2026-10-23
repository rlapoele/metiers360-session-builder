import { ArrowRightIcon } from '@heroicons/react/24/outline';

import { buttonVariants } from '@/components/ui/button';

import { formatDuration } from '../../features/catalogue/format';
import type { SessionsOverview } from '../../features/sessions/api';
import {
  formatSessionDate,
  formatVideoCount,
} from '../../features/sessions/format';
import { cn } from '../../lib/utils';

export function SavedSessionsSection({
  overview,
}: {
  overview: SessionsOverview;
}) {
  const sessions = overview.sessions.data;
  const headsetNames = new Map(
    overview.headsets.data.map((headset) => [headset.id, headset.name]),
  );

  return (
    <section aria-labelledby="saved-sessions-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="saved-sessions-title" className="text-xl font-semibold">
          Séances enregistrées
        </h2>
        <p className="text-muted-foreground text-sm">
          {sessions.length} {sessions.length === 1 ? 'séance' : 'séances'}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="border-border bg-card mt-4 rounded-lg border p-6 text-center">
          <p className="font-semibold">Aucune séance enregistrée</p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Les séances finalisées apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="border-border bg-card rounded-lg border p-5 shadow-sm"
            >
              <article className="sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{session.name}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Créée le {formatSessionDate(session.created_at)}
                  </p>
                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div>
                      <dt className="sr-only">Nombre de vidéos</dt>
                      <dd>{formatVideoCount(session.video_ids.length)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Durée totale</dt>
                      <dd>{formatDuration(session.total_duration_seconds)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Casque sélectionné</dt>
                      <dd>
                        {session.headset_id
                          ? (headsetNames.get(session.headset_id) ??
                            'Casque inconnu')
                          : 'Casque non renseigné'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <a
                  href={`/sessions/${encodeURIComponent(session.id)}`}
                  aria-label={`Consulter ${session.name}`}
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'mt-4 w-full sm:mt-0 sm:w-auto',
                  )}
                >
                  Consulter
                  <ArrowRightIcon aria-hidden="true" className="size-5" />
                </a>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
