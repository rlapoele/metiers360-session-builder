import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

import { Button } from '@components/ui/button';

import type { CatalogueQuery } from '@features/catalogue/query-params';
import type { Video, VideoList } from '@lib/api/schemas';
import { VideoCard } from '@components/catalogue/VideoCard';

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
  compatibleHeadsetLabelsFor: (video: Video) => string[];
  onRetry: () => void;
  onClear: () => void;
  onPageChange: (page: number) => void;
  onOpenDetails: (videoId: string, trigger: HTMLButtonElement) => void;
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
        className="grid gap-5 sm:grid-cols-2 @4xl:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="border-border bg-card overflow-hidden rounded-lg border shadow-sm"
          >
            <div className="bg-muted aspect-video animate-pulse motion-reduce:animate-none" />
            <div className="space-y-3 p-4">
              <div className="bg-muted h-5 w-3/4 animate-pulse rounded-sm motion-reduce:animate-none" />
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded-sm motion-reduce:animate-none" />
              <div className="bg-muted h-11 animate-pulse rounded-md motion-reduce:animate-none" />
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
    <div
      role="alert"
      className="border-border bg-card rounded-lg border p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">
        Le catalogue ne peut pas être chargé
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">{message}</p>
      <Button type="button" onClick={onRetry} className="mt-5">
        Réessayer
      </Button>
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
    compatibleHeadsetLabelsFor,
    onRetry,
    onClear,
    onPageChange,
    onOpenDetails,
    onToggle,
  } = props;

  if (isPending) return <LoadingState />;
  if (errorMessage)
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (!data) return null;

  if (data.data.length === 0) {
    return (
      <div className="border-border bg-card rounded-lg border px-6 py-12 text-center shadow-sm">
        <h2 className="text-xl font-semibold">Aucune vidéo trouvée</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
          Modifiez votre recherche ou retirez un filtre pour afficher d’autres
          vidéos.
        </p>
        {hasCriteria && (
          <Button
            type="button"
            onClick={onClear}
            className="mt-5 max-w-full whitespace-normal"
          >
            Effacer la recherche et les filtres
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <ul
        className={`grid gap-5 transition-opacity motion-reduce:transition-none sm:grid-cols-2 @4xl:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}
        aria-busy={isFetching}
      >
        {data.data.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            jobLabel={jobLabelFor(video)}
            compatibleHeadsetLabels={compatibleHeadsetLabelsFor(video)}
            isSelected={selectedIds.has(video.id)}
            onOpenDetails={onOpenDetails}
            onToggle={onToggle}
          />
        ))}
      </ul>

      {data.meta.total_pages > 1 && (
        <nav
          aria-label="Pagination du catalogue"
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <Button
            type="button"
            variant="outline"
            disabled={query.page <= 1 || isPlaceholderData}
            onClick={() => onPageChange(query.page - 1)}
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Précédent
          </Button>
          <p className="text-sm font-medium">
            Page {data.meta.page} sur {data.meta.total_pages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={query.page >= data.meta.total_pages || isPlaceholderData}
            onClick={() => onPageChange(query.page + 1)}
          >
            Suivant
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Button>
        </nav>
      )}
    </>
  );
}
