// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useCatalogueAvailability } from '@features/catalogue/use-catalogue-availability';
import type { SearchFormCriteria } from '@features/catalogue/search-form';

const initial = {
  criteria: { selected: [] },
  availability: {
    audiences: [{ id: 'college', count: 0, available: false }],
    headsets: [{ id: 'pico-4', count: 2, available: true }],
  },
};
function response(context = initial) {
  return new Response(
    JSON.stringify({
      data: [],
      meta: { page: 1, per_page: 24, total: 0, total_pages: 1 },
      context: {
        ...context,
        references: {
          jobs: { data: [], source: 'test' },
          audiences: { data: [] },
          headsets: { data: [] },
        },
      },
    }),
  );
}
function setup(seed = initial) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ criteria }: { criteria: SearchFormCriteria }) =>
      useCatalogueAvailability(criteria, true, seed),
    {
      wrapper,
      initialProps: { criteria: { selected: [] } as SearchFormCriteria },
    },
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('contextual dropdown availability', () => {
  it('reuses matching SSR metadata without a redundant request', () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { result } = setup();
    expect(result.current.current).toEqual(initial.availability);
    expect(result.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('releases stale disabled flags immediately, uses complete pending context and ignores obsolete responses', async () => {
    let release!: (value: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      )
      .mockImplementation(async () =>
        response({
          ...initial,
          criteria: { selected: [] },
          availability: {
            audiences: [{ id: 'college', count: 3, available: true }],
            headsets: [],
          },
        }),
      );
    vi.stubGlobal('fetch', fetcher);
    const { result, rerender } = setup();
    rerender({
      criteria: {
        selected: [],
        audience: 'college',
        legacyQuery: 'Omar',
        headset: 'pico-4',
      },
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(result.current.current).toBeUndefined();
    expect(result.current.previous).toEqual(initial.availability);
    const requested = new URL(
      String(fetcher.mock.calls[0]?.[0]),
      'http://localhost',
    );
    expect(requested.searchParams.get('q')).toBe('Omar');
    expect(requested.searchParams.get('audience')).toBe('college');
    expect(requested.searchParams.get('headset')).toBe('pico-4');
    expect(requested.searchParams.get('include')).toBe('context');
    const signal = fetcher.mock.calls[0]?.[1]?.signal;
    rerender({ criteria: { selected: [], audience: 'tout-public' } });
    await waitFor(() =>
      expect(result.current.current?.audiences[0]?.count).toBe(3),
    );
    expect(signal?.aborted).toBe(true);
    await act(async () => release(response()));
    expect(result.current.current?.audiences[0]?.available).toBe(true);
  });
  it('retains previous information without disabling unknown options after failure and retries the current context', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{}', { status: 500 }));
    vi.stubGlobal('fetch', fetcher);
    const { result, rerender } = setup();
    rerender({ criteria: { selected: [], audience: 'college' } });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.current).toBeUndefined();
    expect(result.current.previous).toEqual(initial.availability);
    fetcher.mockImplementation(async () => response());
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.current).toEqual(initial.availability),
    );
    expect(result.current.error).toBeFalsy();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not carry a failed manual recovery into a different criteria context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) => {
        if (String(input).endsWith('/retry'))
          return new Response('{}', { status: 500 });
        if (String(input).includes('audience=tout-public')) return response();
        return new Response(
          JSON.stringify({
            error: 'catalogue_failed',
            status: 'failed',
            message: 'Échec',
            canRetry: true,
          }),
          { status: 503 },
        );
      }),
    );
    const { result, rerender } = setup();
    rerender({ criteria: { selected: [], audience: 'college' } });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.error).toMatchObject({
        message: 'Le catalogue ne peut pas être préparé. Réessayez.',
      }),
    );
    rerender({ criteria: { selected: [], audience: 'tout-public' } });
    await waitFor(() =>
      expect(result.current.current).toEqual(initial.availability),
    );
    expect(result.current.error).toBeFalsy();
  });
  it('polls preparation and replaces terminal status when a manual bounded cycle starts', async () => {
    let retried = false;
    let ready = false;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) => {
        const path = String(input);
        if (path.endsWith('/retry')) {
          retried = true;
          return new Response(
            JSON.stringify({
              status: 'preparing',
              attempt: 1,
              message: 'Préparation',
              canRetry: false,
            }),
          );
        }
        if (path.endsWith('/status')) {
          ready = true;
          return new Response(JSON.stringify({ status: 'ready' }));
        }
        return ready
          ? response()
          : new Response(
              JSON.stringify(
                retried
                  ? {
                      error: 'catalogue_preparing',
                      status: 'preparing',
                      attempt: 1,
                      message: 'Préparation',
                      canRetry: false,
                    }
                  : {
                      error: 'catalogue_failed',
                      status: 'failed',
                      message: 'Échec',
                      canRetry: true,
                    },
              ),
              { status: 503 },
            );
      }),
    );
    const { result, rerender } = setup();
    rerender({ criteria: { selected: [], audience: 'college' } });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.current).toEqual(initial.availability),
    );
    expect(retried).toBe(true);
  });
});
