import { CATALOG_API_URL } from 'astro:env/server';

import { createCatalogueClient } from '@lib/api/catalogue-client.server';
import { parseServerEnv } from '@lib/api/server-config';

let client: ReturnType<typeof createCatalogueClient> | undefined;

export function getCatalogueClient() {
  if (client) return client;

  const config = parseServerEnv({ CATALOG_API_URL });
  client = createCatalogueClient({ baseUrl: config.CATALOG_API_URL });
  return client;
}
