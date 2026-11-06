import type { createCatalogueClient } from '@lib/api/catalogue-client.server';
import { CatalogueClientError } from '@lib/api/errors';
import type {
  AudienceList,
  HeadsetList,
  JobList,
  Video,
} from '@lib/api/schemas';

type SnapshotClient = Pick<
  ReturnType<typeof createCatalogueClient>,
  'listVideos' | 'listJobs' | 'listAudiences' | 'listHeadsets'
>;

export interface CatalogueSnapshot {
  readonly videos: readonly Video[];
  readonly jobs: JobList;
  readonly audiences: AudienceList;
  readonly headsets: HeadsetList;
}

function invalidSnapshot(message: string): never {
  throw new CatalogueClientError({
    kind: 'invalid-response',
    status: 502,
    message,
  });
}

function uniqueIdentifiers(values: readonly string[]) {
  const identifiers = new Set(values);
  if (identifiers.size !== values.length)
    invalidSnapshot('Duplicate catalogue identifiers.');
  return identifiers;
}

/**
 * Collect a complete snapshot through the validated API client. Nothing is
 * published here: preparation also needs the dictionary before becoming ready.
 * Requests are sequential so an attempt stops at the first upstream failure.
 */
export async function loadCatalogueSnapshot(
  client: SnapshotClient,
  signal: AbortSignal,
): Promise<CatalogueSnapshot> {
  const videos: Video[] = [];
  let expectedTotal: number | undefined;
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    signal.throwIfAborted();
    const result = await client.listVideos(
      new URLSearchParams({ page: String(page), per_page: '100' }),
      signal,
    );
    expectedTotal ??= result.meta.total;
    totalPages = Math.max(1, Math.ceil(expectedTotal / 100));
    const expectedLength = Math.min(
      100,
      Math.max(0, expectedTotal - (page - 1) * 100),
    );
    if (
      result.meta.page !== page ||
      result.meta.per_page !== 100 ||
      result.meta.total !== expectedTotal ||
      result.meta.total_pages !== totalPages ||
      result.data.length !== expectedLength
    )
      invalidSnapshot('The catalogue pagination is inconsistent.');
    videos.push(...result.data);
  }
  uniqueIdentifiers(videos.map((video) => video.id));

  signal.throwIfAborted();
  const jobs = await client.listJobs(signal);
  signal.throwIfAborted();
  const audiences = await client.listAudiences(signal);
  signal.throwIfAborted();
  const headsets = await client.listHeadsets(signal);
  signal.throwIfAborted();

  const jobCodes = uniqueIdentifiers(jobs.data.map((job) => job.code));
  const audienceIds = uniqueIdentifiers(
    audiences.data.map((audience) => audience.id),
  );
  const headsetIds = uniqueIdentifiers(
    headsets.data.map((headset) => headset.id),
  );
  for (const video of videos) {
    if (
      video.jobs.some((code) => !jobCodes.has(code)) ||
      video.audiences.some((id) => !audienceIds.has(id)) ||
      video.compatible_headsets.some((id) => !headsetIds.has(id))
    )
      invalidSnapshot('A video refers to an unknown catalogue identifier.');
  }

  videos.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  return { videos, jobs, audiences, headsets };
}
