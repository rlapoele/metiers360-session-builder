import type * as z from 'zod';

import { CatalogueClientError } from '@lib/api/errors';
import {
  ApiErrorSchema,
  AudienceListSchema,
  type CreateSession,
  HeadsetListSchema,
  JobListSchema,
  JobSchema,
  SessionListSchema,
  SessionSchema,
  ValidationErrorSchema,
  VideoListSchema,
  VideoSchema,
  type Video,
  type VideoList,
} from '@lib/api/schemas';

const DEFAULT_TIMEOUT_MS = 7_000;

interface CatalogueClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

function rewriteThumbnail(video: Video): Video {
  return {
    ...video,
    thumbnail_url: video.thumbnail_url
      ? `/api/thumbnails/${encodeURIComponent(video.id)}.svg`
      : null,
  };
}

function parseUpstreamError(value: unknown) {
  const validationError = ValidationErrorSchema.safeParse(value);
  if (validationError.success) return validationError.data;

  const apiError = ApiErrorSchema.safeParse(value);
  return apiError.success ? apiError.data : undefined;
}

export function createCatalogueClient({
  baseUrl,
  fetcher = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: CatalogueClientOptions) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  async function fetchResponse(path: string, init: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetcher(new URL(path, normalizedBaseUrl).toString(), {
        ...init,
        signal: controller.signal,
      });
    } catch (cause) {
      if (controller.signal.aborted) {
        throw new CatalogueClientError({
          kind: 'timeout',
          message: 'The catalogue service did not respond in time.',
          status: 504,
          cause,
        });
      }

      throw new CatalogueClientError({
        kind: 'transport',
        message: 'The catalogue service could not be reached.',
        status: 503,
        cause,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function throwUpstreamError(response: Response): Promise<never> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    throw new CatalogueClientError({
      kind: 'upstream',
      message: 'The catalogue service rejected the request.',
      status: response.status,
      upstream: parseUpstreamError(payload),
      diagnostics: payload,
    });
  }

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetchResponse(path, init);

    if (!response.ok) await throwUpstreamError(response);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new CatalogueClientError({
        kind: 'invalid-response',
        message: 'The catalogue service returned invalid JSON.',
        status: 502,
        cause,
      });
    }

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new CatalogueClientError({
        kind: 'invalid-response',
        message: 'The catalogue service response did not match its contract.',
        status: 502,
        diagnostics: result.error.issues,
      });
    }

    return result.data;
  }

  return {
    async listVideos(params = new URLSearchParams()): Promise<VideoList> {
      const query = params.toString();
      const result = await request(
        `/videos${query ? `?${query}` : ''}`,
        VideoListSchema,
      );
      return { ...result, data: result.data.map(rewriteThumbnail) };
    },

    async getVideo(id: string) {
      return rewriteThumbnail(
        await request(`/videos/${encodeURIComponent(id)}`, VideoSchema),
      );
    },

    listJobs() {
      return request('/jobs', JobListSchema);
    },

    getJob(code: string) {
      return request(`/jobs/${encodeURIComponent(code)}`, JobSchema);
    },

    listAudiences() {
      return request('/audiences', AudienceListSchema);
    },

    listHeadsets() {
      return request('/headsets', HeadsetListSchema);
    },

    listSessions() {
      return request('/sessions', SessionListSchema);
    },

    getSession(id: string) {
      return request(`/sessions/${encodeURIComponent(id)}`, SessionSchema);
    },

    createSession(input: CreateSession) {
      return request('/sessions', SessionSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    },

    async getThumbnail(id: string) {
      const response = await fetchResponse(
        `/thumbnails/${encodeURIComponent(id)}.svg`,
      );
      if (!response.ok) await throwUpstreamError(response);

      const contentType = response.headers
        .get('Content-Type')
        ?.split(';')[0]
        ?.trim();
      if (contentType !== 'image/svg+xml') {
        throw new CatalogueClientError({
          kind: 'invalid-response',
          message: 'The catalogue service returned an invalid thumbnail.',
          status: 502,
          diagnostics: { contentType },
        });
      }

      return { body: await response.arrayBuffer(), contentType };
    },
  };
}
