import type { APIRoute } from 'astro';

import { handleCatalogueRequest } from '@features/catalogue/search-http.server';

export const GET: APIRoute = ({ url }) =>
  handleCatalogueRequest((service) => service.suggestions(url.searchParams));
