import {
  CheckIcon,
  EyeIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { formatDuration } from '../../features/catalogue/format';
import type { Video } from '../../lib/api/schemas';

interface VideoCardProps {
  video: Video;
  jobLabel: string;
  compatibleHeadsetLabels: string[];
  isSelected: boolean;
  onOpenDetails: (videoId: string, trigger: HTMLButtonElement) => void;
  onToggle: (videoId: string) => void;
}

export function VideoCard({
  video,
  jobLabel,
  compatibleHeadsetLabels,
  isSelected,
  onOpenDetails,
  onToggle,
}: VideoCardProps) {
  const titleId = `video-${video.id}-title`;

  return (
    <li
      className={`bg-card @container overflow-hidden rounded-lg border shadow-sm ${isSelected ? 'border-2 border-primary' : 'border-border'}`}
    >
      <article aria-labelledby={titleId} className="flex h-full flex-col">
        <div className="bg-muted relative aspect-video overflow-hidden">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center px-6 text-center text-sm">
              Aperçu indisponible
            </div>
          )}
          <span className="bg-foreground text-background absolute right-3 bottom-3 rounded-sm px-2 py-1 text-xs font-semibold">
            {formatDuration(video.duration_seconds)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 @sm:p-5">
          <div className="space-y-3">
            <h2 id={titleId} className="text-lg leading-6 font-semibold">
              {video.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-5">
              {jobLabel}
            </p>
            {compatibleHeadsetLabels.length > 0 ? (
              <ul
                aria-label="Casques compatibles"
                className="flex flex-wrap gap-1.5"
              >
                {compatibleHeadsetLabels.map((label) => (
                  <li key={label}>
                    <Badge variant="secondary">{label}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm leading-5">
                Aucun casque compatible renseigné
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2 pt-1">
            {isSelected && (
              <p className="text-success flex items-center gap-2 text-sm font-semibold">
                <CheckIcon aria-hidden="true" className="size-4" />
                Dans ma séance
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              aria-label={`Voir les détails de ${video.title}`}
              onClick={(event) => onOpenDetails(video.id, event.currentTarget)}
              className="w-full"
            >
              <EyeIcon aria-hidden="true" className="size-5" />
              Voir les détails
            </Button>
            <Button
              type="button"
              variant={isSelected ? 'secondary' : 'default'}
              aria-pressed={isSelected}
              onClick={() => onToggle(video.id)}
              className="w-full"
            >
              {isSelected ? (
                <XMarkIcon
                  aria-hidden="true"
                  data-remove-from-draft-icon
                  className="size-5"
                />
              ) : (
                <PlusIcon aria-hidden="true" className="size-5" />
              )}
              {isSelected ? 'Retirer de ma séance' : 'Ajouter à ma séance'}
            </Button>
          </div>
        </div>
      </article>
    </li>
  );
}
