import { useStore } from '@nanostores/react';
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import { Button } from '@components/ui/button';

import {
  fetchCatalogueReferences,
  fetchVideos,
  type CatalogueReferences,
} from '@features/catalogue/api';
import { formatResultCount } from '@features/catalogue/format';
import {
  catalogueQueryFromSearchParams,
  catalogueQueryToSearchParams,
  updateCatalogueQuery,
  type CatalogueQuery,
} from '@features/catalogue/query-params';
import {
  $sessionDraft,
  addVideoToDraft,
  hydrateSessionDraft,
  registerDraftVideos,
  removeVideoFromDraft,
} from '@features/sessions/session-draft.store';
import type { Video, VideoList } from '@lib/api/schemas';
import {
  AppliedFilters,
  type AppliedFilter,
} from '@components/catalogue/AppliedFilters';
import { CatalogueFilters } from '@components/catalogue/CatalogueFilters';
import { CatalogueResults } from '@components/catalogue/CatalogueResults';
import { CatalogueSearch } from '@components/catalogue/CatalogueSearch';
import { SessionDraftComposition } from '@components/catalogue/SessionDraftComposition';
import { VideoDetailsSheet } from '@components/catalogue/VideoDetailsSheet';

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
  const [canObserveDraft, setCanObserveDraft] = useState(false);
  const draft = useStore($sessionDraft);
  const [detailsVideoId, setDetailsVideoId] = useState<string>();
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
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
  const selectedIds = useMemo(
    () => new Set(canObserveDraft ? draft.video_ids : []),
    [canObserveDraft, draft.video_ids],
  );

  useEffect(() => {
    hydrateSessionDraft();
    setCanObserveDraft(true);
  }, []);

  useEffect(() => {
    if (videosQuery.data) registerDraftVideos(videosQuery.data.data);
  }, [videosQuery.data]);

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
    if (selectedIds.has(videoId)) {
      removeVideoFromDraft(videoId);
      return;
    }

    const video = videosQuery.data?.data.find((item) => item.id === videoId);
    if (video) addVideoToDraft(video);
  }

  function openDetails(videoId: string, trigger: HTMLButtonElement) {
    detailsTriggerRef.current = trigger;
    setDetailsVideoId(videoId);
  }

  function closeDetails() {
    setDetailsVideoId(undefined);
    detailsTriggerRef.current?.focus();
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

  function compatibleHeadsetLabels(video: Video): string[] {
    if (query.headset) {
      return [headsetLabels.get(query.headset) ?? query.headset];
    }

    return video.compatible_headsets.map((id) => headsetLabels.get(id) ?? id);
  }

  const hasCriteria = Boolean(
    query.q || query.job || query.headset || query.audience,
  );

  return (
    <div className="grid gap-6 xl:grid-cols-3 xl:items-start xl:gap-8">
      <div className="@container space-y-6 pb-24 xl:col-span-2 xl:pb-0">
        <div className="border-border bg-card space-y-5 rounded-lg border p-4 sm:p-5">
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
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm font-medium"
                >
                  {formatResultCount(videosQuery.data.meta.total)}
                </p>
              )}
            </div>

            {referencesQuery.isError && (
              <div
                role="alert"
                className="border-border bg-muted rounded-md border p-4 text-sm"
              >
                <p>Les filtres ne peuvent pas être chargés.</p>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => void referencesQuery.refetch()}
                  className="mt-2"
                >
                  Réessayer de charger les filtres
                </Button>
              </div>
            )}

            <AppliedFilters
              filters={activeFilters}
              onRemove={(key) => navigate({ [key]: '' })}
              onClear={clearCriteria}
            />
          </div>
        </div>

        <CatalogueResults
          data={videosQuery.data}
          errorMessage={
            videosQuery.isError
              ? 'Réessayez dans quelques instants. Votre séance en cours est conservée.'
              : undefined
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
          compatibleHeadsetLabelsFor={compatibleHeadsetLabels}
          onRetry={() => void videosQuery.refetch()}
          onClear={clearCriteria}
          onPageChange={(page) => navigate({ page })}
          onOpenDetails={openDetails}
          onToggle={toggleSelection}
        />
      </div>

      <SessionDraftComposition
        canObserveDraft={canObserveDraft}
        references={references}
        initialVideos={videosQuery.data?.data ?? []}
      />

      <VideoDetailsSheet
        videoId={detailsVideoId}
        references={references}
        isSelected={detailsVideoId ? selectedIds.has(detailsVideoId) : false}
        onClose={closeDetails}
        onToggle={toggleSelection}
      />
    </div>
  );
}
