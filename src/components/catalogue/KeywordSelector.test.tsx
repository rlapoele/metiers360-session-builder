// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeywordSelector } from '@components/catalogue/KeywordSelector';
import type { KeywordSuggestion } from '@features/catalogue/keyword-suggestions';

const suggestions: KeywordSuggestion[] = [
  {
    category: 'job',
    key: 'A1203',
    jobCode: 'A1203',
    sourceKey: 'appellation/jardinier municipal',
    label: 'Jardinier municipal',
    jobLabel: 'Entretien des espaces verts',
  },
  { category: 'title', key: 'jardinier', label: 'jardinier' },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup(selected: KeywordSuggestion[] = []) {
  const onSelect = vi.fn();
  const submit = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Harness() {
    const [value, setValue] = useState('');
    return (
      <QueryClientProvider client={client}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <KeywordSelector
            value={value}
            onValueChange={setValue}
            selected={selected}
            onSelect={onSelect}
          />
          <button type="submit">Rechercher</button>
        </form>
      </QueryClientProvider>
    );
  }
  render(<Harness />);
  return {
    input: screen.getByRole('combobox'),
    onSelect,
    submit,
    user: userEvent.setup(),
  };
}
function success() {
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ data: suggestions })),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('accessible grouped keyword selector', () => {
  it('requires two normalized characters and debounces requests', async () => {
    const fetcher = success();
    const { input, user } = setup();
    await user.type(input, 'j');
    await new Promise((resolve) => setTimeout(resolve, 230));
    expect(fetcher).not.toHaveBeenCalled();
    await user.type(input, 'ard');
    expect(fetcher).not.toHaveBeenCalled();
    await screen.findByRole('option', { name: /Jardinier municipal/ });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toContain('term=jard');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });
  it('groups categories, preserves appellations and selects with arrows/Enter without submitting', async () => {
    success();
    const { input, user, onSelect, submit } = setup();
    await user.type(input, 'jard');
    await screen.findByRole('group', { name: 'Métier' });
    expect(screen.getByRole('group', { name: 'Titre de vidéo' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Métiers ou mots-clés' })).toBe(
      input,
    );
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(suggestions[0]);
    expect(submit).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
  it('does not create a free-text selection; Escape dismisses without clearing text and Tab leaves', async () => {
    success();
    const { input, user, onSelect } = setup();
    await user.type(input, 'jard');
    await screen.findAllByRole('option');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('jard');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Rechercher' })).toHaveFocus();
  });
  it('announces no suggestions and exposes a keyboard-accessible retry on failure', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal('fetch', fetcher);
    const { input, user } = setup();
    await user.type(input, 'zz');
    await screen.findByText('Aucune suggestion. Essayez un autre terme.');
    fetcher.mockImplementation(async () => new Response('{}', { status: 500 }));
    await user.clear(input);
    await user.type(input, 'jard');
    await screen.findByRole('button', { name: 'Réessayer les suggestions' });
    fetcher.mockImplementation(
      async () => new Response(JSON.stringify({ data: suggestions })),
    );
    await user.click(
      screen.getByRole('button', { name: 'Réessayer les suggestions' }),
    );
    await screen.findAllByRole('option');
    expect(input).toHaveValue('jard');
    expect(input).toHaveFocus();
  });

  it('ignores an obsolete response even when the transport ignores cancellation', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      )
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ category: 'title', key: 'omar', label: 'Omar' }],
            }),
          ),
      );
    vi.stubGlobal('fetch', fetcher);
    const { input, user, onSelect } = setup();
    await user.type(input, 'jard');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const signal = fetcher.mock.calls[0]?.[1]?.signal;
    await user.clear(input);
    await user.type(input, 'omar');
    await screen.findByRole('option', { name: 'Omar' });
    expect(signal?.aborted).toBe(true);
    await act(async () =>
      release(new Response(JSON.stringify({ data: suggestions }))),
    );
    expect(
      screen.queryByRole('option', { name: /Jardinier municipal/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Omar' }));
    expect(onSelect).toHaveBeenCalledWith({
      category: 'title',
      key: 'omar',
      label: 'Omar',
    });
  });

  it('waits for preparation status and automatically resumes suggestions when ready', async () => {
    let ready = false;
    const fetcher = vi.fn<typeof fetch>(async (path) => {
      if (String(path).includes('/status')) {
        ready = true;
        return new Response(JSON.stringify({ status: 'ready' }));
      }
      return ready
        ? new Response(JSON.stringify({ data: suggestions }))
        : new Response(
            JSON.stringify({
              error: 'catalogue_preparing',
              status: 'preparing',
              attempt: 1,
              message: 'Préparation',
              canRetry: false,
            }),
            { status: 503 },
          );
    });
    vi.stubGlobal('fetch', fetcher);
    const { input, user } = setup();
    await user.type(input, 'jard');
    await screen.findByRole('option', { name: /Jardinier municipal/ });
    expect(
      fetcher.mock.calls.filter(([path]) => String(path).includes('/status')),
    ).toHaveLength(1);
  });

  it('stops automatic polling on failed preparation and offers explicit recovery', async () => {
    let recovered = false;
    const fetcher = vi.fn<typeof fetch>(async (path) => {
      if (String(path).includes('/retry')) {
        recovered = true;
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
      return recovered
        ? new Response(JSON.stringify({ data: suggestions }))
        : new Response(
            JSON.stringify({
              error: 'catalogue_failed',
              status: 'failed',
              message: 'Indisponible',
              canRetry: true,
            }),
            { status: 503 },
          );
    });
    vi.stubGlobal('fetch', fetcher);
    const { input, user } = setup();
    await user.type(input, 'jard');
    await user.click(
      await screen.findByRole('button', { name: 'Réessayer les suggestions' }),
    );
    await screen.findAllByRole('option');
    expect(
      fetcher.mock.calls.filter(([path]) => String(path).includes('/retry')),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls.some(([path]) => String(path).includes('/status')),
    ).toBe(false);
    expect(input).toHaveValue('jard');
  });

  it('hides selected identities and stops adding at ten criteria without clearing text', async () => {
    const fetcher = success();
    const { input, user } = setup(
      Array.from({ length: 10 }, (_, i) => ({
        category: 'title',
        key: `word${i}`,
        label: `Word ${i}`,
      })),
    );
    await user.type(input, 'jard');
    expect(screen.getByText(/Dix critères sélectionnés/)).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
    expect(input).toHaveValue('jard');
  });
  it('excludes an already selected job even if a stale server response contains it', async () => {
    success();
    const { input, user, onSelect } = setup([suggestions[0]!]);
    await user.type(input, 'jard');
    await screen.findByRole('option', { name: 'jardinier' });
    expect(
      screen.queryByRole('option', { name: /Jardinier municipal/ }),
    ).not.toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
  });

  it('counts Unicode characters rather than UTF-16 units for the typing threshold', async () => {
    const fetcher = success();
    const { input, user } = setup();
    await user.type(input, '𐐀');
    await new Promise((resolve) => setTimeout(resolve, 230));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows a recoverable error when preparation status cannot be checked', async () => {
    let failed = true;
    const fetcher = vi.fn<typeof fetch>(async (path) => {
      if (String(path).includes('/status'))
        return failed
          ? new Response('{}', { status: 500 })
          : new Response(JSON.stringify({ status: 'ready' }));
      return failed
        ? new Response(
            JSON.stringify({
              error: 'catalogue_preparing',
              status: 'preparing',
              attempt: 1,
              message: 'Préparation',
              canRetry: false,
            }),
            { status: 503 },
          )
        : new Response(JSON.stringify({ data: suggestions }));
    });
    vi.stubGlobal('fetch', fetcher);
    const { input, user } = setup();
    await user.type(input, 'jard');
    const retry = await screen.findByRole('button', {
      name: 'Réessayer les suggestions',
    });
    failed = false;
    await user.click(retry);
    await screen.findAllByRole('option');
  });
});
