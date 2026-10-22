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
    const thumbnail = await getCatalogueClient().getThumbnail(params.id);
    return new Response(thumbnail.body, {
      headers: {
        'Content-Type': thumbnail.contentType,
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return toBffErrorResponse(error);
  }
};
