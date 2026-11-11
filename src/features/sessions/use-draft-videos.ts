import { useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';

import { fetchVideo } from '@features/catalogue/api';
import { registerDraftVideos } from '@features/sessions/session-draft.store';
import type { Video } from '@lib/api/schemas';

/** Resolve IDs received from another tab, including data already in Query's cache. */
export function useDraftVideos(ids: string[], initialVideos: Video[] = []) {
  const initialById = new Map(initialVideos.map((video) => [video.id, video]));
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['video-details', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchVideo(id, signal),
      initialData: initialById.get(id),
    })),
  });
  useEffect(() => {
    registerDraftVideos(
      queries.flatMap((query) => (query.data ? [query.data] : [])),
    );
  }, [queries]);
  return queries;
}
