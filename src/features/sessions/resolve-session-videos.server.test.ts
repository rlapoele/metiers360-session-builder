import { describe, expect, it, vi } from 'vitest';

import type { Session, VideoList } from '@lib/api/schemas';
import { resolveSessionVideos } from '@features/sessions/resolve-session-videos.server';

const session: Session = {
  id: 'ses_001',
  name: 'Découverte du paysage',
  video_ids: ['vid_003', 'vid_001'],
  headset_id: null,
  created_at: '2026-10-23T18:20:00.000Z',
  total_duration_seconds: 760,
};

function page(data: VideoList['data'], pageNumber: number): VideoList {
  return {
    data,
    meta: { page: pageNumber, per_page: 100, total: 103, total_pages: 2 },
  };
}

function video(id: string) {
  return {
    id,
    title: `Vidéo ${id}`,
    description: 'Description',
    duration_seconds: 380,
    jobs: ['A1203'],
    audiences: ['adultes-reconversion'],
    compatible_headsets: ['pico-4'],
    thumbnail_url: null,
    published_at: '2024-04-11',
  };
}

describe('resolveSessionVideos', () => {
  it('scans bounded catalogue pages and restores playback order', async () => {
    const listVideos = vi
      .fn()
      .mockResolvedValueOnce(page([video('vid_001')], 1))
      .mockResolvedValueOnce(page([video('vid_003')], 2));

    const result = await resolveSessionVideos(session, listVideos);

    expect(result.map((item) => item.video?.id)).toEqual([
      'vid_003',
      'vid_001',
    ]);
    expect(listVideos).toHaveBeenCalledTimes(2);
    expect(listVideos.mock.calls.map(([params]) => params.toString())).toEqual([
      'page=1&per_page=100',
      'page=2&per_page=100',
    ]);
  });

  it('keeps an unavailable programme position after the bounded scan', async () => {
    const listVideos = vi
      .fn()
      .mockResolvedValueOnce(page([video('vid_001')], 1))
      .mockResolvedValueOnce(page([], 2));

    const result = await resolveSessionVideos(session, listVideos);

    expect(result).toEqual([
      { id: 'vid_003', video: undefined },
      { id: 'vid_001', video: expect.objectContaining({ id: 'vid_001' }) },
    ]);
  });
});
