// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogueSearchForm } from '@components/catalogue/CatalogueSearchForm';
import type { CatalogueAvailabilityContext } from '@features/catalogue/use-catalogue-availability';

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
const seed: CatalogueAvailabilityContext = {
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const onSubmit = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <CatalogueSearchForm
        applied={seed.criteria}
        references={references}
        availabilityContext={seed}
        onSubmit={onSubmit}
      />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onSubmit };
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
    const { user, onSubmit } = setup();
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
    expect(onSubmit).not.toHaveBeenCalled();
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
    const { user, onSubmit } = setup();
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
    expect(onSubmit).not.toHaveBeenCalled();
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
    const { user, onSubmit } = setup();
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
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Public')).toHaveAccessibleDescription(
      /options sans vidéo/,
    );
  });
});
