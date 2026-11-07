import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type {
  CataloguePageResult,
  CatalogueSearchPage,
} from '@features/catalogue/search-contracts';
import { fetchCataloguePage } from '@features/catalogue/search-page-api';
import {
  recognizedSearchParams,
  submittedSearchParams,
} from '@features/catalogue/search-navigation';
import {
  formCriteriaIdentity,
  type SearchFormCriteria,
} from '@features/catalogue/search-form';
import {
  fetchKeywordPreparation,
  retryKeywordPreparation,
} from '@features/catalogue/keyword-suggestions';

export interface CataloguePageProps {
  initialSearch: string;
  initialResult?: CataloguePageResult;
}

/** URL criteria commit immediately; one response owns results and current availability. */
export function useCatalogueSearch({
  initialSearch,
  initialResult,
}: CataloguePageProps) {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState({
    search: initialSearch,
    revision: 0,
  });
  const [committed, setCommitted] = useState<{
    key: string;
    criteria: SearchFormCriteria;
  }>();
  const [focusAfterRepair, setFocusAfterRepair] = useState(false);
  const key = recognizedSearchParams(
    new URLSearchParams(location.search),
  ).toString();
  const initialKey = recognizedSearchParams(
    new URLSearchParams(initialSearch),
  ).toString();
  // Trusted UI identities survive history entries whose remote search failed.
  // The URL remains authoritative; never invent selected labels from raw URL text.
  const knownCriteria = useRef(
    new Map<string, SearchFormCriteria>(
      initialResult?.status === 200
        ? [[initialKey, initialResult.body.context.criteria]]
        : [],
    ),
  );
  const pageQuery = useQuery({
    queryKey: ['catalogue-page', key],
    queryFn: ({ signal }) =>
      fetchCataloguePage(new URLSearchParams(key), signal),
    initialData: key === initialKey ? initialResult : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const current =
    !pageQuery.isPlaceholderData && pageQuery.data?.status === 200
      ? pageQuery.data.body
      : undefined;
  const lastSuccess = useRef<CatalogueSearchPage | undefined>(
    initialResult?.status === 200 ? initialResult.body : undefined,
  );
  useEffect(() => {
    if (current) {
      lastSuccess.current = current;
      knownCriteria.current.set(key, current.context.criteria);
    }
  }, [current, key]);
  const displayed = current ?? lastSuccess.current;
  const context = current?.context ?? displayed?.context;
  const criteria =
    committed?.key === key ? committed.criteria : current?.context.criteria;
  const activeResult = pageQuery.isPlaceholderData ? undefined : pageQuery.data;
  const preparation =
    activeResult?.status === 503 ? activeResult.body : undefined;
  const status = useQuery({
    queryKey: ['catalogue-page-status', key],
    queryFn: ({ signal }) => fetchKeywordPreparation(signal),
    enabled: preparation?.status === 'preparing',
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'preparing' ? 1000 : false,
  });
  useEffect(() => {
    if (preparation?.status === 'preparing' && status.data?.status === 'ready')
      void pageQuery.refetch();
  }, [preparation?.status, status.data, pageQuery.refetch]);
  const recovery = useMutation({
    mutationFn: async (requestKey: string) => ({
      state: await retryKeywordPreparation(),
      requestKey,
    }),
    onSuccess: ({ state, requestKey }) => {
      queryClient.setQueryData(['catalogue-page-status', requestKey], state);
      if (requestKey === key) void pageQuery.refetch();
    },
  });
  useEffect(() => {
    recovery.reset();
  }, [key, recovery.reset]);
  const failed = status.data?.status === 'failed' ? status.data : preparation;
  const preparing =
    preparation?.status === 'preparing' &&
    status.data?.status !== 'failed' &&
    !status.error;
  const validation =
    activeResult?.status === 400 ? activeResult.body : undefined;
  const error = pageQuery.isError || status.isError || recovery.isError;
  const previous = Boolean(
    displayed && (!current || pageQuery.isFetching || error || preparation),
  );
  function retry() {
    if (status.isError) void status.refetch();
    else if (failed?.status === 'failed' && failed.canRetry)
      recovery.mutate(key);
    else void pageQuery.refetch();
  }
  function navigate(
    params: URLSearchParams,
    next: SearchFormCriteria,
    reset = false,
  ) {
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (
      url !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    )
      window.history.pushState(window.history.state, '', url);
    const nextKey = recognizedSearchParams(params).toString();
    knownCriteria.current.set(nextKey, next);
    setCommitted({ key: nextKey, criteria: next });
    setFocusAfterRepair(reset);
    setLocation((previousLocation) => ({
      search,
      revision: previousLocation.revision + Number(reset),
    }));
  }
  useEffect(() => {
    function restore() {
      const restoredKey = recognizedSearchParams(
        new URLSearchParams(window.location.search),
      ).toString();
      const restored = knownCriteria.current.get(restoredKey);
      setCommitted(
        restored ? { key: restoredKey, criteria: restored } : undefined,
      );
      setFocusAfterRepair(false);
      setLocation((previousLocation) => ({
        search: window.location.search.slice(1),
        revision: previousLocation.revision + 1,
      }));
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!current || pageQuery.isFetching) return;
    const params = new URLSearchParams(location.search);
    if (Number(params.get('page') ?? 1) === current.meta.page) return;
    if (current.meta.page === 1) params.delete('page');
    else params.set('page', String(current.meta.page));
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
    setCommitted((previousCriteria) =>
      previousCriteria
        ? {
            ...previousCriteria,
            key: recognizedSearchParams(params).toString(),
          }
        : undefined,
    );
    setLocation((previousLocation) => ({ ...previousLocation, search }));
  }, [current, location.search, pageQuery.isFetching]);
  const requestedPage = Number(
    new URLSearchParams(location.search).get('page') ?? 1,
  );
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  return {
    displayed,
    criteria: criteria ?? { selected: [] },
    references: context?.references,
    revision: location.revision,
    focusAfterRepair,
    disabled: !context || !criteria || Boolean(validation),
    validation,
    modifyInvalid: () =>
      navigate(
        submittedSearchParams(
          new URLSearchParams(location.search),
          { selected: [] },
          { selected: [] },
          1,
        ),
        { selected: [] },
        true,
      ),
    preparing,
    failed: !preparing && failed?.status === 'failed' ? failed : undefined,
    error,
    loading:
      !displayed && (pageQuery.isPending || preparing || recovery.isPending),
    previous,
    isFetching: pageQuery.isFetching,
    retry,
    availability: {
      current: current && !previous ? current.context.availability : undefined,
      previous: displayed?.context.availability,
      loading: pageQuery.isFetching || preparing || recovery.isPending,
      error: error || Boolean(failed?.status === 'failed' && !preparing),
      canRetry: failed?.status === 'failed' ? failed.canRetry : true,
      retry,
    },
    change: (next: SearchFormCriteria) => {
      if (
        !criteria ||
        formCriteriaIdentity(criteria) === formCriteriaIdentity(next)
      )
        return;
      navigate(
        submittedSearchParams(
          new URLSearchParams(location.search),
          criteria,
          next,
          page,
        ),
        next,
      );
    },
    page: (nextPage: number) => {
      if (!criteria) return;
      const params = new URLSearchParams(location.search);
      if (nextPage === 1) params.delete('page');
      else params.set('page', String(nextPage));
      navigate(params, criteria);
    },
  };
}
