import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeSearchText } from '@features/catalogue/search-dictionary-rules';
import {
  fetchKeywordPreparation,
  fetchKeywordSuggestions,
  keywordSuggestionParams,
  KeywordSuggestionError,
  retryKeywordPreparation,
  type KeywordSuggestionRequest,
} from '@features/catalogue/keyword-suggestions';

/** Remote state stays in Query; debounce and input presentation remain local. */
export function useKeywordSuggestions(
  input: KeywordSuggestionRequest,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const params = keywordSuggestionParams(input).toString();
  const [settled, setSettled] = useState('');
  const normalized = normalizeSearchText(input.term).replaceAll(' ', '');
  const eligible =
    enabled &&
    Array.from(normalized).length >= 2 &&
    Array.from(input.term).length <= 120;
  useEffect(() => {
    const timer = setTimeout(() => setSettled(params), 200);
    return () => clearTimeout(timer);
  }, [params]);
  const active = eligible && settled === params;
  const suggestions = useQuery({
    queryKey: ['catalogue-keyword-suggestions', params],
    queryFn: ({ signal }) =>
      fetchKeywordSuggestions(new URLSearchParams(params), signal),
    enabled: active,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const preparationError =
    suggestions.error instanceof KeywordSuggestionError
      ? suggestions.error.preparation
      : undefined;
  const status = useQuery({
    queryKey: ['catalogue-keyword-preparation', params],
    queryFn: ({ signal }) => fetchKeywordPreparation(signal),
    enabled: active && preparationError?.status === 'preparing',
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'preparing' ? 1000 : false,
  });
  const recovery = useMutation({
    mutationFn: retryKeywordPreparation,
    onSuccess: (state) => {
      // A manual cycle must replace a cached terminal status so polling resumes.
      queryClient.setQueryData(
        ['catalogue-keyword-preparation', params],
        state,
      );
      void suggestions.refetch();
    },
  });
  useEffect(() => {
    if (
      active &&
      preparationError?.status === 'preparing' &&
      status.data?.status === 'ready'
    )
      void suggestions.refetch();
  }, [active, preparationError?.status, status.data, suggestions.refetch]);
  const preparation =
    status.data?.status === 'failed' ? status.data : preparationError;
  const error = recovery.error ?? status.error ?? suggestions.error;
  const preparing =
    active && !status.error && preparation?.status === 'preparing';
  return {
    items: active && !suggestions.isFetching ? (suggestions.data ?? []) : [],
    loading:
      eligible &&
      (!active || suggestions.isFetching || preparing || recovery.isPending),
    error: active && !preparing ? error : null,
    canRetry: preparation?.status === 'failed' ? preparation.canRetry : true,
    retry: () =>
      status.error
        ? void status.refetch()
        : preparation?.status === 'failed' && preparation.canRetry
          ? recovery.mutate()
          : void suggestions.refetch(),
    preparing,
  };
}
