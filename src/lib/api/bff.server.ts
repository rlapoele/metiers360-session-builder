import { CatalogueClientError } from '@lib/api/errors';
import { CreateSessionSchema, type ValidationError } from '@lib/api/schemas';

const VIDEO_SEARCH_PARAMETERS = [
  'q',
  'job',
  'headset',
  'audience',
  'page',
  'per_page',
] as const;

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function filterVideoSearchParams(url: URL) {
  const filtered = new URLSearchParams();
  for (const name of VIDEO_SEARCH_PARAMETERS) {
    const value = url.searchParams.get(name);
    if (value !== null) filtered.set(name, value);
  }
  return filtered;
}

export function toBffErrorResponse(error: unknown) {
  if (!(error instanceof CatalogueClientError)) {
    return jsonResponse(
      {
        error: 'internal_error',
        message: 'Une erreur inattendue est survenue. Vous pouvez réessayer.',
      },
      500,
    );
  }

  if (error.kind === 'upstream' && error.upstream) {
    return jsonResponse(error.upstream, error.status);
  }

  const publicErrors = {
    configuration: {
      error: 'configuration_error',
      message: 'Le service catalogue est temporairement indisponible.',
    },
    'invalid-response': {
      error: 'invalid_response',
      message:
        'Le service catalogue a renvoyé une réponse invalide. Vous pouvez réessayer.',
    },
    timeout: {
      error: 'timeout',
      message:
        'Le service catalogue met trop de temps à répondre. Vous pouvez réessayer.',
    },
    transport: {
      error: 'service_unavailable',
      message:
        'Le service catalogue est temporairement indisponible. Vous pouvez réessayer.',
    },
    upstream: {
      error: 'upstream_error',
      message:
        'Le service catalogue a refusé la requête. Vous pouvez réessayer.',
    },
  } satisfies Record<typeof error.kind, { error: string; message: string }>;

  return jsonResponse(publicErrors[error.kind], error.status);
}

export async function validateCreateSessionRequest(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return {
      success: false as const,
      response: jsonResponse(
        {
          error: 'invalid_json',
          message: "Le corps de la requête n'est pas un JSON valide.",
        },
        400,
      ),
    };
  }

  const result = CreateSessionSchema.safeParse(input);
  if (result.success) return { success: true as const, data: result.data };

  const body: ValidationError = {
    error: 'validation_error',
    message: 'La séance est invalide.',
    details: result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      message: issue.message,
    })),
  };

  return { success: false as const, response: jsonResponse(body, 422) };
}
