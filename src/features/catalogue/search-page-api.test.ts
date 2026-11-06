import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCataloguePage } from '@features/catalogue/search-page-api';
const page = {
  data: [],
  meta: { page: 1, per_page: 24, total: 0, total_pages: 1 },
  context: {
    criteria: { selected: [] },
    references: {
      jobs: { data: [], source: 'test' },
      audiences: { data: [] },
      headsets: { data: [] },
    },
  },
};
afterEach(() => vi.unstubAllGlobals());
describe('validated browser page boundary', () => {
  it('requests opt-in metadata with cancellation and preserves recognized query values', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(page)),
    );
    vi.stubGlobal('fetch', fetcher);
    const signal = new AbortController().signal;
    expect(
      await fetchCataloguePage(
        new URLSearchParams('title=omar&title=hugo'),
        signal,
      ),
    ).toEqual({ status: 200, body: page });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/catalogue/search?title=omar&title=hugo&include=context',
      { signal },
    );
  });
  it('retains validation/preparation failures as states, not successful empty results', async () => {
    const invalid = {
      error: 'validation_error',
      message: 'Invalide',
      details: [],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(invalid), { status: 400 })),
    );
    expect(await fetchCataloguePage(new URLSearchParams())).toEqual({
      status: 400,
      body: invalid,
    });
    const preparing = {
      error: 'catalogue_preparing',
      status: 'preparing',
      attempt: 1,
      message: 'Préparation',
      canRetry: false,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify(preparing), { status: 503 }),
      ),
    );
    expect(await fetchCataloguePage(new URLSearchParams())).toMatchObject({
      status: 503,
      retryAfter: 1,
      body: { status: 'preparing' },
    });
  });
  it('rejects malformed metadata and unexpected upstream/error content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ data: [], meta: page.meta })),
      ),
    );
    await expect(fetchCataloguePage(new URLSearchParams())).rejects.toThrow(
      'catalogue',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'private secret' }), {
            status: 500,
          }),
      ),
    );
    await expect(fetchCataloguePage(new URLSearchParams())).rejects.not.toThrow(
      'private secret',
    );
  });
});
