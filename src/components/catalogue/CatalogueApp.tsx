import { useStore } from '@nanostores/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '@components/ui/button';
import { CatalogueSearchForm } from '@components/catalogue/CatalogueSearchForm';
import { CatalogueResults } from '@components/catalogue/CatalogueResults';
import { SessionDraftComposition } from '@components/catalogue/SessionDraftComposition';
import { VideoDetailsSheet } from '@components/catalogue/VideoDetailsSheet';
import {
  useCatalogueSearch,
  type CataloguePageProps,
} from '@features/catalogue/use-catalogue-search';
import { formatResultCount } from '@features/catalogue/format';
import {
  $sessionDraft,
  $draftReadOnly,
  addVideoToDraft,
  hydrateSessionDraft,
  registerDraftVideos,
  removeVideoFromDraft,
} from '@features/sessions/session-draft.store';
import type { Video } from '@lib/api/schemas';

function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
export function CatalogueApp(props: CataloguePageProps) {
  return (
    <QueryProvider>
      <CatalogueContent {...props} />
    </QueryProvider>
  );
}
function CatalogueContent(props: CataloguePageProps) {
  const search = useCatalogueSearch(props);
  const [canObserveDraft, setCanObserveDraft] = useState(false);
  const draft = useStore($sessionDraft);
  const readOnly = useStore($draftReadOnly);
  const [detailsVideoId, setDetailsVideoId] = useState<string>();
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedIds = useMemo(
    () => new Set(canObserveDraft ? draft.video_ids : []),
    [canObserveDraft, draft.video_ids],
  );

  useEffect(() => {
    hydrateSessionDraft();
    setCanObserveDraft(true);
  }, []);

  useEffect(() => {
    if (search.displayed) registerDraftVideos(search.displayed.data);
  }, [search.displayed]);

  function toggleSelection(videoId: string) {
    if (selectedIds.has(videoId)) {
      removeVideoFromDraft(videoId);
      return;
    }

    const video = search.displayed?.data.find((item) => item.id === videoId);
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

  const references = search.references;
  const jobLabels = new Map(
    references?.jobs.data.map((job) => [job.code, job.label]),
  );
  const headsetLabels = new Map(
    references?.headsets.data.map((headset) => [headset.id, headset.name]),
  );
  const shownHeadset = search.displayed?.context.criteria.headset;
  function compatibleHeadsetLabels(video: Video) {
    return shownHeadset
      ? [headsetLabels.get(shownHeadset) ?? shownHeadset]
      : video.compatible_headsets.map((id) => headsetLabels.get(id) ?? id);
  }
  return (
    <div className="grid gap-6 xl:grid-cols-3 xl:items-start xl:gap-8">
      <div className="@container space-y-6 pb-24 xl:col-span-2 xl:pb-0">
        <div className="border-border bg-card space-y-5 rounded-lg border p-4 sm:p-5">
          <CatalogueSearchForm
            criteria={search.criteria}
            references={references}
            availability={search.availability}
            focusOnReady={search.focusAfterRepair}
            onChange={search.change}
            resetKey={String(search.revision)}
            disabled={search.disabled}
          />
          {search.displayed && (
            <p role="status" className="text-sm font-medium">
              {formatResultCount(search.displayed.meta.total)}
              {search.previous ? ' — résultats précédents' : ''}
            </p>
          )}
        </div>
        {search.validation && (
          <div
            role="alert"
            className="border-border bg-card space-y-3 rounded-lg border p-4"
          >
            <h2 className="font-semibold">
              Les critères de recherche sont invalides.
            </h2>
            <ul>
              {search.validation.details.map((detail, index) => (
                <li key={index}>{detail.message}</li>
              ))}
            </ul>
            <p>
              Les résultats ne sont pas élargis automatiquement. Effacez les
              critères invalides pour relancer la recherche.
            </p>
            {search.validation && (
              <Button type="button" onClick={search.modifyInvalid}>
                Réinitialiser la recherche
              </Button>
            )}
          </div>
        )}
        {search.preparing && (
          <p role="status">
            Le catalogue est en cours de préparation. Vos critères et votre
            séance sont conservés.
          </p>
        )}
        {search.failed && (
          <div
            role="alert"
            className="border-border bg-card space-y-3 rounded-lg border p-4"
          >
            <h2 className="font-semibold">
              Le catalogue ne peut pas être préparé.
            </h2>
            {search.failed.canRetry && (
              <Button type="button" onClick={search.retry}>
                Réessayer
              </Button>
            )}
          </div>
        )}
        <CatalogueResults
          data={search.displayed}
          errorMessage={
            search.error
              ? 'Réessayez dans quelques instants. Votre séance en cours est conservée.'
              : undefined
          }
          isPending={
            search.loading &&
            !search.failed &&
            !search.error &&
            !search.validation
          }
          isPlaceholderData={search.previous}
          isFetching={search.isFetching}
          query={{ page: search.displayed?.meta.page ?? 1 }}
          hasCriteria={Boolean(
            search.criteria.selected.length ||
            search.criteria.audience ||
            search.criteria.headset ||
            search.criteria.legacyQuery,
          )}
          readOnly={readOnly}
          selectedIds={selectedIds}
          jobLabelFor={(video) =>
            jobLabels.get(video.jobs[0] ?? '') ??
            video.jobs[0] ??
            'Métier non renseigné'
          }
          compatibleHeadsetLabelsFor={compatibleHeadsetLabels}
          onRetry={search.retry}
          onPageChange={search.page}
          onOpenDetails={openDetails}
          onToggle={toggleSelection}
        />
      </div>
      <SessionDraftComposition
        canObserveDraft={canObserveDraft}
        references={references}
        initialVideos={search.displayed?.data ?? []}
      />

      <VideoDetailsSheet
        readOnly={readOnly}
        videoId={detailsVideoId}
        references={references}
        isSelected={detailsVideoId ? selectedIds.has(detailsVideoId) : false}
        onClose={closeDetails}
        onToggle={toggleSelection}
      />
    </div>
  );
}
