import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchKeywordSuggestions,
  keywordSuggestionParams,
  KeywordSuggestionError,
} from '@features/catalogue/keyword-suggestions';

afterEach(() => vi.unstubAllGlobals());
describe('keyword suggestion client boundary', () => {
  it('encodes category identities and selected source keys without display labels', () => {
    const params = keywordSuggestionParams({
      term: 'jard',
      selected: [
        {
          category: 'job',
          key: 'A1203',
          jobCode: 'A1203',
          sourceKey: 'appellation/jardinier municipal',
          label: 'Selected label',
          jobLabel: 'Canonical',
        },
        { category: 'title', key: 'omar', label: 'Omar' },
      ],
      audience: 'college',
      headset: 'pico-4',
      legacyQuery: 'Omar',
    });
    expect(params.get('jobTerm')).toBe('A1203:appellation/jardinier municipal');
    expect(params.get('title')).toBe('omar');
    expect(params.get('q')).toBe('Omar');
    expect(params.get('audience')).toBe('college');
    expect(params.get('headset')).toBe('pico-4');
    expect(params.toString()).not.toContain('Selected');
  });
  it('validates responses and forwards cancellation to fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              category: 'title',
              key: 'omar',
              label: 'Omar',
              availability: { count: 1, available: true },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const signal = new AbortController().signal;
    expect(
      await fetchKeywordSuggestions(
        new URLSearchParams({ term: 'om' }),
        signal,
      ),
    ).toEqual([
      {
        category: 'title',
        key: 'omar',
        label: 'Omar',
        availability: { count: 1, available: true },
      },
    ]);
    expect(fetcher.mock.calls[0]?.[1]).toEqual({ signal });
    fetcher.mockResolvedValue(new Response('{}'));
    await expect(
      fetchKeywordSuggestions(new URLSearchParams()),
    ).rejects.toThrow('invalide');
  });
  it.each([
    undefined,
    { count: -1, available: false },
    { count: 0, available: true },
    { count: 1, available: false },
    { count: 1.5, available: true },
  ])(
    'rejects missing or inconsistent availability metadata: %j',
    async (availability) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                data: [
                  {
                    category: 'title',
                    key: 'omar',
                    label: 'Omar',
                    availability,
                  },
                ],
              }),
            ),
        ),
      );
      await expect(
        fetchKeywordSuggestions(new URLSearchParams('term=om')),
      ).rejects.toThrow('invalide');
    },
  );
  it('distinguishes preparation from empty suggestions without exposing error content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'catalogue_preparing',
            status: 'preparing',
            attempt: 1,
            message: 'Préparation',
            canRetry: false,
          }),
          { status: 503 },
        ),
      ),
    );
    await expect(
      fetchKeywordSuggestions(new URLSearchParams()),
    ).rejects.toMatchObject({ preparation: { status: 'preparing' } });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ secret: 'private' }), { status: 500 }),
        ),
    );
    await expect(
      fetchKeywordSuggestions(new URLSearchParams()),
    ).rejects.toBeInstanceOf(KeywordSuggestionError);
    await expect(
      fetchKeywordSuggestions(new URLSearchParams()),
    ).rejects.not.toThrow('private');
  });
});
