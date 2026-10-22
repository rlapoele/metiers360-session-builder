import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { formatDuration } from '../../features/catalogue/format';
import type { Video } from '../../lib/api/schemas';

interface VideoCardProps {
  video: Video;
  jobLabel: string;
  compatibilityLabel: string;
  isSelected: boolean;
  onToggle: (videoId: string) => void;
}

export function VideoCard({
  video,
  jobLabel,
  compatibilityLabel,
  isSelected,
  onToggle,
}: VideoCardProps) {
  const titleId = `video-${video.id}-title`;

  return (
    <li className="border-border bg-card @container overflow-hidden rounded-lg border">
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

        <div className="flex flex-1 flex-col gap-4 p-4 @sm:p-5">
          <div className="space-y-3">
            <h2 id={titleId} className="text-lg leading-6 font-semibold">
              {video.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-5">
              {jobLabel}
            </p>
            <p className="text-muted-foreground flex items-start gap-2 text-sm leading-5">
              <CheckIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{compatibilityLabel}</span>
            </p>
          </div>

          <div className="mt-auto space-y-2">
            {isSelected && (
              <p className="text-accent-foreground flex items-center gap-2 text-sm font-semibold">
                <CheckIcon aria-hidden="true" className="size-4" />
                Dans ma séance
              </p>
            )}
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(video.id)}
              className={
                isSelected
                  ? 'border-primary text-accent-foreground focus-visible:outline-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2'
                  : 'bg-primary text-primary-foreground hover:bg-action-hover active:bg-action-active focus-visible:outline-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2'
              }
            >
              {isSelected ? (
                <XMarkIcon aria-hidden="true" className="size-5" />
              ) : (
                <PlusIcon aria-hidden="true" className="size-5" />
              )}
              {isSelected ? 'Retirer de ma séance' : 'Ajouter à ma séance'}
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}
