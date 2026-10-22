import { describe, expect, it } from 'vitest';

import {
  ApiErrorSchema,
  AudienceListSchema,
  CreateSessionSchema,
  HeadsetListSchema,
  JobListSchema,
  ServerEnvSchema,
  SessionDraftSchema,
  SessionListSchema,
  ValidationErrorSchema,
  VideoListSchema,
  VideoSchema,
} from './schemas';

const video = {
  id: 'vid_001',
  title: 'Une journée avec Omar, jardinier municipal',
  description: "Immersion aux côtés d'Omar.",
  duration_seconds: 455,
  jobs: ['A1203'],
  audiences: ['adultes-reconversion'],
  compatible_headsets: [],
  thumbnail_url: 'http://localhost:4000/thumbnails/vid_001.svg',
  published_at: '2024-04-11',
};

describe('catalogue API schemas', () => {
  it('accepts an additive video response and an empty headset array', () => {
    const result = VideoSchema.parse({ ...video, future_field: true });

    expect(result.compatible_headsets).toEqual([]);
    expect(result).not.toHaveProperty('future_field');
  });

  it('validates the paginated video envelope', () => {
    expect(
      VideoListSchema.parse({
        data: [video],
        meta: { page: 1, per_page: 24, total: 1, total_pages: 1 },
      }),
    ).toMatchObject({ meta: { page: 1, total: 1 } });
  });

  it('validates the reference and saved-session envelopes', () => {
    expect(
      JobListSchema.safeParse({
        data: [
          {
            code: 'A1203',
            label: "Agent / Agente d'entretien des espaces verts",
            major_domain: { code: 'A', label: 'Agriculture' },
            professional_domain: { code: 'A12', label: 'Espaces naturels' },
            appellations: ['Jardinier municipal / Jardinière municipale'],
          },
        ],
        source: 'ROME 4.0',
      }).success,
    ).toBe(true);
    expect(
      AudienceListSchema.safeParse({
        data: [{ id: 'college', label: 'Collégien·nes' }],
      }).success,
    ).toBe(true);
    expect(
      HeadsetListSchema.safeParse({ data: [{ id: 'pico-4', name: 'Pico 4' }] })
        .success,
    ).toBe(true);
    expect(
      SessionListSchema.safeParse({
        data: [
          {
            id: 'ses_001',
            name: 'Découverte des métiers',
            video_ids: ['vid_001'],
            headset_id: null,
            created_at: '2026-09-22T08:12:00Z',
            total_duration_seconds: 455,
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe('application-owned input schemas', () => {
  it('trims a valid session name while preserving playback order', () => {
    expect(
      CreateSessionSchema.parse({
        name: '  Atelier découverte  ',
        video_ids: ['vid_002', 'vid_001'],
        headset_id: null,
      }),
    ).toEqual({
      name: 'Atelier découverte',
      video_ids: ['vid_002', 'vid_001'],
      headset_id: null,
    });
  });

  it('rejects unknown session fields and invalid persisted drafts', () => {
    expect(
      CreateSessionSchema.safeParse({
        name: 'Atelier',
        video_ids: ['vid_001'],
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      SessionDraftSchema.safeParse({
        version: 1,
        name: '',
        video_ids: Array.from({ length: 31 }, (_, index) => `vid_${index}`),
        headset_id: null,
      }).success,
    ).toBe(false);
  });
});

describe('error and configuration schemas', () => {
  it('validates ordinary and field-level API errors', () => {
    expect(
      ApiErrorSchema.safeParse({
        error: 'not_found',
        message: 'Video not found.',
      }).success,
    ).toBe(true);
    expect(
      ValidationErrorSchema.safeParse({
        error: 'validation_error',
        message: 'Invalid session.',
        details: [{ field: 'name', message: 'Le nom est obligatoire.' }],
      }).success,
    ).toBe(true);
  });

  it('rejects a non-URL catalogue service configuration', () => {
    expect(
      ServerEnvSchema.safeParse({ CATALOG_API_URL: 'catalogue.local' }).success,
    ).toBe(false);
  });
});
