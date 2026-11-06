import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCataloguePreparation } from '@features/catalogue/search-preparation.server';
import { loadCatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import { createCatalogueClient } from '@lib/api/catalogue-client.server';
import type { Video } from '@lib/api/schemas';

const video: Video = {
  id: 'vid_001',
  title: 'Une journée avec Omar, jardinier municipal',
  description: 'Description originale.',
  duration_seconds: 455,
  jobs: ['A1203'],
  audiences: ['college'],
  compatible_headsets: ['pico-4'],
  thumbnail_url: 'http://catalogue.internal/thumbnails/vid_001.svg',
  published_at: '2024-04-11',
};

function source(total = 101) {
  const videos = Array.from({ length: total }, (_, index) => ({
    ...video,
    id: `vid_${String(index + 1).padStart(3, '0')}`,
  }));
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/videos') {
      const page = Number(url.searchParams.get('page'));
      return Response.json({
        data: videos.slice((page - 1) * 100, page * 100),
        meta: {
          page,
          per_page: 100,
          total,
          total_pages: Math.max(1, Math.ceil(total / 100)),
        },
      });
    }
    if (url.pathname === '/jobs')
      return Response.json({
        source: 'Catalogue source',
        data: [
          {
            code: 'A1203',
            label: 'Jardinier',
            appellations: ['Jardinier municipal'],
            major_domain: { code: 'A', label: 'Agriculture' },
            professional_domain: { code: 'A12', label: 'Espaces verts' },
          },
        ],
      });
    if (url.pathname === '/audiences')
      return Response.json({
        data: [{ id: 'college', label: 'Collégien·nes' }],
      });
    if (url.pathname === '/headsets')
      return Response.json({ data: [{ id: 'pico-4', name: 'Pico 4' }] });
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  return {
    videos,
    fetcher,
    client: createCatalogueClient({
      baseUrl: 'http://catalogue.internal',
      fetcher,
    }),
  };
}

afterEach(() => vi.useRealTimers());

describe('loadCatalogueSnapshot', () => {
  it('discards a failed second page and restarts the entire attempt before publishing', async () => {
    vi.useFakeTimers();
    const { client, fetcher } = source();
    const original = fetcher.getMockImplementation()!;
    let failSecondPage = true;
    fetcher.mockImplementation((input, init) => {
      if (
        new URL(String(input)).searchParams.get('page') === '2' &&
        failSecondPage
      ) {
        failSecondPage = false;
        return Promise.resolve(
          Response.json({ error: 'unavailable' }, { status: 503 }),
        );
      }
      return original(input, init);
    });
    const buildDictionary = vi.fn((snapshot: { videos: readonly Video[] }) =>
      snapshot.videos.map((item) => item.id),
    );
    const preparation = createCataloguePreparation({
      loadSnapshot: (signal) => loadCatalogueSnapshot(client, signal),
      buildDictionary,
      reportFailure: vi.fn(),
    });
    const pending = preparation.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(preparation.getState()).toEqual({ status: 'preparing', attempt: 1 });
    expect(buildDictionary).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await pending).toMatchObject({
      status: 'ready',
      dictionary: expect.arrayContaining(['vid_101']),
    });
    expect(buildDictionary).toHaveBeenCalledOnce();
    expect(
      fetcher.mock.calls
        .map(([input]) => new URL(String(input)).searchParams.get('page'))
        .filter(Boolean),
    ).toEqual(['1', '2', '1', '2']);
    const requests = fetcher.mock.calls.length;
    await preparation.start();
    expect(fetcher).toHaveBeenCalledTimes(requests);
  });
  it('loads all pages and reference data, preserving values and same-origin thumbnails', async () => {
    const { client, fetcher } = source();
    const snapshot = await loadCatalogueSnapshot(
      client,
      new AbortController().signal,
    );
    expect(snapshot.videos).toHaveLength(101);
    expect(snapshot.videos[100]?.id).toBe('vid_101');
    expect(snapshot.videos[0]).toMatchObject({
      title: video.title,
      thumbnail_url: '/api/thumbnails/vid_001.svg',
    });
    expect(snapshot.jobs.data[0]?.code).toBe('A1203');
    expect(snapshot.audiences.data[0]?.id).toBe('college');
    expect(snapshot.headsets.data[0]?.id).toBe('pico-4');
    expect(fetcher.mock.calls.map(([input]) => String(input))).toEqual([
      'http://catalogue.internal/videos?page=1&per_page=100',
      'http://catalogue.internal/videos?page=2&per_page=100',
      'http://catalogue.internal/jobs',
      'http://catalogue.internal/audiences',
      'http://catalogue.internal/headsets',
    ]);
  });

  it('accepts a genuinely empty catalogue and nullable thumbnails', async () => {
    const empty = source(0);
    expect(
      (await loadCatalogueSnapshot(empty.client, new AbortController().signal))
        .videos,
    ).toEqual([]);
    const nullable = source(1);
    nullable.videos[0]!.thumbnail_url = null;
    expect(
      (
        await loadCatalogueSnapshot(
          nullable.client,
          new AbortController().signal,
        )
      ).videos[0]?.thumbnail_url,
    ).toBeNull();
  });

  it.each([
    'duplicate',
    'missing',
    'changed-total',
    'wrong-page',
    'wrong-size',
    'wrong-page-count',
  ])(
    'rejects %s pagination without returning partial data',
    async (problem) => {
      const { client, fetcher, videos } = source();
      const original = fetcher.getMockImplementation()!;
      fetcher.mockImplementation(async (input, init) => {
        const url = new URL(String(input));
        if (url.searchParams.get('page') !== '2') return original(input, init);
        return Response.json({
          data:
            problem === 'missing'
              ? []
              : [problem === 'duplicate' ? videos[0] : videos[100]],
          meta: {
            page: problem === 'wrong-page' ? 1 : 2,
            per_page: problem === 'wrong-size' ? 24 : 100,
            total: problem === 'changed-total' ? 102 : 101,
            total_pages: problem === 'wrong-page-count' ? 3 : 2,
          },
        });
      });
      await expect(
        loadCatalogueSnapshot(client, new AbortController().signal),
      ).rejects.toMatchObject({ kind: 'invalid-response' });
    },
  );

  it('rejects malformed upstream JSON at the existing validation boundary', async () => {
    const { client, fetcher } = source();
    fetcher.mockResolvedValueOnce(
      Response.json({
        data: [{ ...video, duration_seconds: 'bad' }],
        meta: {},
      }),
    );
    await expect(
      loadCatalogueSnapshot(client, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('rejects unknown references and duplicate reference identifiers', async () => {
    const unknown = source(1);
    unknown.videos[0]!.jobs = ['UNKNOWN'];
    await expect(
      loadCatalogueSnapshot(unknown.client, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid-response' });
    const duplicate = source(0);
    const original = duplicate.fetcher.getMockImplementation()!;
    duplicate.fetcher.mockImplementation((input, init) =>
      String(input).endsWith('/headsets')
        ? Promise.resolve(
            Response.json({
              data: [
                { id: 'pico-4', name: 'Pico 4' },
                { id: 'pico-4', name: 'Duplicate' },
              ],
            }),
          )
        : original(input, init),
    );
    await expect(
      loadCatalogueSnapshot(duplicate.client, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid-response' });
  });
});
