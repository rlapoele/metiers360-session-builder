import type { APIRoute } from 'astro';

import { handleCatalogueRequest } from '@features/catalogue/search-http.server';

export const GET: APIRoute = ({ url }) =>
  handleCatalogueRequest((service) =>
    url.searchParams.get('include') === 'context'
      ? service.page(url.searchParams)
      : service.search(url.searchParams),
  );
