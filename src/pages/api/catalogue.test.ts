import type { APIContext } from 'astro';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as search } from '@pages/api/catalogue/search';
import { GET as suggestions } from '@pages/api/catalogue/suggestions';
import { GET as status } from '@pages/api/catalogue/status';
import { POST as retry } from '@pages/api/catalogue/retry';
import {
  CatalogueStatusSchema,
  CatalogueUnavailableSchema,
} from '@features/catalogue/search-contracts';
import { buildSearchDictionary } from '@features/catalogue/search-dictionary.server';
import { createCataloguePreparation } from '@features/catalogue/search-preparation.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import { CatalogueClientError } from '@lib/api/errors';

vi.mock('@features/catalogue/search-runtime.server', () => ({
  getCatalogueRuntime: () => runtime,
}));
const snapshot: CatalogueSnapshot = {
  videos: [],
  jobs: { data: [], source: 'test' },
  audiences: { data: [] },
  headsets: { data: [] },
};
let fail = false;
const loadSnapshot = vi.fn(async () => {
  if (fail)
    throw new CatalogueClientError({
      kind: 'configuration',
      status: 503,
      message: 'secret upstream URL',
    });
  return snapshot;
});
let runtime = createRuntime();
function createRuntime() {
  return createCataloguePreparation({
    loadSnapshot,
    buildDictionary: buildSearchDictionary,
    reportFailure: () => {},
  });
}
function context(path = '', method = 'GET', body?: string) {
  const request = new Request(`http://localhost:4321/api/catalogue/${path}`, {
    method,
    body,
  });
  return { request, url: new URL(request.url) } as APIContext;
}
beforeEach(() => {
  runtime.shutdown();
  fail = false;
  loadSnapshot.mockClear();
  runtime = createRuntime();
});

async function response(value: ReturnType<typeof search>) {
  const result = await value;
  if (!(result instanceof Response)) throw new Error('Missing response');
  expect(result.headers.get('content-type')).toContain('application/json');
  expect(result.headers.get('cache-control')).toBe('no-store');
  return result;
}

describe('catalogue HTTP boundary', () => {
  it('exposes readiness without starting preparation or leaking process state', async () => {
    const result = await response(status(context('status')));
    expect(result.status).toBe(200);
    const body: unknown = await result.json();
    CatalogueStatusSchema.parse(body);
    expect(body).toMatchObject({ status: 'failed', canRetry: false });
    expect(loadSnapshot).not.toHaveBeenCalled();
  });

  it('returns preparing 503 with Retry-After, then the normal list/suggestion envelopes', async () => {
    const pending = runtime.start();
    for (const handler of [search, suggestions]) {
      const result = await response(handler(context('search')));
      expect(result.status).toBe(503);
      expect(result.headers.get('retry-after')).toBe('1');
      CatalogueUnavailableSchema.parse(await result.json());
      // A fresh cycle is needed because awaiting HTTP processing lets the first finish.
      await pending;
      runtime.shutdown();
      runtime = createRuntime();
      runtime.start();
    }
    await runtime.start();
    const result = await response(search(context('search')));
    expect(await result.json()).toEqual({
      data: [],
      meta: { page: 1, per_page: 24, total: 0, total_pages: 1 },
    });
    expect(
      await (
        await response(suggestions(context('suggestions?term=omar')))
      ).json(),
    ).toEqual({ data: [] });
  });

  it('returns French validation errors without reflecting untrusted criteria', async () => {
    await runtime.start();
    const result = await response(search(context('search?title=%3Cscript%3E')));
    expect(result.status).toBe(400);
    const text = await result.text();
    expect(text).toContain('validation_error');
    expect(text).not.toContain('<script>');
  });

  it('accepts an empty POST stream supplied by the Node adapter', async () => {
    await runtime.start();
    const request = new Request('http://localhost:4321/api/catalogue/retry', {
      method: 'POST',
      body: '',
    });
    expect(request.body).not.toBeNull();
    expect(
      (
        await response(
          retry({ request, url: new URL(request.url) } as APIContext),
        )
      ).status,
    ).toBe(200);
  });

  it('offers nonblocking manual recovery and refuses body/query configuration', async () => {
    fail = true;
    await runtime.start();
    const failed = await response(search(context('search')));
    expect(failed.status).toBe(503);
    expect(failed.headers.has('retry-after')).toBe(false);
    expect(await failed.text()).not.toContain('secret');
    for (const ctx of [
      context('retry?url=https://example.com', 'POST'),
      context('retry', 'POST', '{"url":"https://example.com"}'),
    ]) {
      expect((await response(retry(ctx))).status).toBe(400);
    }
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    fail = false;
    const result = await response(retry(context('retry', 'POST')));
    expect(result.status).toBe(202);
    expect(result.headers.get('retry-after')).toBe('1');
    await runtime.retry();
    expect((await response(retry(context('retry', 'POST')))).status).toBe(200);
    expect(loadSnapshot).toHaveBeenCalledTimes(2);
  });
});
