// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogueReferences } from '../../features/catalogue/api';
import type { CatalogueQuery } from '../../features/catalogue/query-params';
import type { VideoList } from '../../lib/api/schemas';
import { CatalogueApp } from './CatalogueApp';

const initialQuery: CatalogueQuery = {
  q: '',
  job: '',
  headset: '',
  audience: '',
  page: 1,
};

const initialVideos: VideoList = {
  data: [
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
  ],
  meta: { page: 1, per_page: 24, total: 1, total_pages: 1 },
};

const initialReferences: CatalogueReferences = {
  jobs: {
    data: [
      {
        code: 'A1203',
        label: 'Aménagement et entretien des espaces verts',
        major_domain: { code: 'A', label: 'Agriculture et Pêche' },
        professional_domain: { code: 'A12', label: 'Espaces naturels' },
        appellations: ['Jardinier / Jardinière'],
      },
    ],
    source: 'ROME 4.0',
  },
  headsets: { data: [{ id: 'pico-4', name: 'Pico 4' }] },
  audiences: {
    data: [{ id: 'adultes-reconversion', label: 'Adultes en reconversion' }],
  },
};

beforeEach(() => {
  window.history.replaceState({}, '', '/');
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

describe('CatalogueApp', () => {
  it('renders the result count and decision-critical card content', () => {
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );

    expect(screen.getByText('1 vidéo trouvée')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Une journée avec Omar, jardinier municipal',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('7 min 35 s')).toBeInTheDocument();
    const card = screen
      .getByRole('heading', {
        level: 2,
        name: 'Une journée avec Omar, jardinier municipal',
      })
      .closest('article');
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByText(
        'Aménagement et entretien des espaces verts',
      ),
    ).toBeInTheDocument();
  });

  it('exposes add and remove state without relying on colour alone', async () => {
    const user = userEvent.setup();
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );

    const addButton = screen.getByRole('button', {
      name: 'Ajouter à ma séance',
    });
    expect(addButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(addButton);

    expect(
      screen.getByRole('button', { name: 'Retirer de ma séance' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Dans ma séance')).toBeInTheDocument();
  });

  it('opens complete contextual details and restores focus without changing the URL', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(initialVideos.data[0]), { status: 200 }),
        ),
    );
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );
    const initialUrl = window.location.href;
    const detailsTrigger = screen.getByRole('button', {
      name: 'Voir les détails de Une journée avec Omar, jardinier municipal',
    });

    await user.click(detailsTrigger);

    const dialog = await screen.findByRole('dialog', {
      name: 'Détails de la vidéo',
    });
    expect(dialog).toHaveAttribute('open');
    expect(
      within(dialog).getByRole('heading', {
        name: 'Une journée avec Omar, jardinier municipal',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Immersion aux côtés d'Omar."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Adultes en reconversion'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Pico 4')).toBeInTheDocument();
    expect(within(dialog).getByText('ROME A1203')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Publiée le 11 avril 2024'),
    ).toBeInTheDocument();

    const closeButton = within(dialog).getByRole('button', { name: 'Fermer' });
    closeButton.focus();
    await user.tab({ shift: true });
    expect(
      within(dialog).getByRole('button', { name: 'Ajouter à ma séance' }),
    ).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.click(closeButton);

    expect(dialog).not.toHaveAttribute('open');
    expect(detailsTrigger).toHaveFocus();
    expect(window.location.href).toBe(initialUrl);
  });

  it('keeps card and details selection actions in sync', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(initialVideos.data[0]), { status: 200 }),
        ),
    );
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Voir les détails de Une journée avec Omar, jardinier municipal',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Détails de la vidéo',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Ajouter à ma séance' }),
    );

    expect(
      within(dialog).getByRole('button', { name: 'Retirer de ma séance' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const card = screen
      .getByRole('heading', {
        level: 2,
        name: 'Une journée avec Omar, jardinier municipal',
      })
      .closest('article');
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: 'Retirer de ma séance',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a recoverable details error and a missing-thumbnail fallback', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'upstream_error',
            message: 'An unexpected error occurred.',
          }),
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...initialVideos.data[0], thumbnail_url: null }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Voir les détails de Une journée avec Omar, jardinier municipal',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Détails de la vidéo',
    });
    expect(
      within(dialog).getByRole('heading', {
        name: 'Impossible de charger les détails',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Les détails de cette vidéo n’ont pas pu être chargés. Réessayez.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText('An unexpected error occurred.'),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Réessayer' }));

    expect(
      await within(dialog).findByText('Aperçu indisponible'),
    ).toBeInTheDocument();
  });

  it('writes submitted search state to the URL and resets the page', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: { page: 1, per_page: 24, total: 0, total_pages: 1 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/?page=3');

    render(
      <CatalogueApp
        initialQuery={{ ...initialQuery, page: 3 }}
        initialVideos={{
          ...initialVideos,
          meta: { ...initialVideos.meta, page: 3, total_pages: 3 },
        }}
        initialReferences={initialReferences}
      />,
    );

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher une vidéo' }),
      'santé',
    );
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(window.location.search).toBe('?q=sant%C3%A9');
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/videos?q=sant%C3%A9',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
