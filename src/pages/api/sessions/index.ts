import type { APIRoute } from 'astro';

import {
  jsonResponse,
  toBffErrorResponse,
  validateCreateSessionRequest,
} from '../../../lib/api/bff.server';
import { getCatalogueClient } from '../../../lib/api/catalogue-client-instance.server';

export const GET: APIRoute = async () => {
  try {
    return jsonResponse(await getCatalogueClient().listSessions());
  } catch (error) {
    return toBffErrorResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const validation = await validateCreateSessionRequest(request);
  if (!validation.success) return validation.response;

  try {
    return jsonResponse(
      await getCatalogueClient().createSession(validation.data),
      201,
    );
  } catch (error) {
    return toBffErrorResponse(error);
  }
};
