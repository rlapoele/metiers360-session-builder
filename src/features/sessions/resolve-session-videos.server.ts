import type { Session, Video, VideoList } from '../../lib/api/schemas';

export interface ResolvedSessionVideo {
  id: string;
  video: Video | undefined;
}

type ListVideos = (params: URLSearchParams) => Promise<VideoList>;

export async function resolveSessionVideos(
  session: Session,
  listVideos: ListVideos,
): Promise<ResolvedSessionVideo[]> {
  const unresolvedIds = new Set(session.video_ids);
  const videosById = new Map<string, Video>();
  let page = 1;

  while (unresolvedIds.size > 0) {
    const result = await listVideos(
      new URLSearchParams({ page: String(page), per_page: '100' }),
    );

    for (const video of result.data) {
      if (!unresolvedIds.has(video.id)) continue;
      videosById.set(video.id, video);
      unresolvedIds.delete(video.id);
    }

    if (page >= result.meta.total_pages) break;
    page += 1;
  }

  return session.video_ids.map((id) => ({ id, video: videosById.get(id) }));
}
