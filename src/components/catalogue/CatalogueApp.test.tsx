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
import {
  addVideoToDraft,
  clearDraftAfterSave,
  SESSION_DRAFT_STORAGE_KEY,
  setDraftHeadset,
} from '../../features/sessions/session-draft.store';
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

const compositionVideos: VideoList = {
  data: [
    initialVideos.data[0],
    {
      id: 'vid_002',
      title: 'Découvrir le métier de pâtissière',
      description: 'Une immersion dans un laboratoire de pâtisserie.',
      duration_seconds: 305,
      jobs: ['A1203'],
      audiences: ['adultes-reconversion'],
      compatible_headsets: [],
      thumbnail_url: null,
      published_at: '2024-05-03',
    },
  ],
  meta: { page: 1, per_page: 24, total: 2, total_pages: 1 },
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
  clearDraftAfterSave();
  localStorage.clear();
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
  it.each(['', 'meta-quest-3'])(
    'shows complete card compatibility unless a headset filter is selected (%s)',
    (headset) => {
      const headsets = [
        { id: 'pico-g2-4k', name: 'Pico G2 4K' },
        { id: 'pico-4', name: 'Pico 4' },
        { id: 'meta-quest-2', name: 'Meta Quest 2' },
        { id: 'meta-quest-3', name: 'Meta Quest 3' },
      ];
      render(
        <CatalogueApp
          initialQuery={{ ...initialQuery, headset }}
          initialVideos={{
            ...initialVideos,
            data: [
              {
                ...initialVideos.data[0],
                compatible_headsets: headsets.map(({ id }) => id),
              },
            ],
          }}
          initialReferences={{
            ...initialReferences,
            headsets: { data: headsets },
          }}
        />,
      );

      const list = screen.getByRole('list', { name: 'Casques compatibles' });
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual(headset ? ['Meta Quest 3'] : headsets.map(({ name }) => name));
    },
  );

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
    const headsetList = within(card as HTMLElement).getByRole('list', {
      name: 'Casques compatibles',
    });
    expect(within(headsetList).getByText('Pico 4')).toHaveClass(
      'bg-secondary',
      'rounded-full',
    );
    expect(headsetList.querySelector('svg')).not.toBeInTheDocument();
  });

  it('keeps catalogue failures in French without exposing browser diagnostics', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialReferences={initialReferences}
      />,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Le catalogue ne peut pas être chargé',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Votre séance en cours est conservée.',
    );
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Réessayer' }),
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
      name: /^Ajouter à ma séance/,
    });
    expect(addButton).toHaveAttribute('aria-pressed', 'false');
    expect(addButton).toHaveAccessibleName(
      'Ajouter à ma séance : Une journée avec Omar, jardinier municipal',
    );

    await user.click(addButton);

    const removeButton = screen.getByRole('button', {
      name: /^Retirer de ma séance/,
    });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');
    expect(removeButton).toHaveAccessibleName(
      'Retirer de ma séance : Une journée avec Omar, jardinier municipal',
    );
    expect(removeButton).toHaveClass(
      'bg-secondary',
      'text-secondary-foreground',
    );
    expect(
      removeButton.querySelector('[data-remove-from-draft-icon]'),
    ).toBeInTheDocument();
    expect(screen.getByText('Dans ma séance')).toHaveClass('text-success');
    expect(
      JSON.parse(localStorage.getItem(SESSION_DRAFT_STORAGE_KEY) ?? ''),
    ).toMatchObject({ video_ids: ['vid_001'] });
  });

  it('renders, reorders and removes the persisted draft in its desktop panel', async () => {
    const user = userEvent.setup();
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={compositionVideos}
        initialReferences={initialReferences}
      />,
    );

    const addButtons = screen.getAllByRole('button', {
      name: /^Ajouter à ma séance/,
    });
    await user.click(addButtons[0]);
    await user.click(addButtons[1]);

    const panel = screen.getByRole('complementary', { name: 'Ma séance' });
    expect(panel.querySelector('[data-draft-position="1"]')).toHaveClass(
      'bg-primary',
      'text-primary-foreground',
    );
    expect(
      within(panel).getByText('2 vidéos · 12 min 40 s'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(
        'Vous pourrez choisir un casque au moment d’enregistrer la séance.',
      ),
    ).toBeInTheDocument();
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('1Une journée avec Omar'),
      expect.stringContaining('2Découvrir le métier de pâtissière'),
    ]);
    const panelRemoveButton = within(panel).getByRole('button', {
      name: 'Retirer Une journée avec Omar, jardinier municipal de ma séance',
    });
    expect(panelRemoveButton).toHaveClass(
      'bg-secondary',
      'text-secondary-foreground',
    );
    expect(
      panelRemoveButton.querySelector('[data-remove-from-draft-icon]'),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole('button', {
        name: 'Monter Découvrir le métier de pâtissière',
      }),
    );

    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('1Découvrir le métier de pâtissière'),
      expect.stringContaining('2Une journée avec Omar'),
    ]);
    expect(
      JSON.parse(localStorage.getItem(SESSION_DRAFT_STORAGE_KEY) ?? ''),
    ).toMatchObject({ video_ids: ['vid_002', 'vid_001'] });

    await user.click(
      within(panel).getByRole('button', {
        name: 'Retirer Découvrir le métier de pâtissière de ma séance',
      }),
    );
    expect(within(panel).getByText('1 vidéo · 7 min 35 s')).toBeInTheDocument();
  });

  it.each([
    { count: 3, removedIndex: 0, nextIndex: 1 },
    { count: 3, removedIndex: 1, nextIndex: 2 },
    { count: 3, removedIndex: 2, nextIndex: 1 },
    { count: 1, removedIndex: 0, nextIndex: null },
  ])(
    'keeps desktop draft focus after removing item $removedIndex from $count videos',
    async ({ count, removedIndex, nextIndex }) => {
      const user = userEvent.setup();
      const videos = [
        ...compositionVideos.data,
        {
          ...initialVideos.data[0],
          id: 'vid_003',
          title: 'Découvrir la menuiserie',
        },
      ].slice(0, count);
      render(
        <CatalogueApp
          initialQuery={initialQuery}
          initialVideos={{
            data: videos,
            meta: { page: 1, per_page: 24, total: count, total_pages: 1 },
          }}
          initialReferences={initialReferences}
        />,
      );
      for (const button of screen.getAllByRole('button', {
        name: /^Ajouter à ma séance/,
      })) {
        await user.click(button);
      }
      const panel = screen.getByRole('complementary', { name: 'Ma séance' });
      const remove = within(panel).getByRole('button', {
        name: `Retirer ${videos[removedIndex].title} de ma séance`,
      });
      remove.focus();
      await user.keyboard('{Enter}');

      expect(remove).not.toBeInTheDocument();
      if (nextIndex === null) {
        expect(
          within(panel).getByRole('heading', { name: 'Votre séance est vide' }),
        ).toHaveFocus();
      } else {
        expect(
          within(panel).getByRole('button', {
            name: `Retirer ${videos[nextIndex].title} de ma séance`,
          }),
        ).toHaveFocus();
      }
    },
  );

  it('keeps the desktop draft summary visible while its content scrolls', () => {
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={compositionVideos}
        initialReferences={initialReferences}
      />,
    );

    const panel = screen.getByRole('complementary', { name: 'Ma séance' });
    const summary = panel.querySelector('[data-slot="session-draft-summary"]');
    const scrollRegion = panel.querySelector(
      '[data-slot="session-draft-scroll-region"]',
    );

    expect(panel).toHaveClass(
      'max-h-draft-panel',
      'overflow-hidden',
      'xl:flex',
    );
    expect(summary).toHaveClass('shrink-0');
    expect(scrollRegion).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
      'overscroll-contain',
    );
  });

  it('opens the mobile draft sheet, traps focus and restores it on close', async () => {
    const user = userEvent.setup();
    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: /^Ajouter à ma séance/ }),
    );
    const trigger = screen.getByRole('button', {
      name: 'Consulter ma séance, 1 vidéo, 7 min 35 s',
    });

    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Ma séance' });
    const closeButton = within(dialog).getByRole('button', { name: 'Fermer' });
    expect(dialog).toHaveAttribute('open');
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(
      within(dialog).getByRole('button', { name: 'Finaliser ma séance' }),
    ).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Retirer Une journée avec Omar, jardinier municipal de ma séance',
      }),
    );
    expect(
      within(dialog).getByRole('heading', { name: 'Votre séance est vide' }),
    ).toHaveFocus();
    expect(dialog).toHaveAttribute('open');

    await user.click(closeButton);
    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
  });

  it('opens a linked draft surface and restores focus after cross-route navigation', async () => {
    const user = userEvent.setup();
    const headerTrigger = document.createElement('button');
    headerTrigger.dataset.sessionDraftTrigger = '';
    document.body.append(headerTrigger);
    window.history.replaceState({}, '', '/#ma-seance');

    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={initialVideos}
        initialReferences={initialReferences}
      />,
    );

    const dialog = await screen.findByRole('dialog', { name: 'Ma séance' });
    await user.click(within(dialog).getByRole('button', { name: 'Fermer' }));

    expect(window.location.hash).toBe('');
    expect(headerTrigger).toHaveFocus();
    headerTrigger.remove();
  });

  it('keeps an unresolved draft item when its metadata request fails', async () => {
    const unavailableVideo = {
      ...initialVideos.data[0],
      id: 'vid_unavailable',
      title: 'Vidéo temporairement indisponible',
    };
    addVideoToDraft(unavailableVideo);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'upstream_error',
          message: 'An unexpected error occurred.',
        }),
        { status: 503 },
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

    const panel = screen.getByRole('complementary', { name: 'Ma séance' });
    expect(
      await within(panel).findByText(
        'Les informations de cette vidéo sont indisponibles.',
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', {
        name: /Réessayer de charger les informations de Vidéo/,
      }),
    ).toBeInTheDocument();
    expect(within(panel).getByRole('status')).toHaveTextContent(
      '1 vidéo · durée à confirmer',
    );
    expect(
      JSON.parse(localStorage.getItem(SESSION_DRAFT_STORAGE_KEY) ?? ''),
    ).toMatchObject({ video_ids: ['vid_unavailable'] });
  });

  it('states headset compatibility in text for every resolved draft item', () => {
    addVideoToDraft(compositionVideos.data[0]);
    addVideoToDraft(compositionVideos.data[1]);
    setDraftHeadset('pico-4');

    render(
      <CatalogueApp
        initialQuery={initialQuery}
        initialVideos={compositionVideos}
        initialReferences={initialReferences}
      />,
    );

    const panel = screen.getByRole('complementary', { name: 'Ma séance' });
    expect(
      within(panel).getByText('Compatible avec Pico 4'),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText('Non compatible avec Pico 4'),
    ).toBeInTheDocument();
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
      within(dialog).getByRole('button', { name: /^Ajouter à ma séance/ }),
    ).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    const scrollRegion = within(dialog).getByRole('region', {
      name: 'Contenu de la vidéo',
    });
    expect(scrollRegion).toHaveAttribute('tabindex', '0');
    await user.tab();
    expect(scrollRegion).toHaveFocus();
    await user.tab();
    expect(
      within(dialog).getByRole('button', { name: /^Ajouter à ma séance/ }),
    ).toHaveFocus();

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
      within(dialog).getByRole('button', { name: /^Ajouter à ma séance/ }),
    );

    const dialogRemoveButton = within(dialog).getByRole('button', {
      name: /^Retirer de ma séance/,
    });
    expect(dialogRemoveButton).toHaveAttribute('aria-pressed', 'true');
    expect(dialogRemoveButton).toHaveClass(
      'bg-secondary',
      'text-secondary-foreground',
    );
    expect(
      dialogRemoveButton.querySelector('[data-remove-from-draft-icon]'),
    ).toBeInTheDocument();
    const card = screen
      .getByRole('heading', {
        level: 2,
        name: 'Une journée avec Omar, jardinier municipal',
      })
      .closest('article');
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: /^Retirer de ma séance/,
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
        name: 'Les détails de la vidéo ne peuvent pas être chargés',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Réessayez dans quelques instants. Votre séance en cours est conservée.',
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
      screen.getByRole('searchbox', {
        name: 'Rechercher une vidéo par titre',
      }),
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
