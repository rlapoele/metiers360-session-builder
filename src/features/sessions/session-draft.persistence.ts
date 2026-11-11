import * as z from 'zod';

import { SessionDraftSchema, type SessionDraft } from '@lib/api/schemas';

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
