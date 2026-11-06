import type * as z from 'zod';

import {
  CatalogueStatusSchema,
  CatalogueSuggestionsSchema,
  CatalogueUnavailableSchema,
  CatalogueSearchValidationSchema,
  type CatalogueStatus,
  type CatalogueSelectionSchema,
} from '@features/catalogue/search-contracts';

export type KeywordSuggestion = z.infer<typeof CatalogueSelectionSchema>;
export interface KeywordSuggestionRequest {
  term: string;
  selected: readonly KeywordSuggestion[];
  audience?: string;
  headset?: string;
  legacyQuery?: string;
}
export class KeywordSuggestionError extends Error {
  constructor(
    message: string,
    readonly preparation?: Exclude<CatalogueStatus, { status: 'ready' }>,
  ) {
    super(message);
  }
}
export function keywordSuggestionParams(input: KeywordSuggestionRequest) {
  const params = new URLSearchParams({ term: input.term });
  const jobs = new Map<
    string,
    Extract<KeywordSuggestion, { category: 'job' }>
  >();
  const titles = new Set<string>();
  for (const item of input.selected) {
    if (item.category === 'job') {
      if (!jobs.has(item.jobCode)) jobs.set(item.jobCode, item);
    } else titles.add(item.key);
  }
  for (const code of [...jobs.keys()].sort()) {
    params.append('job', code);
    params.append('jobTerm', `${code}:${jobs.get(code)!.sourceKey}`);
  }
  for (const title of [...titles].sort()) params.append('title', title);
  if (input.audience) params.set('audience', input.audience);
  if (input.headset) params.set('headset', input.headset);
  if (input.legacyQuery) params.set('q', input.legacyQuery);
  return params;
}
export async function fetchKeywordSuggestions(
  params: URLSearchParams,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/catalogue/suggestions?${params}`, {
    signal,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const preparation = CatalogueUnavailableSchema.safeParse(body);
    if (preparation.success)
      throw new KeywordSuggestionError(
        preparation.data.message,
        preparation.data,
      );
    const validation = CatalogueSearchValidationSchema.safeParse(body);
    throw new KeywordSuggestionError(
      validation.success
        ? validation.data.message
        : 'Les suggestions sont indisponibles. Réessayez.',
    );
  }
  const parsed = CatalogueSuggestionsSchema.safeParse(body);
  if (!parsed.success)
    throw new KeywordSuggestionError(
      'La réponse des suggestions est invalide.',
    );
  return parsed.data.data;
}
export async function fetchKeywordPreparation(
  signal?: AbortSignal,
): Promise<CatalogueStatus> {
  const response = await fetch('/api/catalogue/status', { signal });
  const body: unknown = await response.json();
  const parsed = CatalogueStatusSchema.safeParse(body);
  if (!response.ok || !parsed.success)
    throw new KeywordSuggestionError(
      'L’état du catalogue est indisponible. Réessayez.',
    );
  return parsed.data;
}
export async function retryKeywordPreparation(): Promise<CatalogueStatus> {
  const response = await fetch('/api/catalogue/retry', { method: 'POST' });
  const body: unknown = await response.json();
  const parsed = CatalogueStatusSchema.safeParse(body);
  if (!response.ok || !parsed.success)
    throw new KeywordSuggestionError(
      'Le catalogue ne peut pas être préparé. Réessayez.',
    );
  return parsed.data;
}
