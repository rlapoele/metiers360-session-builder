import type { SearchDictionary } from '@features/catalogue/search-dictionary.server';
import type { SearchCriteria } from '@features/catalogue/search-query.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import type { DictionarySuggestion } from '@features/catalogue/search-suggestions.server';

function membershipCounts(rows: readonly (readonly string[])[]) {
  const counts = new Map<string, number>();
  for (const values of rows)
    for (const value of new Set(values))
      counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
function availability(count: number) {
  return { count, available: count > 0 };
}

/**
 * Complete-snapshot predicates for SSR/HTTP search and contextual options.
 * Jobs combine with OR; titles/q and other groups combine with AND.
 * Alternatives exclude their own group (titles retain all selected terms).
 * See tasks/search-contract.md, Contextual option availability.
 * Derived per request; never mutate or rebuild the process-lifetime dictionary.
 */
export function createSearchContext(
  snapshot: CatalogueSnapshot,
  dictionary: SearchDictionary,
  criteria: SearchCriteria,
) {
  const titles = new Map(dictionary.titles.map((entry) => [entry.key, entry]));
  const titleMatches = criteria.titles.map(
    (key) => new Set(titles.get(key)!.videoIds),
  );
  const q = criteria.q?.toLowerCase();
  const matches = [];
  const jobRows: string[][] = [];
  const audienceRows: string[][] = [];
  const headsetRows: string[][] = [];
  for (const video of snapshot.videos) {
    if (
      !titleMatches.every((ids) => ids.has(video.id)) ||
      (q && !video.title.toLowerCase().includes(q))
    )
      continue;
    const job =
      criteria.jobs.length === 0 ||
      criteria.jobs.some((code) => video.jobs.includes(code));
    const audience =
      !criteria.audience || video.audiences.includes(criteria.audience);
    const headset =
      !criteria.headset || video.compatible_headsets.includes(criteria.headset);
    if (audience && headset) jobRows.push(video.jobs);
    if (job && headset) audienceRows.push(video.audiences);
    if (job && audience) headsetRows.push(video.compatible_headsets);
    if (job && audience && headset) matches.push(video);
  }
  const jobs = membershipCounts(jobRows);
  const audiences = membershipCounts(audienceRows);
  const headsets = membershipCounts(headsetRows);
  const matchingIds = new Set(matches.map((video) => video.id));
  return {
    matches,
    availability: {
      audiences: snapshot.audiences.data.map(({ id }) => ({
        id,
        ...availability(audiences.get(id) ?? 0),
      })),
      headsets: snapshot.headsets.data.map(({ id }) => ({
        id,
        ...availability(headsets.get(id) ?? 0),
      })),
    },
    forSuggestion(item: DictionarySuggestion) {
      const count =
        item.category === 'job'
          ? (jobs.get(item.jobCode) ?? 0)
          : titles.get(item.key)!.videoIds.filter((id) => matchingIds.has(id))
              .length;
      return availability(count);
    },
  };
}
