// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Headset,
  Session,
  SessionDraft,
  Video,
} from '../../lib/api/schemas';
import type { DraftVideoItem } from './SessionDraftContent';
import { SessionFinalisationDialog } from './SessionFinalisationDialog';

const headsets: Headset[] = [
  { id: 'pico-4', name: 'Pico 4' },
  { id: 'pico-g2-4k', name: 'Pico G2 4K' },
];

const videos: Video[] = [
  {
    id: 'vid_001',
    title: 'Une journée avec Omar, jardinier municipal',
    description: "Immersion aux côtés d'Omar.",
    duration_seconds: 455,
    jobs: ['A1203'],
    audiences: ['adultes-reconversion'],
    compatible_headsets: ['pico-4'],
    thumbnail_url: '/api/thumbnails/vid_001.svg',
    published_at: '2024-04-11',
  },
  {
    id: 'vid_002',
    title: 'Découvrir le métier de pâtissière',
    description: 'Une immersion en pâtisserie.',
    duration_seconds: 305,
    jobs: ['D1104'],
    audiences: ['college'],
    compatible_headsets: [],
    thumbnail_url: null,
    published_at: '2024-05-03',
  },
];

const items: DraftVideoItem[] = videos.map((video) => ({
  id: video.id,
  video,
  isPending: false,
  isError: false,
  retry: vi.fn(),
}));

function renderDialog({
  draft = {
    version: 1,
    name: '',
    video_ids: videos.map((video) => video.id),
    headset_id: null,
  },
  onNameChange = vi.fn(),
  onHeadsetChange = vi.fn(),
  onSaved = vi.fn<(session: Session) => void>(),
}: {
  draft?: SessionDraft;
  onNameChange?: (name: string) => void;
  onHeadsetChange?: (headsetId: string | null) => void;
  onSaved?: ReturnType<typeof vi.fn<(session: Session) => void>>;
} = {}) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <SessionFinalisationDialog
        draft={draft}
        items={items}
        headsets={headsets}
        onNameChange={onNameChange}
        onHeadsetChange={onHeadsetChange}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );

  return { onNameChange, onHeadsetChange, onSaved };
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SessionFinalisationDialog', () => {
  it('announces a missing name and does not submit', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderDialog();

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer la séance' }),
    );

    const input = screen.getByRole('textbox', { name: 'Nom de la séance' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Le nom est obligatoire.')).toHaveAttribute(
      'role',
      'alert',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('states incompatible videos explicitly for the selected headset', () => {
    renderDialog({
      draft: {
        version: 1,
        name: 'Métiers du paysage',
        video_ids: videos.map((video) => video.id),
        headset_id: 'pico-4',
      },
    });

    const warning = screen.getByRole('alert');
    expect(
      within(warning).getByText('1 vidéo non compatible avec Pico 4'),
    ).toBeInTheDocument();
    expect(
      within(warning).getByText('Découvrir le métier de pâtissière'),
    ).toBeInTheDocument();
  });

  it('keeps the complete draft available after a failed save and allows retry', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'upstream_error',
            message: 'An unexpected error occurred.',
          }),
          { status: 503, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'ses_001',
            name: 'Métiers du paysage',
            video_ids: ['vid_001', 'vid_002'],
            headset_id: 'pico-4',
            created_at: '2026-10-23T18:20:00.000Z',
            total_duration_seconds: 760,
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { onSaved } = renderDialog({
      draft: {
        version: 1,
        name: 'Métiers du paysage',
        video_ids: ['vid_001', 'vid_002'],
        headset_id: 'pico-4',
      },
    });

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer la séance' }),
    );

    expect(
      await screen.findByText(
        'La séance n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.',
      ),
    ).toHaveAttribute('role', 'alert');
    expect(screen.getByDisplayValue('Métiers du paysage')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Casque VR' })).toHaveValue(
      'pico-4',
    );
    expect(
      screen.getByText('Une journée avec Omar, jardinier municipal'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Découvrir le métier de pâtissière'),
    ).not.toHaveLength(0);

    await user.click(
      screen.getByRole('button', { name: 'Réessayer d’enregistrer' }),
    );
    await waitFor(() =>
      expect(onSaved.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ id: 'ses_001' }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('disables the form while one save request is pending', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderDialog({
      draft: {
        version: 1,
        name: 'Métiers du paysage',
        video_ids: ['vid_001', 'vid_002'],
        headset_id: null,
      },
    });

    const submit = screen.getByRole('button', {
      name: 'Enregistrer la séance',
    });
    await user.click(submit);

    expect(
      await screen.findByRole('button', { name: 'Enregistrement en cours…' }),
    ).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest?.(
      new Response(
        JSON.stringify({
          id: 'ses_001',
          name: 'Métiers du paysage',
          video_ids: ['vid_001', 'vid_002'],
          headset_id: null,
          created_at: '2026-10-23T18:20:00.000Z',
          total_duration_seconds: 760,
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
  });
});
