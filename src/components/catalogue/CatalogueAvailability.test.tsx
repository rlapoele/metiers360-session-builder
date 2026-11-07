// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogueSearchPage } from '@features/catalogue/search-contracts';
import { CatalogueApp } from '@components/catalogue/CatalogueApp';

const references = {
  audiences: {
    data: [
      { id: 'college', label: 'Collégiens' },
      { id: 'tout-public', label: 'Tout public' },
    ],
  },
  headsets: {
    data: [
      { id: 'pico-4', name: 'Pico 4' },
      { id: 'quest', name: 'Quest' },
    ],
  },
};
const seed: Pick<CatalogueSearchPage['context'], 'criteria' | 'availability'> =
  {
    criteria: { selected: [], audience: 'college', legacyQuery: 'Omar' },
    availability: {
      audiences: [
        { id: 'college', count: 0, available: false },
        { id: 'tout-public', count: 1, available: true },
      ],
      headsets: [
        { id: 'pico-4', count: 1, available: true },
        { id: 'quest', count: 0, available: false },
      ],
    },
  };
function reply(context = seed) {
  return new Response(
    JSON.stringify({
      data: [],
      meta: { page: 1, per_page: 24, total: 0, total_pages: 1 },
      context: {
        ...context,
        references: { ...references, jobs: { data: [], source: 'test' } },
      },
    }),
  );
}
function setup() {
  window.history.replaceState({}, '', '/?audience=college&q=Omar');
  render(
    <CatalogueApp
      initialSearch="audience=college&q=Omar"
      initialResult={{
        status: 200,
        body: {
          data: [],
          meta: { page: 1, per_page: 24, total: 0, total_pages: 1 },
          context: {
            ...seed,
            references: { ...references, jobs: { data: [], source: 'test' } },
          },
        },
      }}
    />,
  );
  return { user: userEvent.setup() };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('accessible contextual dropdowns', () => {
  it('disables only known unavailable values, preserves selected values and keeps defaults/removals usable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply()),
    );
    const { user } = setup();
    const college = screen.getByRole('option', { name: /Collégiens/ });
    expect(college).toBeDisabled();
    expect(college).toHaveTextContent('Aucune vidéo avec ces critères');
    expect(screen.getByLabelText('Public')).toHaveValue('college');
    expect(screen.getByRole('option', { name: 'Tout public' })).toBeEnabled();
    expect(
      screen.getByRole('option', { name: 'Tous les publics' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('option', { name: 'Tous les casques' }),
    ).toBeEnabled();
    expect(screen.getByRole('option', { name: /Quest/ })).toBeDisabled();
    await user.click(
      screen.getByRole('button', {
        name: 'Retirer le critère Public : Collégiens',
      }),
    );
    expect(screen.getByLabelText('Public')).toHaveValue('');
    expect(screen.getByLabelText('Public')).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Rechercher' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Effacer tous les critères' }),
    );
    expect(screen.getByLabelText('Public')).toHaveValue('');
    expect(
      screen.queryByRole('list', { name: 'Critères sélectionnés' }),
    ).not.toBeInTheDocument();
  });
  it('typing fetches suggestions with the complete context but does not refresh dropdown availability', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ data: [] })),
    );
    vi.stubGlobal('fetch', fetcher);
    const { user } = setup();
    await user.type(
      screen.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
      'jard',
    );
    await screen.findByText('Aucune suggestion. Essayez un autre terme.');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const requested = new URL(
      String(fetcher.mock.calls[0]?.[0]),
      'http://localhost',
    );
    expect(requested.pathname).toBe('/api/catalogue/suggestions');
    expect(requested.searchParams.get('q')).toBe('Omar');
    expect(requested.searchParams.get('audience')).toBe('college');
    expect(
      screen.queryByRole('button', { name: 'Rechercher' }),
    ).not.toBeInTheDocument();
  });
  it('marks previous indications provisional, enables unknown alternatives during loading and offers focused recovery', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Casque VR'), 'pico-4');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('option', { name: /Quest/ })).toBeEnabled();
    expect(screen.getByRole('option', { name: /Quest/ })).toHaveTextContent(
      'critères précédents',
    );
    expect(screen.getByLabelText('Public')).toBeEnabled();
    expect(screen.getByText(/Mise à jour de la disponibilité/)).toBeVisible();
    await act(async () => release(new Response('{}', { status: 500 })));
    const retry = await screen.findByRole('button', {
      name: 'Réessayer la disponibilité',
    });
    expect(screen.getByRole('option', { name: /Quest/ })).toBeEnabled();
    fetcher.mockImplementation(async () => reply());
    await user.click(retry);
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Quest/ })).toBeDisabled(),
    );
    expect(screen.getByLabelText('Public')).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Rechercher' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Public')).toHaveAccessibleDescription(
      /options sans vidéo/,
    );
  });
});
