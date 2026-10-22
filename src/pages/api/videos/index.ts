import type { APIRoute } from 'astro';

import {
  filterVideoSearchParams,
  jsonResponse,
  toBffErrorResponse,
} from '../../../lib/api/bff.server';
import { getCatalogueClient } from '../../../lib/api/catalogue-client-instance.server';

export const GET: APIRoute = async ({ url }) => {
  try {
    return jsonResponse(
      await getCatalogueClient().listVideos(filterVideoSearchParams(url)),
    );
  } catch (error) {
    return toBffErrorResponse(error);
  }
};
