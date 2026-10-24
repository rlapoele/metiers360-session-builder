import { getContainerRenderer } from '@astrojs/react/container-renderer';
import { loadRenderers } from 'astro:container';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';

import type {
  HeadsetList,
  JobList,
  Session,
  Video,
} from '../../lib/api/schemas';
import SavedSessionDetails from './SavedSessionDetails.astro';

const session: Session = {
  id: 'ses_001',
  name: 'Découverte du paysage',
  video_ids: ['vid_002', 'vid_001'],
  headset_id: 'pico-4',
  created_at: '2026-10-23T18:20:00.000Z',
  total_duration_seconds: 760,
};

function video(id: string, title: string): Video {
  return {
    id,
    title,
    description: 'Description',
    duration_seconds: 380,
    jobs: ['A1203'],
    audiences: ['adultes-reconversion'],
    compatible_headsets: ['pico-4'],
    thumbnail_url: null,
    published_at: '2024-04-11',
  };
}

const jobs: JobList = {
  data: [
    {
      code: 'A1203',
      label: 'Aménagement et entretien des espaces verts',
      major_domain: { code: 'A', label: 'Agriculture et Pêche' },
      professional_domain: { code: 'A12', label: 'Espaces naturels' },
      appellations: [],
    },
  ],
  source: 'ROME 4.0',
};
const headsets: HeadsetList = {
  data: [{ id: 'pico-4', name: 'Pico 4' }],
};

describe('SavedSessionDetails', () => {
  it('renders the programme in playback order as a read-only view', async () => {
    const renderers = await loadRenderers([getContainerRenderer()]);
    const container = await AstroContainer.create({ renderers });
    const html = await container.renderToString(SavedSessionDetails, {
      props: {
        session,
        programme: [
          { id: 'vid_002', video: video('vid_002', 'Deuxième vidéo') },
          { id: 'vid_001', video: video('vid_001', 'Première vidéo') },
        ],
        jobs,
        headsets,
      },
    });

    expect(html.indexOf('Deuxième vidéo')).toBeLessThan(
      html.indexOf('Première vidéo'),
    );
    expect(html).toContain('Programme de la séance');
    expect(html).toContain('Résumé de la séance');
    expect(html).toContain('Pico 4');
    expect(html).not.toMatch(/Modifier|Supprimer/);
    expect(html).toContain('<ol ');
    expect(html).not.toMatch(/aria-label="Position \d+"/);
    expect(html.match(/<span\s+aria-hidden="true"/g)).toHaveLength(2);
  });

  it('preserves the position of unavailable catalogue metadata', async () => {
    const renderers = await loadRenderers([getContainerRenderer()]);
    const container = await AstroContainer.create({ renderers });
    const html = await container.renderToString(SavedSessionDetails, {
      props: {
        session,
        programme: [
          { id: 'vid_002', video: undefined },
          { id: 'vid_001', video: video('vid_001', 'Première vidéo') },
        ],
        jobs,
        headsets,
      },
    });

    expect(html).toContain('Vidéo indisponible');
    expect(html).toContain('vid_002');
  });
});
