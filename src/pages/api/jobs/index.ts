import type { APIRoute } from 'astro';

import { jsonResponse, toBffErrorResponse } from '@lib/api/bff.server';
import { getCatalogueClient } from '@lib/api/catalogue-client-instance.server';

export const GET: APIRoute = async () => {
  try {
    return jsonResponse(await getCatalogueClient().listJobs());
  } catch (error) {
    return toBffErrorResponse(error);
  }
};
