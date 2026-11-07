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
import type { SearchFormCriteria } from '@features/catalogue/search-form';
import {
  fetchKeywordPreparation,
  retryKeywordPreparation,
} from '@features/catalogue/keyword-suggestions';

export interface CataloguePageProps {
  initialSearch: string;
  initialResult?: CataloguePageResult;
}

/** URL owns applied criteria; pending form state never controls a result request. */
export function useCatalogueSearch({
  initialSearch,
  initialResult,
}: CataloguePageProps) {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState({
    search: initialSearch,
    revision: 0,
  });
  const [submitted, setSubmitted] = useState<SearchFormCriteria>();
  const [repair, setRepair] = useState(false);
  const key = recognizedSearchParams(
    new URLSearchParams(location.search),
  ).toString();
  const initialKey = recognizedSearchParams(
    new URLSearchParams(initialSearch),
  ).toString();
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
  const lastSuccess = useRef<CatalogueSearchPage | undefined>(
    initialResult?.status === 200 ? initialResult.body : undefined,
  );
  const current =
    !pageQuery.isPlaceholderData && pageQuery.data?.status === 200
      ? pageQuery.data.body
      : undefined;
  useEffect(() => {
    if (current) lastSuccess.current = current;
  }, [current]);
  const displayed = current ?? lastSuccess.current;
  const repairQuery = useQuery({
    queryKey: ['catalogue-repair-context'],
    queryFn: ({ signal }) => fetchCataloguePage(new URLSearchParams(), signal),
    enabled: repair,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const activeQuery = repair ? repairQuery : pageQuery;
  const activeResult = activeQuery.isPlaceholderData
    ? undefined
    : activeQuery.data;
  const preparation =
    activeResult?.status === 503 ? activeResult.body : undefined;
  const status = useQuery({
    queryKey: ['catalogue-page-status', key, repair],
    queryFn: ({ signal }) => fetchKeywordPreparation(signal),
    enabled: preparation?.status === 'preparing',
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'preparing' ? 1000 : false,
  });
  const refetch = activeQuery.refetch;
  useEffect(() => {
    if (preparation?.status === 'preparing' && status.data?.status === 'ready')
      void refetch();
  }, [preparation?.status, status.data, refetch]);
  const recovery = useMutation({
    mutationFn: retryKeywordPreparation,
    onSuccess: (state) => {
      // A manual cycle must replace a cached terminal status so polling resumes.
      queryClient.setQueryData(['catalogue-page-status', key, repair], state);
      void refetch();
    },
  });
  const failed = status.data?.status === 'failed' ? status.data : preparation;
  const preparing =
    preparation?.status === 'preparing' &&
    status.data?.status !== 'failed' &&
    !status.error;
  const validation =
    !pageQuery.isPlaceholderData && pageQuery.data?.status === 400
      ? pageQuery.data.body
      : undefined;
  const repairContext =
    repair && repairQuery.data?.status === 200
      ? repairQuery.data.body.context
      : undefined;
  const context = repairContext ?? current?.context ?? displayed?.context;
  const applied = repairContext?.criteria ??
    current?.context.criteria ??
    submitted ??
    displayed?.context.criteria ?? { selected: [] };
  const previous = Boolean(displayed && (!current || pageQuery.isFetching));

  function navigate(params: URLSearchParams, criteria?: SearchFormCriteria) {
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    if (
      url !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    )
      window.history.pushState({}, '', url);
    setSubmitted(criteria);
    setRepair(false);
    setLocation((currentLocation) => ({
      search,
      revision: currentLocation.revision + 1,
    }));
    if (recognizedSearchParams(params).toString() === key)
      void pageQuery.refetch();
  }
  useEffect(() => {
    function restore() {
      setSubmitted(undefined);
      setRepair(false);
      setLocation((previousLocation) => ({
        search: window.location.search.slice(1),
        revision: previousLocation.revision + 1,
      }));
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!current) return;
    const params = new URLSearchParams(location.search);
    const requested = Number(params.get('page') ?? 1);
    if (requested === current.meta.page) return;
    if (current.meta.page === 1) params.delete('page');
    else params.set('page', String(current.meta.page));
    const search = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
    setLocation((previousLocation) => ({ ...previousLocation, search }));
  }, [current, location.search]);

  const requestedPage = Number(
    new URLSearchParams(location.search).get('page') ?? 1,
  );
  const submittedPage =
    current?.meta.page ??
    (Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1);

  return {
    displayed,
    applied,
    references: context?.references,
    availabilityContext: context,
    revision: location.revision,
    disabled: !context || Boolean(validation && !repairContext),
    validation,
    repair,
    modifyInvalid: () => setRepair(true),
    preparing,
    failed: !preparing && failed?.status === 'failed' ? failed : undefined,
    error: activeQuery.isError || status.isError || recovery.isError,
    loading:
      !displayed && (activeQuery.isPending || preparing || recovery.isPending),
    previous,
    isFetching: pageQuery.isFetching,
    retry: () => {
      if (status.isError) void status.refetch();
      else if (failed?.status === 'failed' && failed.canRetry)
        recovery.mutate();
      else void refetch();
    },
    submit: (criteria: SearchFormCriteria) =>
      navigate(
        submittedSearchParams(
          new URLSearchParams(location.search),
          applied,
          criteria,
          repair ? 1 : submittedPage,
        ),
        criteria,
      ),
    page: (page: number) => {
      const params = new URLSearchParams(location.search);
      if (page === 1) params.delete('page');
      else params.set('page', String(page));
      navigate(params, applied);
    },
  };
}
