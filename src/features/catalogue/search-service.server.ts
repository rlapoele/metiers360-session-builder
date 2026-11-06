import type {
  CatalogueStatus,
  CatalogueUnavailable,
  CatalogueSearchResult,
  CatalogueSuggestions,
  CataloguePageResult,
} from '@features/catalogue/search-contracts';
import type { SearchDictionary } from '@features/catalogue/search-dictionary.server';
import { compareCodePoints } from '@features/catalogue/search-dictionary-rules';
import type { CataloguePreparationState } from '@features/catalogue/search-preparation.server';
import {
  parseSearchQuery,
  resolveSearchCriteria,
  type SearchCriteria,
} from '@features/catalogue/search-query.server';
import { suggestDictionaryTerms } from '@features/catalogue/search-suggestions.server';
import type { ValidationError } from '@lib/api/schemas';

interface SearchRuntime {
  getState: () => CataloguePreparationState<SearchDictionary>;
  retry: () => Promise<CataloguePreparationState<SearchDictionary>>;
}
type SearchFailure =
  | { status: 400; body: ValidationError }
  | { status: 503; body: CatalogueUnavailable; retryAfter?: 1 };
export type CatalogueServiceResult<T> =
  { status: 200; body: T } | SearchFailure;

function publicStatus(
  state: CataloguePreparationState<SearchDictionary>,
): CatalogueStatus {
  if (state.status === 'ready') return { status: 'ready' };
  if (state.status === 'preparing')
    return {
      status: 'preparing',
      attempt: state.attempt,
      message: 'Le catalogue est en cours de préparation.',
      canRetry: false,
    };
  return {
    status: 'failed',
    message: 'Le catalogue ne peut pas être préparé. Réessayez.',
    canRetry: state.status === 'failed',
  };
}

/** Same synchronous cache service for SSR and HTTP; calls never lazy-start preparation. */
export function createCatalogueSearchService(runtime: SearchRuntime) {
  function prepare(params: URLSearchParams, suggestions = false) {
    const parsed = parseSearchQuery(params, suggestions);
    if (!parsed.success)
      return {
        success: false as const,
        result: { status: 400 as const, body: parsed.error },
      };
    const state = runtime.getState();
    if (state.status !== 'ready') {
      const status = publicStatus(state);
      // state cannot be ready here, but publicStatus also serves the status endpoint.
      if (status.status === 'ready') throw new Error('Unexpected ready status');
      const body: CatalogueUnavailable = {
        ...status,
        error:
          status.status === 'preparing'
            ? 'catalogue_preparing'
            : status.canRetry
              ? 'catalogue_failed'
              : 'catalogue_unavailable',
      };
      return {
        success: false as const,
        result: {
          status: 503 as const,
          body,
          ...(status.status === 'preparing' ? { retryAfter: 1 as const } : {}),
        },
      };
    }
    const resolved = resolveSearchCriteria(
      parsed.data,
      state.snapshot,
      state.dictionary,
    );
    if (!resolved.success)
      return {
        success: false as const,
        result: { status: 400 as const, body: resolved.error },
      };
    return {
      success: true as const,
      criteria: resolved.data,
      term: parsed.data.term,
      state,
    };
  }
  function search(
    params: URLSearchParams,
  ):
    | SearchFailure
    | { status: 200; body: CatalogueSearchResult; criteria: SearchCriteria } {
    const prepared = prepare(params);
    if (!prepared.success) return prepared.result;
    const { criteria, state } = prepared;
    const titleMatches = criteria.titles.map(
      (key) =>
        new Set(
          state.dictionary.titles.find((title) => title.key === key)!.videoIds,
        ),
    );
    const q = criteria.q?.toLowerCase();
    const matches = state.snapshot.videos
      .filter(
        (video) =>
          criteria.jobs.every((code) => video.jobs.includes(code)) &&
          titleMatches.every((ids) => ids.has(video.id)) &&
          (!criteria.audience || video.audiences.includes(criteria.audience)) &&
          (!criteria.headset ||
            video.compatible_headsets.includes(criteria.headset)) &&
          (!q || video.title.toLowerCase().includes(q)),
      )
      .sort((a, b) => compareCodePoints(a.id, b.id));
    const totalPages = Math.max(1, Math.ceil(matches.length / 24));
    const page = Math.min(criteria.page, totalPages);
    return {
      status: 200,
      criteria: { ...criteria, page },
      body: {
        data: matches.slice((page - 1) * 24, page * 24),
        meta: {
          page,
          per_page: 24,
          total: matches.length,
          total_pages: totalPages,
        },
      },
    };
  }
  return {
    search,
    page(params: URLSearchParams): CataloguePageResult {
      const result = search(params);
      if (result.status !== 200) return result;
      const state = runtime.getState();
      if (state.status !== 'ready') throw new Error('Catalogue owner stopped');
      const { criteria } = result;
      return {
        status: 200,
        body: {
          ...result.body,
          context: {
            criteria: {
              audience: criteria.audience,
              headset: criteria.headset,
              legacyQuery: criteria.q,
              selected: [
                ...criteria.jobTerms.map((source) => ({
                  category: 'job' as const,
                  key: source.code,
                  jobCode: source.code,
                  sourceKey: source.sourceKey,
                  label: source.label,
                  jobLabel: state.dictionary.jobs.find(
                    (job) => job.code === source.code,
                  )!.label,
                })),
                ...criteria.titles.map((key) => ({
                  category: 'title' as const,
                  key,
                  label: state.dictionary.titles.find(
                    (title) => title.key === key,
                  )!.label,
                })),
              ],
            },
            references: {
              jobs: state.snapshot.jobs,
              audiences: state.snapshot.audiences,
              headsets: state.snapshot.headsets,
            },
          },
        },
      };
    },
    suggestions(
      params: URLSearchParams,
    ): CatalogueServiceResult<CatalogueSuggestions> {
      const prepared = prepare(params, true);
      if (!prepared.success) return prepared.result;
      return {
        status: 200,
        body: {
          data: suggestDictionaryTerms(prepared.state.dictionary, {
            term: prepared.term,
            selectedJobCodes: prepared.criteria.jobs,
            selectedTitleKeys: prepared.criteria.titles,
          }),
        },
      };
    },
    status(): { status: 200; body: CatalogueStatus } {
      return { status: 200, body: publicStatus(runtime.getState()) };
    },
    retry(): { status: 200 | 202; body: CatalogueStatus } {
      // retry() changes failed -> preparing synchronously and joins in-flight work.
      // Do not wait through network requests/backoff in a visitor's HTTP request.
      void runtime.retry();
      const body = publicStatus(runtime.getState());
      return { status: body.status === 'preparing' ? 202 : 200, body };
    },
  };
}
