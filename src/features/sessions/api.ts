import {
  ApiErrorSchema,
  SessionSchema,
  ValidationErrorSchema,
  type CreateSession,
  type Session,
  type ValidationError,
} from '../../lib/api/schemas';

export class SessionSaveError extends Error {
  readonly fieldErrors: ValidationError['details'];

  constructor(message: string, fieldErrors: ValidationError['details'] = []) {
    super(message);
    this.name = 'SessionSaveError';
    this.fieldErrors = fieldErrors;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

export async function createSession(
  request: CreateSession,
  signal?: AbortSignal,
): Promise<Session> {
  let response: Response;

  try {
    response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    throw new SessionSaveError(
      'La séance n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.',
    );
  }

  const body = await readJson(response);

  if (!response.ok) {
    const validationError = ValidationErrorSchema.safeParse(body);
    if (validationError.success) {
      throw new SessionSaveError(
        'Certaines informations doivent être corrigées avant l’enregistrement.',
        validationError.data.details,
      );
    }

    const apiError = ApiErrorSchema.safeParse(body);
    throw new SessionSaveError(
      apiError.success && apiError.data.error === 'validation_error'
        ? 'Certaines informations doivent être corrigées avant l’enregistrement.'
        : 'La séance n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.',
    );
  }

  const session = SessionSchema.safeParse(body);
  if (!session.success) {
    throw new SessionSaveError(
      'La confirmation de l’enregistrement est invalide.',
    );
  }

  return session.data;
}
