import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CreateSession } from '../../lib/api/schemas';
import { createSession, fetchSessionsOverview, SessionSaveError } from './api';

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

  it('asks users to check saved sessions when the save response is lost', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(createSession(request)).rejects.toThrow(
      'L’enregistrement n’a pas pu être confirmé. Votre séance en cours est conservée. Consultez Mes séances avant de réessayer.',
    );
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
      'L’enregistrement n’a pas pu être confirmé. Votre séance en cours est conservée. Consultez Mes séances avant de réessayer.',
    );
  });
});

describe('fetchSessionsOverview', () => {
  it('loads and validates saved sessions with headset labels', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: 'ses_001',
              ...request,
              created_at: '2026-10-23T18:20:00.000Z',
              total_duration_seconds: 760,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: [{ id: 'pico-4', name: 'Pico 4' }] }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSessionsOverview()).resolves.toMatchObject({
      sessions: { data: [{ id: 'ses_001' }] },
      headsets: { data: [{ name: 'Pico 4' }] },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/sessions', {
      signal: undefined,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/headsets', {
      signal: undefined,
    });
  });

  it('rejects an invalid saved-session response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ data: [{ id: 'broken' }] }))
        .mockResolvedValueOnce(Response.json({ data: [] })),
    );

    await expect(fetchSessionsOverview()).rejects.toThrow(
      'La réponse des séances enregistrées est invalide.',
    );
  });
});
