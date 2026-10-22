export interface CatalogueQuery {
  q: string;
  job: string;
  headset: string;
  audience: string;
  page: number;
}

type CatalogueCriteria = Omit<CatalogueQuery, 'page'>;

const DEFAULT_QUERY: CatalogueQuery = {
  q: '',
  job: '',
  headset: '',
  audience: '',
  page: 1,
};

function readTrimmed(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key)?.trim() ?? '';
}

export function catalogueQueryFromSearchParams(
  searchParams: URLSearchParams,
): CatalogueQuery {
  const pageValue = Number(searchParams.get('page'));

  return {
    q: readTrimmed(searchParams, 'q'),
    job: readTrimmed(searchParams, 'job'),
    headset: readTrimmed(searchParams, 'headset'),
    audience: readTrimmed(searchParams, 'audience'),
    page:
      Number.isInteger(pageValue) && pageValue > 0
        ? pageValue
        : DEFAULT_QUERY.page,
  };
}

export function catalogueQueryToSearchParams(
  query: CatalogueQuery,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const key of ['q', 'job', 'headset', 'audience'] as const) {
    const value = query[key].trim();
    if (value) searchParams.set(key, value);
  }

  if (query.page > 1) searchParams.set('page', String(query.page));

  return searchParams;
}

export function updateCatalogueQuery(
  current: CatalogueQuery,
  update: Partial<CatalogueQuery>,
): CatalogueQuery {
  const next = { ...current, ...update };
  const criteriaChanged = (
    [
      'q',
      'job',
      'headset',
      'audience',
    ] as const satisfies readonly (keyof CatalogueCriteria)[]
  ).some((key) => next[key] !== current[key]);

  return {
    ...next,
    page: criteriaChanged ? 1 : next.page,
  };
}
