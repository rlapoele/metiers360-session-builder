// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueApp } from '@components/catalogue/CatalogueApp';
import type {
  CataloguePageResult,
  CatalogueSearchPage,
} from '@features/catalogue/search-contracts';
import { clearDraftAfterSave } from '@features/sessions/session-draft.store';

const job = {
  category: 'job' as const,
  key: 'I1604',
  jobCode: 'I1604',
  sourceKey: 'appellation/garagiste',
  label: 'Garagiste',
  jobLabel: 'Mécanicien automobile',
};
const base: CatalogueSearchPage = {
  data: [
    {
      id: 'vid_001',
      title: 'Omar au garage',
      description: 'Immersion',
      duration_seconds: 60,
      jobs: ['I1604'],
      audiences: ['college'],
      compatible_headsets: ['pico-4', 'quest'],
      thumbnail_url: null,
      published_at: '2024-01-01',
    },
  ],
  meta: { page: 1, per_page: 24, total: 25, total_pages: 2 },
  context: {
    availability: { audiences: [], headsets: [] },
    criteria: { selected: [] },
    references: {
      jobs: {
        data: [
          {
            code: 'I1604',
            label: 'Mécanicien automobile',
            major_domain: { code: 'I', label: 'Installation' },
            professional_domain: { code: 'I16', label: 'Maintenance' },
            appellations: ['Garagiste'],
          },
        ],
        source: 'test',
      },
      audiences: { data: [{ id: 'college', label: 'Collégiens' }] },
      headsets: {
        data: [
          { id: 'pico-4', name: 'Pico 4' },
          { id: 'quest', name: 'Quest' },
        ],
      },
    },
  },
};
const input = () =>
  screen.getByRole('combobox', { name: 'Métiers ou mots-clés' });
function mount(
  initialResult: CataloguePageResult = { status: 200, body: base },
  search = '',
) {
  window.history.replaceState({}, '', `/${search ? `?${search}` : ''}`);
  render(<CatalogueApp initialSearch={search} initialResult={initialResult} />);
}
beforeEach(() => {
  localStorage.clear();
  clearDraftAfterSave();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('live catalogue search integration', () => {
  it('commits dropdown choices while preserving, previous cards/count and headset display through failure', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () =>
        fail
          ? new Response('{}', { status: 500 })
          : new Response(
              JSON.stringify({
                ...base,
                context: {
                  ...base.context,
                  criteria: { selected: [], headset: 'pico-4' },
                },
              }),
            ),
      ),
    );
    mount();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Casque VR'), 'pico-4');
    expect(window.location.search).toBe('?headset=pico-4');
    expect(
      screen.queryByRole('button', { name: 'Rechercher' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Casque VR')).toHaveFocus();
    expect(window.location.search).toBe('?headset=pico-4');
    await screen.findByRole('heading', {
      name: 'Le catalogue ne peut pas être chargé',
    });
    expect(
      screen.getByRole('heading', { name: 'Omar au garage' }),
    ).toBeVisible();
    expect(
      screen.getByText(/25 vidéos trouvées — résultats précédents/),
    ).toBeVisible();
    expect(
      screen.getByRole('list', { name: 'Casques compatibles' }),
    ).toHaveTextContent('Quest');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() =>
      expect(
        screen.getByRole('list', { name: 'Casques compatibles' }),
      ).not.toHaveTextContent('Quest'),
    );
  });
  it('restores selected source labels and clears unfinished text and disclosures on history navigation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (request) => {
        const url = new URL(String(request), 'http://localhost');
        const selected = url.searchParams.has('job') ? [job] : [];
        return new Response(
          JSON.stringify({
            ...base,
            context: { ...base.context, criteria: { selected } },
          }),
        );
      }),
    );
    mount();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Public'), 'college');
    await act(async () => {
      window.history.pushState(
        {},
        '',
        '/?job=I1604&jobTerm=I1604%3Aappellation%2Fgaragiste',
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await screen.findByRole('button', {
      name: 'Retirer le critère Métier : Garagiste',
    });
    expect(screen.getByLabelText('Public')).toHaveValue('');
    await user.type(input(), 'x');
    await act(async () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(input()).toHaveValue(''));
    expect(
      screen.queryByRole('button', {
        name: 'Retirer le critère Métier : Garagiste',
      }),
    ).not.toBeInTheDocument();
  });
  it('restores known selected criteria on history navigation even when their search never succeeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    );
    mount();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Casque VR'), 'pico-4');
    await screen.findByRole('heading', {
      name: 'Le catalogue ne peut pas être chargé',
    });
    await user.selectOptions(screen.getByLabelText('Public'), 'college');
    await user.type(input(), 'x');
    await act(async () => {
      window.history.pushState({}, '', '/?headset=pico-4');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByLabelText('Casque VR')).toHaveValue('pico-4');
    expect(screen.getByLabelText('Public')).toHaveValue('');
    expect(input()).toHaveValue('');
    expect(input()).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: 'Retirer le critère Casque VR : Pico 4',
      }),
    ).toBeVisible();
  });
  it('retains criteria and selected source labels through pagination', async () => {
    const initial = {
      ...base,
      context: { ...base.context, criteria: { selected: [job] } },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ...initial, meta: { ...base.meta, page: 2 } }),
          ),
      ),
    );
    mount(
      { status: 200, body: initial },
      'job=I1604&jobTerm=I1604%3Aappellation%2Fgaragiste',
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2');
    expect(new URLSearchParams(window.location.search).get('jobTerm')).toBe(
      'I1604:appellation/garagiste',
    );
    await screen.findByText('Page 2 sur 2');
  });
  it('publishes only the newest response and availability after rapid committed changes, with one history entry per action', async () => {
    const releases: ((response: Response) => void)[] = [];
    const fetcher = vi.fn<typeof fetch>(
      () => new Promise((resolve) => releases.push(resolve)),
    );
    vi.stubGlobal('fetch', fetcher);
    mount();
    const history = vi.spyOn(window.history, 'pushState');
    const user = userEvent.setup();
    await user.type(input(), 'x');
    expect(history).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Casque VR'), 'pico-4');
    await user.selectOptions(screen.getByLabelText('Public'), 'college');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(history).toHaveBeenCalledTimes(2);
    expect(new URLSearchParams(window.location.search).get('headset')).toBe(
      'pico-4',
    );
    expect(new URLSearchParams(window.location.search).get('audience')).toBe(
      'college',
    );
    expect(input()).toHaveValue('x');
    expect(screen.getByLabelText('Public')).toHaveFocus();
    const newest = {
      ...base,
      data: [{ ...base.data[0]!, title: 'Réponse actuelle' }],
      meta: { page: 1, per_page: 24, total: 1, total_pages: 1 },
      context: {
        ...base.context,
        criteria: { selected: [], headset: 'pico-4', audience: 'college' },
        availability: {
          audiences: [{ id: 'college', count: 0, available: false }],
          headsets: [],
        },
      },
    };
    await act(async () => releases[1]!(new Response(JSON.stringify(newest))));
    await screen.findByRole('heading', { name: 'Réponse actuelle' });
    expect(screen.getByRole('option', { name: /Collégiens/ })).toBeDisabled();
    await act(async () =>
      releases[0]!(
        new Response(
          JSON.stringify({
            ...base,
            data: [{ ...base.data[0]!, title: 'Réponse obsolète' }],
          }),
        ),
      ),
    );
    expect(
      screen.queryByRole('heading', { name: 'Réponse obsolète' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Collégiens/ })).toBeDisabled();
    expect(screen.getByText('1 vidéo trouvée')).toBeVisible();
    expect(history).toHaveBeenCalledTimes(2);
    expect(input()).toHaveValue('x');
    history.mockRestore();
  });

  it('waits through preparation without false zero results and resumes automatically', async () => {
    let ready = false;
    const fetcher = vi.fn<typeof fetch>(async (path) => {
      if (String(path).includes('/status')) {
        ready = true;
        return new Response(JSON.stringify({ status: 'ready' }));
      }
      return new Response(JSON.stringify(base));
    });
    vi.stubGlobal('fetch', fetcher);
    mount({
      status: 503,
      retryAfter: 1,
      body: {
        error: 'catalogue_preparing',
        status: 'preparing',
        attempt: 1,
        message: 'Préparation',
        canRetry: false,
      },
    });
    expect(screen.queryByText(/0 vidéo/)).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Omar au garage' });
    expect(ready).toBe(true);
    expect(input()).toBeEnabled();
  });
  it('stops polling on failed startup and recovers explicitly without losing the form', async () => {
    let recovered = false;
    const fetcher = vi.fn<typeof fetch>(async (path) => {
      if (String(path).includes('/retry')) {
        recovered = true;
        return new Response(JSON.stringify({ status: 'ready' }));
      }
      return new Response(JSON.stringify(base));
    });
    vi.stubGlobal('fetch', fetcher);
    mount({
      status: 503,
      body: {
        error: 'catalogue_failed',
        status: 'failed',
        message: 'Échec',
        canRetry: true,
      },
    });
    expect(fetcher).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    await screen.findByRole('heading', { name: 'Omar au garage' });
    expect(recovered).toBe(true);
  });
  it('does not broaden invalid URLs until explicit correction automatically searches defaults', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        async (request) =>
          new Response(
            JSON.stringify({
              ...base,
              meta: {
                ...base.meta,
                page: Number(
                  new URL(String(request), 'http://localhost').searchParams.get(
                    'page',
                  ) ?? 1,
                ),
              },
            }),
          ),
      ),
    );
    mount(
      {
        status: 400,
        body: {
          error: 'validation_error',
          message: 'Invalide',
          details: [
            { field: 'job', message: 'Choisissez un métier du catalogue.' },
          ],
        },
      },
      'job=UNKNOWN&page=2',
    );
    expect(input()).toBeDisabled();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Réinitialiser la recherche' }),
    );
    await waitFor(() => expect(input()).toBeEnabled());
    expect(window.location.search).toBe('');
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false);
    await screen.findByRole('heading', { name: 'Omar au garage' });
    expect(window.location.search).toBe('');
  });
  it('preserves unfinished text during page loading without changing selected criteria', async () => {
    let release!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      ),
    );
    mount();
    const user = userEvent.setup();
    await user.type(input(), 'x');
    const originalInput = input();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2');
    await act(async () =>
      release(
        new Response(
          JSON.stringify({ ...base, meta: { ...base.meta, page: 2 } }),
        ),
      ),
    );
    expect(input()).toBe(originalInput);
    expect(input()).toHaveValue('x');
  });
  it('restarts status polling when a polled terminal failure is manually recovered', async () => {
    let started = false;
    let ready = false;
    const preparing = {
      error: 'catalogue_preparing',
      status: 'preparing',
      attempt: 1,
      message: 'Préparation',
      canRetry: false,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (path) => {
        if (String(path).includes('/retry')) {
          started = true;
          return new Response(
            JSON.stringify({
              status: 'preparing',
              attempt: 1,
              message: 'Préparation',
              canRetry: false,
            }),
            { status: 202 },
          );
        }
        if (String(path).includes('/status')) {
          if (started) {
            ready = true;
            return new Response(JSON.stringify({ status: 'ready' }));
          }
          return new Response(
            JSON.stringify({
              status: 'failed',
              message: 'Échec',
              canRetry: true,
            }),
          );
        }
        return ready
          ? new Response(JSON.stringify(base))
          : new Response(JSON.stringify(preparing), { status: 503 });
      }),
    );
    mount({
      status: 503,
      body: {
        ...preparing,
        error: 'catalogue_preparing' as const,
        status: 'preparing' as const,
        canRetry: false,
      },
    });
    await screen.findByRole('heading', {
      name: 'Le catalogue ne peut pas être préparé.',
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    await screen.findByRole(
      'heading',
      { name: 'Omar au garage' },
      { timeout: 2500 },
    );
  });
});
