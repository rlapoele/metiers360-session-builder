import { describe, expect, it, vi } from 'vitest';

import { createCatalogueClient } from './catalogue-client.server';
import { CatalogueClientError } from './errors';

const video = {
  id: 'vid_001',
  title: 'Une journée avec Omar, jardinier municipal',
  description: "Immersion aux côtés d'Omar.",
  duration_seconds: 455,
  jobs: ['A1203'],
  audiences: ['adultes-reconversion'],
  compatible_headsets: ['pico-4'],
  thumbnail_url: 'http://catalogue.internal/thumbnails/vid_001.svg',
  published_at: '2024-04-11',
};

describe('createCatalogueClient', () => {
  it('validates a video list, forwards filters and rewrites thumbnail URLs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: [video],
        meta: { page: 2, per_page: 24, total: 25, total_pages: 2 },
      }),
    );
    const client = createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
    });

    const result = await client.listVideos(
      new URLSearchParams({ q: 'jardinier', page: '2' }),
    );

    expect(result.data[0]?.thumbnail_url).toBe('/api/thumbnails/vid_001.svg');
    expect(fetcher).toHaveBeenCalledWith(
      'http://catalogue.internal/videos?q=jardinier&page=2',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('preserves an upstream validation status and field details', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          error: 'validation_error',
          message: 'Invalid session.',
          details: [{ field: 'name', message: 'Le nom est obligatoire.' }],
        },
        { status: 422 },
      ),
    );
    const client = createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
    });

    const error = await client
      .createSession({
        name: 'Atelier',
        video_ids: ['vid_001'],
        headset_id: null,
      })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(CatalogueClientError);
    expect(error).toMatchObject({ kind: 'upstream', status: 422 });
    expect((error as CatalogueClientError).upstream).toMatchObject({
      error: 'validation_error',
      details: [{ field: 'name' }],
    });
  });

  it('normalises an invalid success payload as a contract failure', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: [{ ...video, duration_seconds: '455' }],
        meta: {},
      }),
    );
    const client = createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
    });

    await expect(client.listVideos()).rejects.toMatchObject({
      kind: 'invalid-response',
      status: 502,
    });
  });

  it('normalises a rejected fetch as a recoverable transport failure', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('fetch failed'));
    const client = createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
    });

    await expect(client.listHeadsets()).rejects.toMatchObject({
      kind: 'transport',
      status: 503,
    });
  });

  it('aborts a request that exceeds the configured timeout', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const client = createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
      timeoutMs: 1,
    });

    await expect(client.listAudiences()).rejects.toMatchObject({
      kind: 'timeout',
      status: 504,
    });
  });

  it('accepts only SVG thumbnail responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>', {
        headers: { 'Content-Type': 'image/svg+xml' },
      }),
    );
    const client = createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
    });

    const thumbnail = await client.getThumbnail('vid_001');

    expect(thumbnail.contentType).toBe('image/svg+xml');
    expect(new TextDecoder().decode(thumbnail.body)).toContain('<svg');
  });
});
