import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

import type { CatalogueQuery } from '../../features/catalogue/query-params';
import type { Video, VideoList } from '../../lib/api/schemas';
import { VideoCard } from './VideoCard';

interface CatalogueResultsProps {
  data?: VideoList;
  errorMessage?: string;
  isPending: boolean;
  isPlaceholderData: boolean;
  isFetching: boolean;
  query: CatalogueQuery;
  hasCriteria: boolean;
  selectedIds: Set<string>;
  jobLabelFor: (video: Video) => string;
  compatibilityLabelFor: (video: Video) => string;
  onRetry: () => void;
  onClear: () => void;
  onPageChange: (page: number) => void;
  onToggle: (videoId: string) => void;
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-5"
      aria-label="Chargement du catalogue"
    >
      <p className="text-muted-foreground text-sm">Chargement des vidéos…</p>
      <div
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="border-border overflow-hidden rounded-lg border"
          >
            <div className="bg-muted aspect-video animate-pulse" />
            <div className="space-y-3 p-4">
              <div className="bg-muted h-5 w-3/4 animate-pulse rounded-sm" />
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded-sm" />
              <div className="bg-muted h-11 animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="border-border bg-muted rounded-lg border p-6">
      <h2 className="text-lg font-semibold">
        Le catalogue ne peut pas être chargé
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-primary text-primary-foreground hover:bg-action-hover focus-visible:outline-ring mt-5 min-h-11 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Réessayer
      </button>
    </div>
  );
}

export function CatalogueResults(props: CatalogueResultsProps) {
  const {
    data,
    errorMessage,
    isPending,
    isPlaceholderData,
    isFetching,
    query,
    hasCriteria,
    selectedIds,
    jobLabelFor,
    compatibilityLabelFor,
    onRetry,
    onClear,
    onPageChange,
    onToggle,
  } = props;

  if (isPending) return <LoadingState />;
  if (errorMessage)
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (!data) return null;

  if (data.data.length === 0) {
    return (
      <div className="border-border rounded-lg border px-6 py-12 text-center">
        <h2 className="text-xl font-semibold">Aucune vidéo trouvée</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
          Modifiez votre recherche ou retirez un filtre pour afficher d’autres
          vidéos.
        </p>
        {hasCriteria && (
          <button
            type="button"
            onClick={onClear}
            className="bg-primary text-primary-foreground hover:bg-action-hover focus-visible:outline-ring mt-5 min-h-11 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Effacer la recherche et les filtres
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <ul
        className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}
        aria-busy={isFetching}
      >
        {data.data.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            jobLabel={jobLabelFor(video)}
            compatibilityLabel={compatibilityLabelFor(video)}
            isSelected={selectedIds.has(video.id)}
            onToggle={onToggle}
          />
        ))}
      </ul>

      {data.meta.total_pages > 1 && (
        <nav
          aria-label="Pagination du catalogue"
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <button
            type="button"
            disabled={query.page <= 1 || isPlaceholderData}
            onClick={() => onPageChange(query.page - 1)}
            className="border-input focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Précédent
          </button>
          <p className="text-sm font-medium">
            Page {data.meta.page} sur {data.meta.total_pages}
          </p>
          <button
            type="button"
            disabled={query.page >= data.meta.total_pages || isPlaceholderData}
            onClick={() => onPageChange(query.page + 1)}
            className="border-input focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </button>
        </nav>
      )}
    </>
  );
}
