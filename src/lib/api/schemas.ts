import * as z from 'zod';

const IdentifierSchema = z.string().min(1);

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().positive(),
});

export const VideoSchema = z.object({
  id: IdentifierSchema,
  title: z.string(),
  description: z.string(),
  duration_seconds: z.number().int().nonnegative(),
  jobs: z.array(IdentifierSchema),
  audiences: z.array(IdentifierSchema),
  compatible_headsets: z.array(IdentifierSchema),
  thumbnail_url: z.url().nullable(),
  published_at: z.iso.date(),
});

export const VideoListSchema = z.object({
  data: z.array(VideoSchema),
  meta: PaginationMetaSchema,
});

const JobDomainSchema = z.object({
  code: IdentifierSchema,
  label: z.string(),
});

export const JobSchema = z.object({
  code: IdentifierSchema,
  label: z.string(),
  major_domain: JobDomainSchema,
  professional_domain: JobDomainSchema,
  appellations: z.array(z.string()),
});

export const JobListSchema = z.object({
  data: z.array(JobSchema),
  source: z.string(),
});

export const AudienceSchema = z.object({
  id: IdentifierSchema,
  label: z.string(),
});

export const AudienceListSchema = z.object({
  data: z.array(AudienceSchema),
});

export const HeadsetSchema = z.object({
  id: IdentifierSchema,
  name: z.string(),
});

export const HeadsetListSchema = z.object({
  data: z.array(HeadsetSchema),
});

export const SessionSchema = z.object({
  id: IdentifierSchema,
  name: z.string().min(1).max(120),
  video_ids: z.array(IdentifierSchema).min(1).max(30),
  headset_id: IdentifierSchema.nullable(),
  created_at: z.iso.datetime({ offset: true }),
  total_duration_seconds: z.number().int().nonnegative(),
});

export const SessionListSchema = z.object({
  data: z.array(SessionSchema),
});

export const CreateSessionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Le nom est obligatoire.')
      .max(120, 'Le nom ne doit pas dépasser 120 caractères.'),
    video_ids: z
      .array(IdentifierSchema)
      .min(1, 'Au moins une vidéo est requise.')
      .max(30, 'Une séance contient au plus 30 vidéos.'),
    headset_id: IdentifierSchema.nullable().optional(),
  })
  .strict();

export const SessionDraftSchema = z
  .object({
    version: z.literal(1),
    name: z.string().max(120),
    video_ids: z.array(IdentifierSchema).max(30),
    headset_id: IdentifierSchema.nullable(),
  })
  .strict();

export const ApiErrorSchema = z.object({
  error: IdentifierSchema,
  message: z.string().optional(),
});

export const ValidationErrorSchema = z.object({
  error: z.literal('validation_error'),
  message: z.string(),
  details: z.array(
    z.object({
      field: IdentifierSchema,
      message: z.string(),
    }),
  ),
});

export const ServerEnvSchema = z.object({
  CATALOG_API_URL: z.url(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type VideoList = z.infer<typeof VideoListSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobList = z.infer<typeof JobListSchema>;
export type Audience = z.infer<typeof AudienceSchema>;
export type AudienceList = z.infer<typeof AudienceListSchema>;
export type Headset = z.infer<typeof HeadsetSchema>;
export type HeadsetList = z.infer<typeof HeadsetListSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionList = z.infer<typeof SessionListSchema>;
export type CreateSession = z.infer<typeof CreateSessionSchema>;
export type SessionDraft = z.infer<typeof SessionDraftSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ServerEnv = z.infer<typeof ServerEnvSchema>;
