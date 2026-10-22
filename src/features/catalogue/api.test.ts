import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCatalogueReferences, fetchVideos } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('catalogue browser API', () => {
  it('requests videos with only active supported query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: { page: 2, per_page: 24, total: 0, total_pages: 1 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchVideos({
      q: 'santé',
      job: '',
      headset: 'pico-4',
      audience: '',
      page: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/videos?q=sant%C3%A9&headset=pico-4&page=2',
      expect.objectContaining({ signal: undefined }),
    );
  });

  it('accepts the same-origin thumbnail paths returned by the BFF', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'vid_001',
                title: 'Une journée avec Omar',
                description: 'Immersion.',
                duration_seconds: 455,
                jobs: ['A1203'],
                audiences: ['college'],
                compatible_headsets: ['pico-4'],
                thumbnail_url: '/api/thumbnails/vid_001.svg',
                published_at: '2024-04-11',
              },
            ],
            meta: { page: 1, per_page: 24, total: 1, total_pages: 1 },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchVideos({
      q: '',
      job: '',
      headset: '',
      audience: '',
      page: 1,
    });

    expect(result.data[0]?.thumbnail_url).toBe('/api/thumbnails/vid_001.svg');
  });

  it('turns a failed response into a concise recoverable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'upstream_error',
            message: 'Le service du catalogue est temporairement indisponible.',
          }),
          { status: 503 },
        ),
      ),
    );

    await expect(
      fetchVideos({ q: '', job: '', headset: '', audience: '', page: 1 }),
    ).rejects.toThrow(
      'Le service du catalogue est temporairement indisponible.',
    );
  });

  it('rejects a successful response that does not match the runtime schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: 'not-an-array' }), {
          status: 200,
        }),
      ),
    );

    await expect(
      fetchVideos({ q: '', job: '', headset: '', audience: '', page: 1 }),
    ).rejects.toThrow('La réponse du catalogue est invalide.');
  });

  it('loads and validates all filter reference lists', async () => {
    const responses = new Map([
      [
        '/api/jobs',
        {
          data: [],
          source: 'ROME 4.0',
        },
      ],
      ['/api/headsets', { data: [{ id: 'pico-4', name: 'Pico 4' }] }],
      ['/api/audiences', { data: [{ id: 'college', label: 'Collégien·nes' }] }],
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) =>
        Promise.resolve(
          new Response(JSON.stringify(responses.get(String(input))), {
            status: 200,
          }),
        ),
      ),
    );

    const references = await fetchCatalogueReferences();

    expect(references.headsets.data[0]?.name).toBe('Pico 4');
    expect(references.audiences.data[0]?.label).toBe('Collégien·nes');
  });
});
