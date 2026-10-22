import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import { formatDuration } from '../../features/catalogue/format';
import type { Video } from '../../lib/api/schemas';

export interface DraftVideoItem {
  id: string;
  video?: Video;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

interface SessionDraftContentProps {
  idPrefix: string;
  items: DraftVideoItem[];
  headsetId: string | null;
  headsetName?: string;
  onMoveUp: (videoId: string) => void;
  onMoveDown: (videoId: string) => void;
  onRemove: (videoId: string) => void;
}

function compatibilityText(
  video: Video,
  headsetId: string,
  headsetName: string,
) {
  const isCompatible = video.compatible_headsets.includes(headsetId);
  return {
    isCompatible,
    label: isCompatible
      ? `Compatible avec ${headsetName}`
      : `Non compatible avec ${headsetName}`,
  };
}

export function SessionDraftContent({
  idPrefix,
  items,
  headsetId,
  headsetName = headsetId ?? '',
  onMoveUp,
  onMoveDown,
  onRemove,
}: SessionDraftContentProps) {
  if (items.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <h3 className="text-base font-semibold">Votre séance est vide</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Ajoutez des vidéos depuis le catalogue pour préparer leur ordre de
          lecture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm leading-6">
        {headsetId
          ? `Compatibilité vérifiée pour ${headsetName}.`
          : 'Casque à choisir lors de la finalisation.'}
      </p>

      <ol className="space-y-3">
        {items.map((item, index) => {
          const title = item.video?.title ?? `Vidéo ${index + 1}`;
          const titleId = `${idPrefix}-${item.id}-title`;
          const compatibility =
            item.video && headsetId
              ? compatibilityText(item.video, headsetId, headsetName)
              : undefined;

          return (
            <li key={item.id} className="border-border rounded-md border p-4">
              <article aria-labelledby={titleId} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-muted inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      id={titleId}
                      className="text-sm leading-5 font-semibold"
                    >
                      {title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {item.video
                        ? formatDuration(item.video.duration_seconds)
                        : item.isError
                          ? 'Durée indisponible'
                          : 'Chargement de la durée…'}
                    </p>
                  </div>
                </div>

                {compatibility && (
                  <p
                    className={`flex items-start gap-2 text-sm leading-5 ${compatibility.isCompatible ? 'text-accent-foreground' : 'text-destructive'}`}
                  >
                    {compatibility.isCompatible ? (
                      <CheckCircleIcon
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0"
                      />
                    ) : (
                      <ExclamationTriangleIcon
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0"
                      />
                    )}
                    {compatibility.label}
                  </p>
                )}

                {item.isError && (
                  <div role="alert" className="text-sm leading-5">
                    <p>Les informations de cette vidéo sont indisponibles.</p>
                    <button
                      type="button"
                      onClick={item.retry}
                      className="text-navigation-current focus-visible:outline-ring mt-1 min-h-11 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Monter ${title}`}
                    onClick={() => onMoveUp(item.id)}
                    className="border-input focus-visible:outline-ring inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUpIcon aria-hidden="true" className="size-4" />
                    Monter
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    aria-label={`Descendre ${title}`}
                    onClick={() => onMoveDown(item.id)}
                    className="border-input focus-visible:outline-ring inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDownIcon aria-hidden="true" className="size-4" />
                    Descendre
                  </button>
                  <button
                    type="button"
                    aria-label={`Retirer ${title}`}
                    onClick={() => onRemove(item.id)}
                    className="text-destructive focus-visible:outline-ring ml-auto inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <TrashIcon aria-hidden="true" className="size-4" />
                    Retirer
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
