import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
      <div className="px-4 py-10 text-center">
        <h3 className="text-base font-semibold">Votre séance est vide</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Ajoutez une première vidéo depuis le catalogue. Vous pourrez ensuite
          modifier l’ordre de lecture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm leading-6">
        {headsetId
          ? `Compatibilité avec ${headsetName} : consultez le statut de chaque vidéo.`
          : 'Vous pourrez choisir un casque au moment d’enregistrer la séance.'}
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
            <li
              key={item.id}
              className="border-border bg-background @container rounded-md border p-4"
            >
              <article aria-labelledby={titleId} className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge
                    aria-hidden="true"
                    data-draft-position={index + 1}
                    className="size-8 p-0 text-sm"
                  >
                    {index + 1}
                  </Badge>
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
                    <Button
                      type="button"
                      variant="link"
                      aria-label={`Réessayer de charger les informations de ${title}`}
                      onClick={item.retry}
                      className="mt-1"
                    >
                      Réessayer
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 @sm:flex @sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="compact"
                    disabled={index === 0}
                    aria-label={`Monter ${title}`}
                    onClick={() => onMoveUp(item.id)}
                    className="px-3 disabled:opacity-40"
                  >
                    <ArrowUpIcon aria-hidden="true" className="size-4" />
                    Monter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="compact"
                    disabled={index === items.length - 1}
                    aria-label={`Descendre ${title}`}
                    onClick={() => onMoveDown(item.id)}
                    className="px-3 disabled:opacity-40"
                  >
                    <ArrowDownIcon aria-hidden="true" className="size-4" />
                    Descendre
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    aria-label={`Retirer ${title} de ma séance`}
                    onClick={() => onRemove(item.id)}
                    className="col-span-2 justify-self-end px-4 @sm:ml-auto"
                  >
                    <XMarkIcon
                      aria-hidden="true"
                      data-remove-from-draft-icon
                      className="size-4"
                    />
                    Retirer
                  </Button>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
