import type { APIRoute } from 'astro';

import { jsonResponse, toBffErrorResponse } from '@lib/api/bff.server';
import { getCatalogueClient } from '@lib/api/catalogue-client-instance.server';

export const GET: APIRoute = async ({ params }) => {
  if (!params.code)
    return jsonResponse(
      { error: 'invalid_parameter', message: 'Code métier manquant.' },
      400,
    );

  try {
    return jsonResponse(await getCatalogueClient().getJob(params.code));
  } catch (error) {
    return toBffErrorResponse(error);
  }
};
