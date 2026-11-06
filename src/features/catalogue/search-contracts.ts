import * as z from 'zod';

import {
  BffVideoListSchema,
  ValidationErrorSchema,
  JobListSchema,
  AudienceListSchema,
  HeadsetListSchema,
} from '@lib/api/schemas';

export const CatalogueSearchResultSchema = BffVideoListSchema;
export const CatalogueSearchValidationSchema = ValidationErrorSchema;
const CataloguePendingStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('preparing'),
    attempt: z.number().int().positive(),
    message: z.string(),
    canRetry: z.literal(false),
  }),
  z.object({
    status: z.literal('failed'),
    message: z.string(),
    canRetry: z.boolean(),
  }),
]);
export const CatalogueStatusSchema = z.union([
  z.object({ status: z.literal('ready') }),
  CataloguePendingStatusSchema,
]);
export const CatalogueUnavailableSchema = z
  .object({
    error: z.enum([
      'catalogue_preparing',
      'catalogue_failed',
      'catalogue_unavailable',
    ]),
  })
  .and(CataloguePendingStatusSchema);
/** Selection identity/display data is independent of request-specific eligibility. */
export const CatalogueSelectionSchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('job'),
    key: z.string(),
    jobCode: z.string(),
    sourceKey: z.string(),
    label: z.string(),
    jobLabel: z.string(),
  }),
  z.object({
    category: z.literal('title'),
    key: z.string(),
    label: z.string(),
  }),
]);
export const CatalogueOptionAvailabilitySchema = z
  .object({
    count: z.number().int().nonnegative(),
    available: z.boolean(),
  })
  .refine(
    (value) => value.available === value.count > 0,
    'Availability must agree with count',
  );
export const CatalogueSuggestionsSchema = z.object({
  data: z
    .array(
      CatalogueSelectionSchema.and(
        z.object({ availability: CatalogueOptionAvailabilitySchema }),
      ),
    )
    .max(5),
});
const ReferenceAvailabilitySchema = z.array(
  CatalogueOptionAvailabilitySchema.and(z.object({ id: z.string() })),
);
export type CatalogueStatus = z.infer<typeof CatalogueStatusSchema>;
export type CatalogueUnavailable = z.infer<typeof CatalogueUnavailableSchema>;
export type CatalogueSuggestions = z.infer<typeof CatalogueSuggestionsSchema>;
export type CatalogueSearchResult = z.infer<typeof CatalogueSearchResultSchema>;

export const CatalogueSearchPageSchema = CatalogueSearchResultSchema.extend({
  context: z.object({
    availability: z.object({
      audiences: ReferenceAvailabilitySchema,
      headsets: ReferenceAvailabilitySchema,
    }),
    criteria: z.object({
      selected: z.array(CatalogueSelectionSchema).max(10),
      audience: z.string().optional(),
      headset: z.string().optional(),
      legacyQuery: z.string().optional(),
    }),
    references: z.object({
      jobs: JobListSchema,
      audiences: AudienceListSchema,
      headsets: HeadsetListSchema,
    }),
  }),
});
export type CatalogueSearchPage = z.infer<typeof CatalogueSearchPageSchema>;
export type CataloguePageResult =
  | { status: 200; body: CatalogueSearchPage }
  | { status: 400; body: z.infer<typeof CatalogueSearchValidationSchema> }
  | { status: 503; body: CatalogueUnavailable; retryAfter?: 1 };
