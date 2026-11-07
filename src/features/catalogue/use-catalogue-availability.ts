import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { CatalogueSearchPage } from '@features/catalogue/search-contracts';
import type { SearchFormCriteria } from '@features/catalogue/search-form';
import { formCriteriaIdentity } from '@features/catalogue/search-form';
import { searchFormParams } from '@features/catalogue/search-navigation';
import { fetchCataloguePage } from '@features/catalogue/search-page-api';
import {
  fetchKeywordPreparation,
  KeywordSuggestionError,
  retryKeywordPreparation,
} from '@features/catalogue/keyword-suggestions';

export type CatalogueAvailabilityContext = Pick<
  CatalogueSearchPage['context'],
  'criteria' | 'availability'
>;

/** Availability follows selected form criteria; it never applies results or changes the URL. */
export function useCatalogueAvailability(
  criteria: SearchFormCriteria,
  enabled: boolean,
  initialContext?: CatalogueAvailabilityContext,
) {
  const client = useQueryClient();
  const params = searchFormParams(criteria).toString();
  const initial =
    initialContext &&
    formCriteriaIdentity(initialContext.criteria) ===
      formCriteriaIdentity(criteria)
      ? initialContext
      : undefined;
  const query = useQuery({
    queryKey: ['catalogue-option-availability', params],
    queryFn: async ({ signal }): Promise<CatalogueAvailabilityContext> => {
      const result = await fetchCataloguePage(
        new URLSearchParams(params),
        signal,
      );
      if (result.status !== 200)
        throw new KeywordSuggestionError(
          result.body.message,
          result.status === 503 ? result.body : undefined,
        );
      return {
        criteria: result.body.context.criteria,
        availability: result.body.context.availability,
      };
    },
    initialData: initial,
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const lastSuccess = useRef(initialContext?.availability);
  const current =
    enabled && !query.isPlaceholderData && !query.isFetching && !query.error
      ? query.data?.availability
      : undefined;
  useEffect(() => {
    if (current) lastSuccess.current = current;
  }, [current]);
  const preparation =
    query.error instanceof KeywordSuggestionError
      ? query.error.preparation
      : undefined;
  const status = useQuery({
    queryKey: ['catalogue-availability-status', params],
    queryFn: ({ signal }) => fetchKeywordPreparation(signal),
    enabled: enabled && preparation?.status === 'preparing',
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (state) =>
      state.state.data?.status === 'preparing' ? 1000 : false,
  });
  const recovery = useMutation({
    mutationFn: async (requestKey: string) => ({
      state: await retryKeywordPreparation(),
      requestKey,
    }),
    onSuccess: ({ state, requestKey }) => {
      client.setQueryData(['catalogue-availability-status', requestKey], state);
      if (requestKey === params) void query.refetch();
    },
  });
  useEffect(() => {
    // Recovery errors belong to the criteria that failed, not later contexts.
    recovery.reset();
  }, [params, recovery.reset]);
  useEffect(() => {
    if (
      enabled &&
      preparation?.status === 'preparing' &&
      status.data?.status === 'ready'
    )
      void query.refetch();
  }, [enabled, preparation?.status, status.data, query.refetch]);
  const failed = status.data?.status === 'failed' ? status.data : preparation;
  const preparing =
    enabled &&
    preparation?.status === 'preparing' &&
    status.data?.status !== 'failed' &&
    !status.error;
  return {
    current,
    previous: lastSuccess.current,
    loading:
      enabled &&
      (query.isFetching || query.isPending || preparing || recovery.isPending),
    error:
      enabled && !preparing
        ? (recovery.error ?? status.error ?? query.error)
        : null,
    canRetry: failed?.status === 'failed' ? failed.canRetry : true,
    retry: () =>
      status.error
        ? void status.refetch()
        : failed?.status === 'failed' && failed.canRetry
          ? recovery.mutate(params)
          : void query.refetch(),
  };
}
