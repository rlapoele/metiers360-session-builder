import {
  CatalogueSearchPageSchema,
  CatalogueSearchValidationSchema,
  CatalogueUnavailableSchema,
  type CataloguePageResult,
} from '@features/catalogue/search-contracts';

/** Validate opt-in page metadata once; other search callers keep their data/meta contract. */
export async function fetchCataloguePage(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<CataloguePageResult> {
  const query = new URLSearchParams(params);
  query.set('include', 'context');
  const response = await fetch(`/api/catalogue/search?${query}`, { signal });
  const body: unknown = await response.json();
  if (response.ok) {
    const parsed = CatalogueSearchPageSchema.safeParse(body);
    if (parsed.success) return { status: 200, body: parsed.data };
  }
  if (response.status === 400) {
    const parsed = CatalogueSearchValidationSchema.safeParse(body);
    if (parsed.success) return { status: 400, body: parsed.data };
  }
  if (response.status === 503) {
    const parsed = CatalogueUnavailableSchema.safeParse(body);
    if (parsed.success)
      return {
        status: 503,
        body: parsed.data,
        ...(parsed.data.status === 'preparing'
          ? { retryAfter: 1 as const }
          : {}),
      };
  }
  throw new Error(
    'Le catalogue ne peut pas être chargé. Votre séance en cours est conservée.',
  );
}
