import type { APIRoute } from 'astro';

import { jsonResponse, toBffErrorResponse } from '../../../lib/api/bff.server';
import { getCatalogueClient } from '../../../lib/api/catalogue-client-instance.server';

export const GET: APIRoute = async ({ params }) => {
  if (!params.id)
    return jsonResponse(
      { error: 'invalid_parameter', message: 'Identifiant vidéo manquant.' },
      400,
    );

  try {
    return jsonResponse(await getCatalogueClient().getVideo(params.id));
  } catch (error) {
    return toBffErrorResponse(error);
  }
};
