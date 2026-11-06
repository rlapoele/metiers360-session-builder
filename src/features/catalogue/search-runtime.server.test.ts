import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCatalogueRuntime } from '@features/catalogue/search-runtime.server';
import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import { CatalogueClientError } from '@lib/api/errors';

vi.mock('@lib/api/catalogue-client-instance.server', () => ({
  getCatalogueClient: vi.fn(),
}));

const snapshot: CatalogueSnapshot = {
  videos: [],
  jobs: { data: [], source: 'test' },
  audiences: { data: [] },
  headsets: { data: [] },
};

afterEach(() => vi.useRealTimers());

describe('catalogue runtime and concise lifecycle logs', () => {
  it('shares a complete runtime and logs phase counts, timings and one correlation ID', async () => {
    const write = vi.fn();
    const loadSnapshot = vi.fn().mockResolvedValue(snapshot);
    const runtime = createCatalogueRuntime({
      entryPoint: 'production',
      loadSnapshot,
      write,
    });
    const first = runtime.start();
    expect(runtime.start()).toBe(first);
    expect(await first).toMatchObject({
      status: 'ready',
      dictionary: { version: 1 },
    });
    expect(write.mock.calls.map((call) => call[1].event)).toEqual([
      'catalogue.preparing',
      'catalogue.loaded',
      'catalogue.dictionary_built',
      'catalogue.ready',
    ]);
    const records = write.mock.calls.map((call) => call[1]);
    expect(new Set(records.map((record) => record.runId)).size).toBe(1);
    expect(records[0]).toMatchObject({
      entryPoint: 'production',
      attempt: 1,
      maxAttempts: 4,
    });
    expect(records[1]).toMatchObject({
      videos: 0,
      jobs: 0,
      durationMs: expect.any(Number),
    });
    expect(records[2]).toMatchObject({
      titleKeywords: 0,
      jobVocabulary: 0,
      diagnostics: 0,
      ruleVersion: 1,
    });
    await runtime.retry();
    expect(loadSnapshot).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledTimes(4);
    runtime.shutdown();
    runtime.shutdown();
    expect(write).toHaveBeenCalledTimes(5);
    expect(write.mock.lastCall?.[1].event).toBe('catalogue.stopped');
  });

  it('logs retry delay and terminal error without raw diagnostics, URLs or names; recovery starts a new cycle', async () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const error = new CatalogueClientError({
      kind: 'upstream',
      status: 503,
      message: 'private:secret@host Omar',
      diagnostics: { token: 'secret' },
    });
    const loadSnapshot = vi.fn().mockRejectedValue(error);
    const runtime = createCatalogueRuntime({
      entryPoint: 'development',
      loadSnapshot,
      write,
    });
    const pending = runtime.start();
    await vi.runAllTimersAsync();
    expect(await pending).toMatchObject({ status: 'failed' });
    expect(
      write.mock.calls.find((call) => call[1].event === 'catalogue.retry')?.[1],
    ).toMatchObject({
      delayMs: 1000,
      stage: 'catalogue',
      kind: 'upstream',
      status: 503,
    });
    expect(write.mock.lastCall?.[1]).toMatchObject({
      event: 'catalogue.failed',
      attempt: 4,
    });
    expect(JSON.stringify(write.mock.calls)).not.toMatch(/secret|Omar|private/);
    const firstRun = write.mock.calls[0]?.[1].runId;
    loadSnapshot.mockResolvedValue(snapshot);
    expect(await runtime.retry()).toMatchObject({ status: 'ready' });
    expect(write.mock.lastCall?.[1].runId).not.toBe(firstRun);
    expect(write.mock.lastCall?.[1].trigger).toBe('manual-retry');
    runtime.shutdown();
  });

  it('retains the same process owner across SSR module reloads without starting it on import', async () => {
    const first = await import('@features/catalogue/search-runtime.server');
    first.stopCataloguePreparation();
    expect(() => first.getCatalogueRuntime()).toThrow('not been started');
    const runtime = first.getCatalogueRuntime('development');
    expect(runtime.getState()).toEqual({ status: 'idle' });
    vi.resetModules();
    const reloaded = await import('@features/catalogue/search-runtime.server');
    expect(reloaded.getCatalogueRuntime()).toBe(runtime);
    reloaded.stopCataloguePreparation();
    expect(runtime.getState()).toEqual({ status: 'stopped' });
    expect(reloaded.getCatalogueRuntime('development')).not.toBe(runtime);
    reloaded.stopCataloguePreparation();
  });
});
