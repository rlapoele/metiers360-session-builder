import { ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline';

import { buttonVariants } from '@components/ui/button';

import { formatDuration } from '@features/catalogue/format';
import { formatVideoCount } from '@features/sessions/format';
import type { SessionDraft } from '@lib/api/schemas';
import { cn } from '@lib/utils';

interface CurrentDraftSectionProps {
  canObserveDraft: boolean;
  isHydrated: boolean;
  draft: SessionDraft;
  durationSeconds: number;
}

export function CurrentDraftSection({
  canObserveDraft,
  isHydrated,
  draft,
  durationSeconds,
}: CurrentDraftSectionProps) {
  const hasDraft = canObserveDraft && isHydrated && draft.video_ids.length > 0;
  const durationLabel =
    durationSeconds > 0 ? formatDuration(durationSeconds) : 'durée à confirmer';

  return (
    <section aria-labelledby="current-session-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="current-session-title" className="text-xl font-semibold">
          Séance en cours
        </h2>
        <a
          href={hasDraft ? '/#ma-seance' : '/'}
          className={buttonVariants({ variant: 'outline' })}
        >
          <PlusIcon aria-hidden="true" className="size-5" />
          {hasDraft ? 'Continuer ma séance' : 'Créer une séance'}
        </a>
      </div>

      <div className="border-border bg-card mt-4 rounded-lg border p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
        {!canObserveDraft || !isHydrated ? (
          <p role="status" className="text-muted-foreground">
            Chargement de la séance en cours…
          </p>
        ) : hasDraft ? (
          <>
            <div>
              <p className="font-semibold">
                {draft.name.trim() || 'Séance non nommée'}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatVideoCount(draft.video_ids.length)} · {durationLabel} ·
                Non enregistrée
              </p>
            </div>
            <a
              href="/#ma-seance"
              className={cn(
                buttonVariants({ variant: 'link' }),
                'mt-3 sm:mt-0',
              )}
            >
              Continuer ma séance
              <ArrowRightIcon aria-hidden="true" className="size-5" />
            </a>
          </>
        ) : (
          <div>
            <p className="font-semibold">Aucune séance en cours</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Ajoutez des vidéos depuis le catalogue pour commencer.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
