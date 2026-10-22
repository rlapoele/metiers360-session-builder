import { describe, expect, it, vi } from 'vitest';

const { getThumbnail } = vi.hoisted(() => ({
  getThumbnail: vi.fn().mockResolvedValue({
    body: new TextEncoder().encode('<svg></svg>').buffer,
    contentType: 'image/svg+xml',
  }),
}));

vi.mock('../../../lib/api/catalogue-client-instance.server', () => ({
  getCatalogueClient: () => ({ getThumbnail }),
}));

import { GET } from './[id].svg';

describe('GET /api/thumbnails/[id].svg', () => {
  it('provides a light browser-facing cache policy', async () => {
    const response = (await GET({
      params: { id: 'vid_001' },
    } as unknown as Parameters<typeof GET>[0])) as Response;

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=86400, stale-while-revalidate=604800',
    );
  });
});
