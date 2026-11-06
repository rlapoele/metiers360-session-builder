import type { APIRoute } from 'astro';

import { handleCatalogueRetry } from '@features/catalogue/search-http.server';

export const POST: APIRoute = ({ request, url }) =>
  handleCatalogueRetry(request, url);
