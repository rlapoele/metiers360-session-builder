import * as z from 'zod';

import { BffVideoListSchema, ValidationErrorSchema } from '@lib/api/schemas';

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
export const CatalogueSuggestionsSchema = z.object({
  data: z
    .array(
      z.discriminatedUnion('category', [
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
      ]),
    )
    .max(5),
});
export type CatalogueStatus = z.infer<typeof CatalogueStatusSchema>;
export type CatalogueUnavailable = z.infer<typeof CatalogueUnavailableSchema>;
export type CatalogueSuggestions = z.infer<typeof CatalogueSuggestionsSchema>;
export type CatalogueSearchResult = z.infer<typeof CatalogueSearchResultSchema>;
