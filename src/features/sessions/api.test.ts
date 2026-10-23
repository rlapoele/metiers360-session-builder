import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CreateSession } from '../../lib/api/schemas';
import { createSession, SessionSaveError } from './api';

const request: CreateSession = {
  name: 'Découvrir les métiers du paysage',
  video_ids: ['vid_002', 'vid_001'],
  headset_id: 'pico-4',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSession', () => {
  it('posts the ordered draft and validates the created session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'ses_001',
          ...request,
          created_at: '2026-10-23T18:20:00.000Z',
          total_duration_seconds: 760,
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createSession(request)).resolves.toMatchObject({
      id: 'ses_001',
      video_ids: ['vid_002', 'vid_001'],
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: undefined,
    });
  });

  it('exposes server validation details as a retryable save error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'validation_error',
            message: 'The request is invalid.',
            details: [{ field: 'headset_id', message: 'Unknown headset id.' }],
          }),
          { status: 422, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const error = await createSession(request).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(SessionSaveError);
    expect(error).toMatchObject({
      fieldErrors: [{ field: 'headset_id', message: 'Unknown headset id.' }],
    });
  });

  it('normalises an invalid success response into a recoverable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'ses_incomplete' }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(createSession(request)).rejects.toThrow(
      'La confirmation de l’enregistrement est invalide.',
    );
  });
});
