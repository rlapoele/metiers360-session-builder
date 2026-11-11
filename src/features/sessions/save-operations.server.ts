import { toBffErrorResponse } from '@lib/api/bff.server';
import type { CreateSession, Session } from '@lib/api/schemas';
import {
  SaveOperationFailureSchema,
  type SaveOperation,
  type SaveOperationRequest,
} from '@features/sessions/save-operation-contracts';

/** One process owns admission and completion; browser abort signals never own this work. */
export function createSaveOperationRegistry(
  save: (input: CreateSession) => Promise<Session>,
  { capacity = 1000 } = {},
) {
  const runtimeId = crypto.randomUUID();
  const entries = new Map<
    string,
    { fingerprint: string; operation: SaveOperation }
  >();
  const draftOperations = new Map<string, string>();

  function error(
    status: number,
    code: string,
    message: string,
    operation?: SaveOperation,
  ) {
    return {
      status,
      body: {
        runtime_id: runtimeId,
        error: code,
        message,
        ...(operation ? { operation: structuredClone(operation) } : {}),
      },
    };
  }
  function result(operation: SaveOperation, starting = false) {
    return {
      status: starting && operation.status === 'pending' ? 202 : 200,
      body: structuredClone(operation),
    };
  }
  function get(id: string) {
    const entry = entries.get(id);
    return entry
      ? result(entry.operation)
      : error(
          404,
          'operation_unknown',
          'Cet enregistrement est inconnu de ce processus. Son résultat ne peut pas être confirmé.',
        );
  }
  function start(request: SaveOperationRequest) {
    // Capture a canonical immutable snapshot, including ordered video IDs.
    const input = structuredClone(request);
    if (input.expected_runtime_id && input.expected_runtime_id !== runtimeId)
      return error(
        409,
        'runtime_changed',
        'Le suivi précédent a été perdu. Le résultat de cet enregistrement ne peut pas être confirmé.',
      );
    const fingerprint = JSON.stringify([
      input.client_id,
      input.draft_id,
      input.revision,
      input.session.name,
      input.session.video_ids,
      input.session.headset_id,
    ]);
    const existing = entries.get(input.operation_id);
    if (existing) {
      return existing.fingerprint === fingerprint
        ? result(existing.operation, true)
        : error(
            409,
            'operation_conflict',
            'Cet identifiant d’enregistrement correspond à une autre demande.',
          );
    }
    const draftKey = JSON.stringify([input.client_id, input.draft_id]);
    const previousId = draftOperations.get(draftKey);
    const previous = previousId
      ? entries.get(previousId)?.operation
      : undefined;
    if (previous && previous.status !== 'failed')
      return error(
        409,
        previous.status === 'pending'
          ? 'draft_already_saving'
          : 'draft_already_saved',
        'Ce brouillon possède déjà un enregistrement en cours ou terminé.',
        previous,
      );
    if (entries.size >= capacity)
      return error(
        503,
        'operation_capacity',
        'Le suivi des enregistrements est plein. Aucune nouvelle demande n’a été envoyée.',
      );

    const operation: SaveOperation = {
      runtime_id: runtimeId,
      client_id: input.client_id,
      operation_id: input.operation_id,
      draft_id: input.draft_id,
      revision: input.revision,
      status: 'pending',
    };
    const entry: { fingerprint: string; operation: SaveOperation } = {
      fingerprint,
      operation,
    };
    // Admission is synchronous: no second request can slip past an awaited save.
    entries.set(input.operation_id, entry);
    draftOperations.set(draftKey, input.operation_id);
    void Promise.resolve()
      .then(() => save(input.session))
      .then(
        (session) => {
          entry.operation = { ...operation, status: 'succeeded', session };
        },
        async (cause: unknown) => {
          const response = toBffErrorResponse(cause);
          const body: unknown = await response.json();
          entry.operation = {
            ...operation,
            status: 'failed',
            failure: SaveOperationFailureSchema.parse({
              http_status: response.status,
              body,
            }),
          };
        },
      );
    return result(operation, true);
  }
  return { runtimeId, get, start };
}
