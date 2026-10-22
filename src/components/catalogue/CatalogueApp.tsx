import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  fetchCatalogueReferences,
  fetchVideos,
  type CatalogueReferences,
} from '../../features/catalogue/api';
import { formatResultCount } from '../../features/catalogue/format';
import {
  catalogueQueryFromSearchParams,
  catalogueQueryToSearchParams,
  updateCatalogueQuery,
  type CatalogueQuery,
} from '../../features/catalogue/query-params';
import type { Video, VideoList } from '../../lib/api/schemas';
import { AppliedFilters, type AppliedFilter } from './AppliedFilters';
import { CatalogueFilters } from './CatalogueFilters';
import { CatalogueResults } from './CatalogueResults';
import { CatalogueSearch } from './CatalogueSearch';

interface CatalogueAppProps {
  initialQuery: CatalogueQuery;
  initialVideos?: VideoList;
  initialReferences?: CatalogueReferences;
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

export function CatalogueApp(props: CatalogueAppProps) {
  return (
    <QueryProvider>
      <CatalogueContent {...props} />
    </QueryProvider>
  );
}

function CatalogueContent({
  initialQuery,
  initialVideos,
  initialReferences,
}: CatalogueAppProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchValue, setSearchValue] = useState(initialQuery.q);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const initialQueryKey = useMemo(
    () => catalogueQueryToSearchParams(initialQuery).toString(),
    [initialQuery],
  );
  const currentQueryKey = catalogueQueryToSearchParams(query).toString();
  const referencesQuery = useQuery({
    queryKey: ['catalogue-references'],
    queryFn: ({ signal }) => fetchCatalogueReferences(signal),
    initialData: initialReferences,
  });
  const videosQuery = useQuery({
    queryKey: ['videos', query],
    queryFn: ({ signal }) => fetchVideos(query, signal),
    initialData:
      currentQueryKey === initialQueryKey ? initialVideos : undefined,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    function readLocation() {
      const nextQuery = catalogueQueryFromSearchParams(
        new URLSearchParams(window.location.search),
      );
      setQuery(nextQuery);
      setSearchValue(nextQuery.q);
    }

    window.addEventListener('popstate', readLocation);
    return () => window.removeEventListener('popstate', readLocation);
  }, []);

  function navigate(update: Partial<CatalogueQuery>) {
    const nextQuery = updateCatalogueQuery(query, update);
    const searchParams = catalogueQueryToSearchParams(nextQuery);
    const nextUrl = `${window.location.pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`;
    window.history.pushState({}, '', nextUrl);
    setQuery(nextQuery);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: searchValue.trim() });
  }

  function clearCriteria() {
    setSearchValue('');
    navigate({ q: '', job: '', headset: '', audience: '' });
  }

  function toggleSelection(videoId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  const references = referencesQuery.data;
  const jobLabels = new Map(
    references?.jobs.data.map((job) => [job.code, job.label]),
  );
  const headsetLabels = new Map(
    references?.headsets.data.map((headset) => [headset.id, headset.name]),
  );
  const activeFilters: AppliedFilter[] = [
    query.job
      ? { key: 'job', label: jobLabels.get(query.job) ?? query.job }
      : undefined,
    query.headset
      ? {
          key: 'headset',
          label: headsetLabels.get(query.headset) ?? query.headset,
        }
      : undefined,
    query.audience
      ? {
          key: 'audience',
          label:
            references?.audiences.data.find(
              (audience) => audience.id === query.audience,
            )?.label ?? query.audience,
        }
      : undefined,
  ].filter((filter): filter is AppliedFilter => filter !== undefined);

  function compatibilityLabel(video: Video): string {
    if (query.headset) {
      return `Compatible avec ${headsetLabels.get(query.headset) ?? query.headset}`;
    }
    if (video.compatible_headsets.length === 0) {
      return 'Aucun casque compatible renseigné';
    }

    return video.compatible_headsets
      .slice(0, 2)
      .map((id) => headsetLabels.get(id) ?? id)
      .join(' · ');
  }

  const hasCriteria = Boolean(
    query.q || query.job || query.headset || query.audience,
  );

  return (
    <div className="space-y-8">
      <CatalogueSearch
        value={searchValue}
        onChange={setSearchValue}
        onSubmit={submitSearch}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CatalogueFilters
            query={query}
            references={references}
            disabled={referencesQuery.isPending}
            onChange={navigate}
          />
          {videosQuery.data && (
            <p role="status" aria-live="polite" className="text-sm font-medium">
              {formatResultCount(videosQuery.data.meta.total)}
            </p>
          )}
        </div>

        {referencesQuery.isError && (
          <div
            role="alert"
            className="border-border rounded-md border p-4 text-sm"
          >
            <p>Les filtres ne peuvent pas être chargés.</p>
            <button
              type="button"
              onClick={() => void referencesQuery.refetch()}
              className="text-navigation-current focus-visible:outline-ring mt-2 min-h-11 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Réessayer de charger les filtres
            </button>
          </div>
        )}

        <AppliedFilters
          filters={activeFilters}
          onRemove={(key) => navigate({ [key]: '' })}
          onClear={clearCriteria}
        />
      </div>

      <CatalogueResults
        data={videosQuery.data}
        errorMessage={
          videosQuery.isError ? videosQuery.error.message : undefined
        }
        isPending={videosQuery.isPending}
        isPlaceholderData={videosQuery.isPlaceholderData}
        isFetching={videosQuery.isFetching}
        query={query}
        hasCriteria={hasCriteria}
        selectedIds={selectedIds}
        jobLabelFor={(video) =>
          jobLabels.get(video.jobs[0] ?? '') ??
          video.jobs[0] ??
          'Métier non renseigné'
        }
        compatibilityLabelFor={compatibilityLabel}
        onRetry={() => void videosQuery.refetch()}
        onClear={clearCriteria}
        onPageChange={(page) => navigate({ page })}
        onToggle={toggleSelection}
      />
    </div>
  );
}
