import { jsonResponse } from '@lib/api/bff.server';
import { getSaveOperationRegistry } from '@features/sessions/save-operation-runtime.server';
import {
  SaveOperationIdSchema,
  SaveOperationRequestSchema,
} from '@features/sessions/save-operation-contracts';

function response(body: unknown, status: number, location?: string) {
  const result = jsonResponse(body, status);
  result.headers.set('Cache-Control', 'no-store');
  if (location) result.headers.set('Location', location);
  return result;
}

export async function startSaveOperation(request: Request) {
  const registry = getSaveOperationRegistry();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return response(
      {
        runtime_id: registry.runtimeId,
        error: 'invalid_json',
        message: 'Le corps de la requête n’est pas un JSON valide.',
      },
      400,
    );
  }
  const parsed = SaveOperationRequestSchema.safeParse(input);
  if (!parsed.success)
    return response(
      {
        runtime_id: registry.runtimeId,
        error: 'validation_error',
        message: 'La demande d’enregistrement est invalide.',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'request',
          message: issue.message,
        })),
      },
      422,
    );
  const result = registry.start(parsed.data);
  return response(
    result.body,
    result.status,
    result.status < 300
      ? `/api/session-save-operations/${parsed.data.operation_id}`
      : undefined,
  );
}

export function readSaveOperation(id: string | undefined) {
  const registry = getSaveOperationRegistry();
  const parsed = SaveOperationIdSchema.safeParse(id);
  if (!parsed.success)
    return response(
      {
        runtime_id: registry.runtimeId,
        error: 'invalid_parameter',
        message: 'L’identifiant d’enregistrement est invalide.',
      },
      400,
    );
  const result = registry.get(parsed.data);
  return response(result.body, result.status);
}
