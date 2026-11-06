import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCataloguePreparation } from '@features/catalogue/search-preparation.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import { CatalogueClientError } from '@lib/api/errors';

const snapshot: CatalogueSnapshot = {
  videos: [],
  jobs: { data: [], source: 'test' },
  audiences: { data: [] },
  headsets: { data: [] },
};
const unavailable = () =>
  new CatalogueClientError({
    kind: 'upstream',
    status: 503,
    message: 'Unavailable',
  });

function setup() {
  const loadSnapshot = vi
    .fn<(signal: AbortSignal) => Promise<CatalogueSnapshot>>()
    .mockResolvedValue(snapshot);
  const buildDictionary = vi.fn().mockResolvedValue({ terms: ['Omar'] });
  const reportFailure = vi.fn();
  const preparation = createCataloguePreparation({
    loadSnapshot,
    buildDictionary,
    reportFailure,
  });
  return { preparation, loadSnapshot, buildDictionary, reportFailure };
}

afterEach(() => vi.useRealTimers());

describe('catalogue preparation', () => {
  it('shares preparation, withholds readiness until dictionary completion and reuses warm data', async () => {
    const { preparation, loadSnapshot, buildDictionary } = setup();
    let finish!: (value: { terms: string[] }) => void;
    buildDictionary.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    expect(preparation.getState()).toEqual({ status: 'idle' });
    const first = preparation.start();
    expect(preparation.start()).toBe(first);
    expect(preparation.retry()).toBe(first);
    await vi.waitFor(() => expect(buildDictionary).toHaveBeenCalledOnce());
    expect(preparation.getState()).toEqual({ status: 'preparing', attempt: 1 });
    finish({ terms: ['Omar'] });
    expect(await first).toMatchObject({
      status: 'ready',
      snapshot,
      dictionary: { terms: ['Omar'] },
    });
    await preparation.start();
    await preparation.retry();
    expect(loadSnapshot).toHaveBeenCalledOnce();
    expect(buildDictionary).toHaveBeenCalledOnce();
  });

  it('makes four attempts with 1/2/4-second waits, then permits one shared manual recovery', async () => {
    vi.useFakeTimers();
    const { preparation, loadSnapshot, buildDictionary } = setup();
    loadSnapshot.mockRejectedValue(unavailable());
    const first = preparation.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    for (const [delay, count] of [
      [1000, 2],
      [2000, 3],
      [4000, 4],
    ]) {
      await vi.advanceTimersByTimeAsync(delay! - 1);
      expect(loadSnapshot).toHaveBeenCalledTimes(count! - 1);
      await vi.advanceTimersByTimeAsync(1);
      expect(loadSnapshot).toHaveBeenCalledTimes(count!);
    }
    expect(await first).toMatchObject({
      status: 'failed',
      attempt: 4,
      message: expect.any(String),
    });
    expect(buildDictionary).not.toHaveBeenCalled();
    await preparation.start();
    expect(loadSnapshot).toHaveBeenCalledTimes(4);
    loadSnapshot.mockResolvedValue(snapshot);
    const recovery = preparation.retry();
    expect(preparation.retry()).toBe(recovery);
    expect(await recovery).toMatchObject({ status: 'ready' });
    expect(loadSnapshot).toHaveBeenCalledTimes(5);
  });

  it.each(['configuration', 'invalid-response'] as const)(
    'does not automatically retry %s errors',
    async (kind) => {
      const { preparation, loadSnapshot } = setup();
      loadSnapshot.mockRejectedValue(
        new CatalogueClientError({
          kind,
          status: 500,
          message: 'Internal diagnostic',
        }),
      );
      expect(await preparation.start()).toMatchObject({
        status: 'failed',
        attempt: 1,
      });
      expect(loadSnapshot).toHaveBeenCalledOnce();
      expect(JSON.stringify(preparation.getState())).not.toContain(
        'Internal diagnostic',
      );
    },
  );

  it.each([400, 401, 403, 404, 422])(
    'does not retry upstream HTTP %s',
    async (status) => {
      const { preparation, loadSnapshot } = setup();
      loadSnapshot.mockRejectedValue(
        new CatalogueClientError({
          kind: 'upstream',
          status,
          message: 'Rejected',
        }),
      );
      expect(await preparation.start()).toMatchObject({
        status: 'failed',
        attempt: 1,
      });
      expect(loadSnapshot).toHaveBeenCalledOnce();
    },
  );

  it.each(['transport', 'timeout', 408, 429, 500] as const)(
    'recovers from transient %s failure',
    async (failure) => {
      vi.useFakeTimers();
      const { preparation, loadSnapshot } = setup();
      loadSnapshot.mockRejectedValueOnce(
        new CatalogueClientError({
          kind: typeof failure === 'number' ? 'upstream' : failure,
          status: typeof failure === 'number' ? failure : 503,
          message: 'Transient',
        }),
      );
      const pending = preparation.start();
      await vi.advanceTimersByTimeAsync(1000);
      expect(await pending).toMatchObject({ status: 'ready' });
      expect(loadSnapshot).toHaveBeenCalledTimes(2);
    },
  );

  it('caps Retry-After at 30 seconds and never starts overlapping retries', async () => {
    vi.useFakeTimers();
    const { preparation, loadSnapshot } = setup();
    loadSnapshot.mockRejectedValueOnce(
      new CatalogueClientError({
        kind: 'upstream',
        status: 429,
        retryAfterMs: 90_000,
        message: 'Wait',
      }),
    );
    const pending = preparation.start();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    expect(preparation.retry()).toBe(pending);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ status: 'ready' });
  });

  it('does not publish a snapshot when dictionary construction fails', async () => {
    const { preparation, buildDictionary, loadSnapshot } = setup();
    buildDictionary.mockRejectedValue(new Error('Builder failure'));
    expect(await preparation.start()).toMatchObject({
      status: 'failed',
      attempt: 1,
    });
    expect(preparation.getState()).not.toHaveProperty('snapshot');
    expect(loadSnapshot).toHaveBeenCalledOnce();
  });

  it('shutdown aborts in-flight work and prevents late completion from publishing ready', async () => {
    const { preparation, loadSnapshot, buildDictionary } = setup();
    let complete!: (value: CatalogueSnapshot) => void;
    loadSnapshot.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = preparation.start();
    await vi.waitFor(() => expect(loadSnapshot).toHaveBeenCalledOnce());
    const signal = loadSnapshot.mock.calls[0]![0];
    preparation.shutdown();
    expect(signal.aborted).toBe(true);
    complete(snapshot);
    expect(await pending).toEqual({ status: 'stopped' });
    expect(buildDictionary).not.toHaveBeenCalled();
    expect(await preparation.retry()).toEqual({ status: 'stopped' });
  });

  it('shutdown clears a retry timer and does not resurrect preparation', async () => {
    vi.useFakeTimers();
    const { preparation, loadSnapshot } = setup();
    loadSnapshot.mockRejectedValue(unavailable());
    const pending = preparation.start();
    await vi.advanceTimersByTimeAsync(0);
    preparation.shutdown();
    expect(await pending).toEqual({ status: 'stopped' });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('cannot restart an attempt if shutdown occurs just after its retry timer fires', async () => {
    vi.useFakeTimers();
    const { preparation, loadSnapshot } = setup();
    loadSnapshot.mockRejectedValue(unavailable());
    const pending = preparation.start();
    await vi.advanceTimersByTimeAsync(0);
    vi.advanceTimersByTime(1_000);
    preparation.shutdown();
    expect(await pending).toEqual({ status: 'stopped' });
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });
});
