// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addVideoToDraft,
  clearDraftAfterSave,
} from '@features/sessions/session-draft.store';
import type { SessionsOverview } from '@features/sessions/api';
import { SessionsApp } from '@components/sessions/SessionsApp';

const overview: SessionsOverview = {
  sessions: {
    data: [
      {
        id: 'ses_001',
        name: 'Découverte des métiers du paysage',
        video_ids: ['vid_001'],
        headset_id: 'pico-4',
        created_at: '2026-10-23T18:20:00.000Z',
        total_duration_seconds: 455,
      },
    ],
  },
  headsets: { data: [{ id: 'pico-4', name: 'Pico 4' }] },
};

const draftVideo = {
  id: 'vid_001',
  title: 'Une journée avec Omar, jardinier municipal',
  description: "Immersion aux côtés d'Omar.",
  duration_seconds: 455,
  jobs: ['A1203'],
  audiences: ['adultes-reconversion'],
  compatible_headsets: ['pico-4'],
  thumbnail_url: null,
  published_at: '2024-04-11',
};

beforeEach(() => {
  localStorage.clear();
  clearDraftAfterSave();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SessionsApp', () => {
  it('separates the current draft from saved sessions', async () => {
    addVideoToDraft(draftVideo);
    render(<SessionsApp initialOverview={overview} />);

    expect(
      await screen.findByRole('heading', { name: 'Séance en cours' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.startsWith('1 vidéo · 7 min 35 s')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Séances enregistrées' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Consulter la séance : Découverte des métiers du paysage',
      }),
    ).toHaveAttribute('href', '/sessions/ses_001');
    expect(screen.queryByRole('button', { name: /supprimer/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /modifier/i })).toBeNull();
  });

  it('renders a saved-session empty state independently of the draft', async () => {
    render(
      <SessionsApp initialOverview={{ ...overview, sessions: { data: [] } }} />,
    );

    expect(
      await screen.findByText('Aucune séance enregistrée'),
    ).toBeInTheDocument();
    expect(screen.getByText('Aucune séance en cours')).toBeInTheDocument();
  });

  it('announces loading, exposes an error and retries the list request', async () => {
    const user = userEvent.setup();
    let resolveFirstRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockResolvedValueOnce(Response.json({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<SessionsApp />);

    expect(
      screen.getByText('Chargement des séances enregistrées…'),
    ).toBeInTheDocument();
    expect(screen.getByText('Aucune séance en cours')).toBeInTheDocument();
    resolveFirstRequest?.(
      Response.json(
        { error: 'service_unavailable', message: 'Unavailable' },
        { status: 503 },
      ),
    );
    expect(
      await screen.findByText(
        'Les séances enregistrées ne peuvent pas être chargées.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Aucune séance en cours')).toBeInTheDocument();

    fetchMock
      .mockResolvedValueOnce(Response.json({ data: [] }))
      .mockResolvedValueOnce(Response.json({ data: [] }));
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => {
      expect(screen.getByText('Aucune séance enregistrée')).toBeInTheDocument();
    });
  });
});
