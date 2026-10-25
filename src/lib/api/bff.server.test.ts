import { describe, expect, it } from 'vitest';

import {
  filterVideoSearchParams,
  toBffErrorResponse,
  validateCreateSessionRequest,
} from '@lib/api/bff.server';
import { CatalogueClientError } from '@lib/api/errors';
import { parseServerEnv } from '@lib/api/server-config';

describe('BFF boundary helpers', () => {
  it('forwards only catalogue query parameters supported by the supplied API', () => {
    const url = new URL(
      'http://localhost/api/videos?q=jardinier&job=A1203&headset=pico-4&audience=college&page=2&per_page=12&sort=title',
    );

    expect(filterVideoSearchParams(url).toString()).toBe(
      'q=jardinier&job=A1203&headset=pico-4&audience=college&page=2&per_page=12',
    );
  });

  it('preserves upstream validation details and status codes', async () => {
    const response = toBffErrorResponse(
      new CatalogueClientError({
        kind: 'upstream',
        message: 'Rejected upstream',
        status: 422,
        upstream: {
          error: 'validation_error',
          message: 'Invalid session.',
          details: [{ field: 'name', message: 'Le nom est obligatoire.' }],
        },
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: 'validation_error',
      details: [{ field: 'name' }],
    });
  });

  it('returns a concise recoverable error for an invalid upstream response', async () => {
    const response = toBffErrorResponse(
      new CatalogueClientError({
        kind: 'invalid-response',
        message: 'Raw schema diagnostics must stay internal.',
        status: 502,
        diagnostics: ['private diagnostics'],
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_response',
      message:
        'Le service catalogue a renvoyé une réponse invalide. Vous pouvez réessayer.',
    });
  });

  it('validates and trims a session request body', async () => {
    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '  Atelier  ',
        video_ids: ['vid_001'],
        headset_id: null,
      }),
    });

    await expect(validateCreateSessionRequest(request)).resolves.toEqual({
      success: true,
      data: { name: 'Atelier', video_ids: ['vid_001'], headset_id: null },
    });
  });

  it('returns French field errors for an invalid session body', async () => {
    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ' ', video_ids: [] }),
    });

    const result = await validateCreateSessionRequest(request);

    expect(result.success).toBe(false);
    if (result.success) return;
    await expect(result.response.json()).resolves.toMatchObject({
      error: 'validation_error',
      details: [
        { field: 'name', message: 'Le nom est obligatoire.' },
        { field: 'video_ids', message: 'Au moins une vidéo est requise.' },
      ],
    });
  });
});

describe('parseServerEnv', () => {
  it('returns validated server-only configuration', () => {
    expect(
      parseServerEnv({ CATALOG_API_URL: 'http://localhost:4000' }),
    ).toEqual({
      CATALOG_API_URL: 'http://localhost:4000',
    });
  });

  it('normalises invalid configuration', () => {
    expect(() =>
      parseServerEnv({ CATALOG_API_URL: 'catalogue.local' }),
    ).toThrow(expect.objectContaining({ kind: 'configuration', status: 500 }));
  });
});
