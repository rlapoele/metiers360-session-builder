import {
  ApiErrorSchema,
  AudienceListSchema,
  BffVideoSchema,
  BffVideoListSchema,
  HeadsetListSchema,
  JobListSchema,
  type AudienceList,
  type HeadsetList,
  type JobList,
  type Video,
  type VideoList,
} from '@lib/api/schemas';
import {
  catalogueQueryToSearchParams,
  type CatalogueQuery,
} from '@features/catalogue/query-params';

export interface CatalogueReferences {
  jobs: JobList;
  headsets: HeadsetList;
  audiences: AudienceList;
}

async function fetchJson(
  input: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(input, { signal });
  const body: unknown = await response.json();

  if (!response.ok) {
    const apiError = ApiErrorSchema.safeParse(body);
    throw new Error(
      apiError.success && apiError.data.message
        ? apiError.data.message
        : 'Le service du catalogue est temporairement indisponible.',
    );
  }

  return body;
}

export async function fetchVideos(
  query: CatalogueQuery,
  signal?: AbortSignal,
): Promise<VideoList> {
  const searchParams = catalogueQueryToSearchParams(query);
  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
  const result = BffVideoListSchema.safeParse(
    await fetchJson(`/api/videos${suffix}`, signal),
  );

  if (!result.success) {
    throw new Error('La réponse du catalogue est invalide.');
  }

  return result.data;
}

export async function fetchVideo(
  videoId: string,
  signal?: AbortSignal,
): Promise<Video> {
  const result = BffVideoSchema.safeParse(
    await fetchJson(`/api/videos/${encodeURIComponent(videoId)}`, signal),
  );

  if (!result.success) {
    throw new Error('La réponse des détails de la vidéo est invalide.');
  }

  return result.data;
}

export async function fetchCatalogueReferences(
  signal?: AbortSignal,
): Promise<CatalogueReferences> {
  const [jobs, headsets, audiences] = await Promise.all([
    fetchJson('/api/jobs', signal),
    fetchJson('/api/headsets', signal),
    fetchJson('/api/audiences', signal),
  ]);
  const parsedJobs = JobListSchema.safeParse(jobs);
  const parsedHeadsets = HeadsetListSchema.safeParse(headsets);
  const parsedAudiences = AudienceListSchema.safeParse(audiences);

  if (
    !parsedJobs.success ||
    !parsedHeadsets.success ||
    !parsedAudiences.success
  ) {
    throw new Error('La réponse des filtres est invalide.');
  }

  return {
    jobs: parsedJobs.data,
    headsets: parsedHeadsets.data,
    audiences: parsedAudiences.data,
  };
}
