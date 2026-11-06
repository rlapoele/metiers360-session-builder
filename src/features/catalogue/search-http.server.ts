import type { CatalogueStatus } from '@features/catalogue/search-contracts';
import { invalidSearch } from '@features/catalogue/search-query.server';
import { getCatalogueRuntime } from '@features/catalogue/search-runtime.server';
import { createCatalogueSearchService } from '@features/catalogue/search-service.server';
import { jsonResponse, toBffErrorResponse } from '@lib/api/bff.server';

/** Retrieve the startup-owned instance, also callable directly by future SSR loaders. */
export function getCatalogueSearchService() {
  return createCatalogueSearchService(getCatalogueRuntime());
}

interface HttpResult {
  status: number;
  body: unknown;
  retryAfter?: number;
}
export function catalogueResponse(result: HttpResult) {
  const response = jsonResponse(result.body, result.status);
  response.headers.set('Cache-Control', 'no-store');
  if (result.retryAfter)
    response.headers.set('Retry-After', String(result.retryAfter));
  return response;
}

export function handleCatalogueRequest(
  action: (service: ReturnType<typeof getCatalogueSearchService>) => HttpResult,
) {
  try {
    return catalogueResponse(action(getCatalogueSearchService()));
  } catch (error) {
    const response = toBffErrorResponse(error);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}

export function statusRetryAfter(body: CatalogueStatus) {
  return body.status === 'preparing' ? { retryAfter: 1 } : {};
}

async function hasRequestContent(request: Request) {
  if (!request.body) return false;
  const reader = request.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      if (value.byteLength > 0) {
        // Do not buffer arbitrary input just to reject it.
        void reader.cancel().catch(() => {});
        return true;
      }
    }
  } catch {
    return true;
  } finally {
    reader.releaseLock();
  }
}

export async function handleCatalogueRetry(request: Request, url: URL) {
  // Recovery is bodyless: it cannot select upstream URLs or mutate cache contents.
  if (url.search || (await hasRequestContent(request)))
    return catalogueResponse({
      status: 400,
      body: invalidSearch(
        'request',
        'Réessayez sans paramètre ni contenu de requête.',
      ),
    });
  return handleCatalogueRequest((service) => {
    const result = service.retry();
    return { ...result, ...statusRetryAfter(result.body) };
  });
}
