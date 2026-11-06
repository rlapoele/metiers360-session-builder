import * as z from 'zod';

import {
  compareCodePoints,
  normalizeSearchText,
} from '@features/catalogue/search-dictionary-rules';
import type { SearchDictionary } from '@features/catalogue/search-dictionary.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import type { ValidationError } from '@lib/api/schemas';

const RECOGNIZED = new Set([
  'job',
  'jobTerm',
  'title',
  'q',
  'audience',
  'headset',
  'page',
]);
const term = z
  .string()
  .refine(
    (value) => Array.from(value).length <= 120,
    'Utilisez au maximum 120 caractères.',
  )
  .transform((value) => value.trim());
const single = z
  .array(term)
  .max(1, 'Une seule valeur est autorisée.')
  .transform((values) => values[0] || undefined);
const QuerySchema = z
  .object({
    jobs: z
      .array(term)
      .transform((values) =>
        [...new Set(values.filter(Boolean))].sort(compareCodePoints),
      ),
    titles: z
      .array(term)
      .transform((values) =>
        [...new Set(values.filter(Boolean).map(normalizeSearchText))].sort(
          compareCodePoints,
        ),
      ),
    jobTerms: z
      .array(z.string())
      .transform((values) => [
        ...new Set(values.filter((value) => value.trim())),
      ]),
    q: single,
    audience: single,
    headset: single,
    page: single
      .pipe(
        z
          .string()
          .regex(/^[0-9]+$/, 'Choisissez un numéro de page entier positif.')
          .transform(Number)
          .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
          .optional(),
      )
      .transform((value) => value ?? 1),
    term: single.transform((value) => value ?? ''),
  })
  .superRefine((input, context) => {
    if (input.jobs.length + input.titles.length + Number(Boolean(input.q)) > 10)
      context.addIssue({
        code: 'custom',
        path: ['criteria'],
        message: 'Sélectionnez au maximum dix métiers ou mots-clés.',
      });
    for (const value of input.jobTerms) {
      const colon = value.indexOf(':');
      if (
        colon < 1 ||
        !term.safeParse(value.slice(colon + 1)).success ||
        !value.slice(colon + 1).trim()
      )
        context.addIssue({
          code: 'custom',
          path: ['jobTerm'],
          message: 'La source du métier sélectionné est invalide.',
        });
    }
  });
export type ParsedSearchQuery = z.infer<typeof QuerySchema>;
export type SearchCriteria = Omit<ParsedSearchQuery, 'jobTerms' | 'term'> & {
  jobTerms: { code: string; sourceKey: string; label: string }[];
};

export function invalidSearch(field: string, message: string): ValidationError {
  return {
    error: 'validation_error',
    message: 'Les critères de recherche sont invalides.',
    details: [{ field, message }],
  };
}

/** Parse bounded known query data once; dictionary membership is a later, ready-only step. */
export function parseSearchQuery(
  params: URLSearchParams,
  suggestions = false,
):
  | { success: true; data: ParsedSearchQuery }
  | { success: false; error: ValidationError } {
  const recognized = new URLSearchParams();
  for (const [key, value] of params)
    if (RECOGNIZED.has(key) || (suggestions && key === 'term'))
      recognized.append(key, value);
  // Bound percent-encoded recognized query bytes, including duplicates, before normalization.
  if (new TextEncoder().encode(recognized.toString()).length > 8192)
    return {
      success: false,
      error: invalidSearch(
        'query',
        'La recherche dépasse la limite de 8 Kio. Réduisez les critères.',
      ),
    };
  const result = QuerySchema.safeParse({
    jobs: params.getAll('job'),
    titles: params.getAll('title'),
    jobTerms: params.getAll('jobTerm'),
    q: params.getAll('q'),
    audience: params.getAll('audience'),
    headset: params.getAll('headset'),
    page: params.getAll('page'),
    term: suggestions ? params.getAll('term') : [],
  });
  if (!result.success)
    return {
      success: false,
      error: {
        error: 'validation_error',
        message: 'Les critères de recherche sont invalides.',
        details: result.error.issues.map((issue) => ({
          field: String(issue.path[0] ?? 'query'),
          message:
            issue.code === 'custom' || issue.code === 'too_big'
              ? issue.message
              : 'La valeur de ce critère est invalide.',
        })),
      },
    };
  return { success: true, data: result.data };
}

/** Resolve authored chip labels only from trusted dictionary sources, never URL text. */
export function resolveSearchCriteria(
  input: ParsedSearchQuery,
  snapshot: CatalogueSnapshot,
  dictionary: SearchDictionary,
):
  | { success: true; data: SearchCriteria }
  | { success: false; error: ValidationError } {
  const fail = (field: string, message: string) => ({
    success: false as const,
    error: invalidSearch(field, message),
  });
  if (
    input.audience &&
    !snapshot.audiences.data.some((item) => item.id === input.audience)
  )
    return fail('audience', 'Choisissez un public du catalogue.');
  if (
    input.headset &&
    !snapshot.headsets.data.some((item) => item.id === input.headset)
  )
    return fail('headset', 'Choisissez un casque du catalogue.');
  if (
    input.jobs.some((code) => !dictionary.jobs.some((job) => job.code === code))
  )
    return fail('job', 'Choisissez un métier du catalogue.');
  if (
    input.titles.some(
      (key) => !dictionary.titles.some((title) => title.key === key),
    )
  )
    return fail('title', 'Choisissez un mot-clé proposé par le catalogue.');
  const sources = new Map<string, string>();
  for (const value of input.jobTerms) {
    const colon = value.indexOf(':');
    const code = value.slice(0, colon);
    const sourceKey = value.slice(colon + 1);
    if (
      !input.jobs.includes(code) ||
      !dictionary.jobs
        .find((job) => job.code === code)
        ?.sources.some((source) => source.key === sourceKey)
    )
      return fail(
        'jobTerm',
        'Cette appellation ne correspond pas au métier sélectionné.',
      );
    if (sources.has(code) && sources.get(code) !== sourceKey)
      return fail('jobTerm', 'Choisissez une seule appellation par métier.');
    sources.set(code, sourceKey);
  }
  const jobTerms = input.jobs.map((code) => {
    const job = dictionary.jobs.find((job) => job.code === code)!;
    const source = sources.has(code)
      ? job.sources.find((source) => source.key === sources.get(code))!
      : job.sources.find((source) => source.kind === 'label')!;
    return { code, sourceKey: source.key, label: source.label };
  });
  return {
    success: true,
    data: {
      jobs: input.jobs,
      titles: input.titles,
      jobTerms,
      q: input.q,
      audience: input.audience,
      headset: input.headset,
      page: input.page,
    },
  };
}
