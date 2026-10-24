import {
  ApiErrorSchema,
  HeadsetListSchema,
  SessionListSchema,
  SessionSchema,
  ValidationErrorSchema,
  type CreateSession,
  type HeadsetList,
  type Session,
  type SessionList,
  type ValidationError,
} from '../../lib/api/schemas';

export interface SessionsOverview {
  sessions: SessionList;
  headsets: HeadsetList;
}

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

async function fetchJson(input: string, signal?: AbortSignal) {
  let response: Response;

  try {
    response = await fetch(input, { signal });
  } catch {
    throw new Error('Les séances enregistrées ne peuvent pas être chargées.');
  }

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error('Les séances enregistrées ne peuvent pas être chargées.');
  }

  return body;
}

export async function fetchSessionsOverview(
  signal?: AbortSignal,
): Promise<SessionsOverview> {
  const [sessionsBody, headsetsBody] = await Promise.all([
    fetchJson('/api/sessions', signal),
    fetchJson('/api/headsets', signal),
  ]);
  const sessions = SessionListSchema.safeParse(sessionsBody);
  const headsets = HeadsetListSchema.safeParse(headsetsBody);

  if (!sessions.success) {
    throw new Error('La réponse des séances enregistrées est invalide.');
  }
  if (!headsets.success) {
    throw new Error('La réponse des casques VR est invalide.');
  }

  return { sessions: sessions.data, headsets: headsets.data };
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
      'L’enregistrement n’a pas pu être confirmé. Votre séance en cours est conservée. Consultez Mes séances avant de réessayer.',
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
        : 'La séance n’a pas pu être enregistrée. Votre séance en cours est conservée. Réessayez dans quelques instants.',
    );
  }

  const session = SessionSchema.safeParse(body);
  if (!session.success) {
    throw new SessionSaveError(
      'L’enregistrement n’a pas pu être confirmé. Votre séance en cours est conservée. Consultez Mes séances avant de réessayer.',
    );
  }

  return session.data;
}
