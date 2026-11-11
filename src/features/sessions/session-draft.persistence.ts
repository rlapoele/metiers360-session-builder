import * as z from 'zod';

import { SessionDraftSchema, type SessionDraft } from '@lib/api/schemas';

import {
  SaveOperationRequestSchema,
  SaveOperationSchema,
} from '@features/sessions/save-operation-contracts';

export const DraftSaveSchema = z
  .object({
    request: SaveOperationRequestSchema.extend({
      expected_runtime_id: z.uuid(),
    }),
    started_at: z.number().int().nonnegative(),
    uncertain: z.enum(['network', 'runtime', 'storage']).optional(),
    result: SaveOperationSchema.optional(),
  })
  .superRefine((save, ctx) => {
    const result = save.result;
    if (
      result &&
      (result.operation_id !== save.request.operation_id ||
        result.client_id !== save.request.client_id ||
        result.draft_id !== save.request.draft_id ||
        result.revision !== save.request.revision ||
        result.runtime_id !== save.request.expected_runtime_id)
    )
      ctx.addIssue({ code: 'custom', message: 'Mismatched save result' });
    if (save.uncertain && result && result.status !== 'pending')
      ctx.addIssue({
        code: 'custom',
        message: 'Terminal results cannot be uncertain',
      });
  });
export type DraftSave = z.infer<typeof DraftSaveSchema>;
export function isDraftSaveLocked(save?: DraftSave) {
  return Boolean(save && (!save.result || save.result.status === 'pending'));
}

// Keep the existing key: one atomic storage write replaces the whole envelope.
export const SESSION_DRAFT_STORAGE_KEY = 'metiers360.session-draft.v1';
export const SESSION_DRAFT_LOCK = 'metiers360.session-draft';
export const EMPTY_SESSION_DRAFT: SessionDraft = {
  version: 1,
  name: '',
  video_ids: [],
  headset_id: null,
};

export const PersistedSessionDraftSchema = z
  .object({
    version: z.literal(2),
    draft_id: z.string().min(1),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    draft: SessionDraftSchema,
    client_id: z.uuid().optional(),
    save: DraftSaveSchema.optional(),
  })
  .strict();
export type PersistedSessionDraft = z.infer<typeof PersistedSessionDraftSchema>;

export function emptyDraftRecord(): PersistedSessionDraft {
  return {
    version: 2,
    draft_id: 'initial',
    revision: 0,
    draft: { ...EMPTY_SESSION_DRAFT },
  };
}

/** Validate storage once. Legacy records migrate on the next local write. */
export function parsePersistedDraft(
  raw: string,
): PersistedSessionDraft | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    const current = PersistedSessionDraftSchema.safeParse(value);
    if (current.success) return current.data;
    const legacy = SessionDraftSchema.safeParse(value);
    if (legacy.success)
      return {
        version: 2,
        draft_id: 'legacy',
        revision: 0,
        draft: legacy.data,
      };
  } catch {
    // Invalid incoming data cannot replace a valid in-memory draft.
  }
}
