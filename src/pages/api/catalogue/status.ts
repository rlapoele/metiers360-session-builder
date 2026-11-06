import type { APIRoute } from 'astro';

import {
  handleCatalogueRequest,
  statusRetryAfter,
} from '@features/catalogue/search-http.server';

export const GET: APIRoute = () =>
  handleCatalogueRequest((service) => {
    const result = service.status();
    return { ...result, ...statusRetryAfter(result.body) };
  });
