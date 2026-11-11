import * as z from 'zod';

import {
  ApiErrorSchema,
  CreateSessionSchema,
  SessionSchema,
  ValidationErrorSchema,
} from '@lib/api/schemas';

export const SaveOperationIdSchema = z.uuid();
export const SaveOperationRequestSchema = z
  .object({
    operation_id: SaveOperationIdSchema,
    client_id: z.uuid(),
    draft_id: z.string().min(1).max(128),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    session: CreateSessionSchema.transform((session) => ({
      ...session,
      headset_id: session.headset_id ?? null,
    })),
  })
  .strict();
export type SaveOperationRequest = z.infer<typeof SaveOperationRequestSchema>;

export const SaveOperationFailureSchema = z.object({
  http_status: z.number().int().min(400).max(599),
  body: z.union([ValidationErrorSchema, ApiErrorSchema]),
});
const identity = {
  client_id: z.uuid(),
  runtime_id: z.uuid(),
  operation_id: SaveOperationIdSchema,
  draft_id: z.string().min(1).max(128),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
};
export const SaveOperationSchema = z.discriminatedUnion('status', [
  z.object({ ...identity, status: z.literal('pending') }),
  z.object({
    ...identity,
    status: z.literal('succeeded'),
    session: SessionSchema,
  }),
  z.object({
    ...identity,
    status: z.literal('failed'),
    failure: SaveOperationFailureSchema,
  }),
]);
export type SaveOperation = z.infer<typeof SaveOperationSchema>;
