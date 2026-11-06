import { randomUUID } from 'node:crypto';

import { buildSearchDictionary } from '@features/catalogue/search-dictionary.server';
import {
  createCataloguePreparation,
  MAX_PREPARATION_ATTEMPTS,
} from '@features/catalogue/search-preparation.server';
import {
  loadCatalogueSnapshot,
  type CatalogueSnapshot,
} from '@features/catalogue/search-snapshot.server';
import { getCatalogueClient } from '@lib/api/catalogue-client-instance.server';
import { CatalogueClientError } from '@lib/api/errors';

type EntryPoint = 'development' | 'production';
type LogLevel = 'info' | 'warn' | 'error';
export interface CatalogueLogRecord {
  event: string;
  runId: string;
  entryPoint: EntryPoint;
  pid: number;
  [key: string]: string | number;
}
interface RuntimeOptions {
  entryPoint: EntryPoint;
  loadSnapshot: (signal: AbortSignal) => Promise<CatalogueSnapshot>;
  write?: (level: LogLevel, record: CatalogueLogRecord) => void;
}

function writeLog(level: LogLevel, record: CatalogueLogRecord) {
  console[level](JSON.stringify(record));
}

/** Application lifecycle wrapper; the dictionary builder itself stays pure. */
export function createCatalogueRuntime({
  entryPoint,
  loadSnapshot,
  write = writeLog,
}: RuntimeOptions) {
  let runId = '';
  let trigger = 'startup';
  let startedAt = 0;
  let attempt = 0;
  let stage: 'catalogue' | 'dictionary' = 'catalogue';
  const duration = (start: number) => Math.round(performance.now() - start);
  function log(
    level: LogLevel,
    event: string,
    fields: Record<string, string | number> = {},
  ) {
    try {
      write(level, {
        level,
        event,
        runId,
        entryPoint,
        trigger,
        pid: process.pid,
        ...fields,
      });
    } catch {
      console.error(
        JSON.stringify({
          event: 'catalogue.logging_failed',
          runId,
          entryPoint,
          pid: process.pid,
        }),
      );
    }
  }
  const preparation = createCataloguePreparation({
    async loadSnapshot(signal) {
      const start = performance.now();
      const snapshot = await loadSnapshot(signal);
      signal.throwIfAborted();
      log('info', 'catalogue.loaded', {
        attempt,
        videos: snapshot.videos.length,
        jobs: snapshot.jobs.data.length,
        audiences: snapshot.audiences.data.length,
        headsets: snapshot.headsets.data.length,
        durationMs: duration(start),
      });
      return snapshot;
    },
    buildDictionary(snapshot) {
      stage = 'dictionary';
      const start = performance.now();
      const dictionary = buildSearchDictionary(snapshot);
      log(
        dictionary.diagnostics.length ? 'warn' : 'info',
        'catalogue.dictionary_built',
        {
          attempt,
          ruleVersion: dictionary.version,
          titleKeywords: dictionary.titles.length,
          jobVocabulary: dictionary.jobTerms.length,
          diagnostics: dictionary.diagnostics.length,
          durationMs: duration(start),
        },
      );
      return dictionary;
    },
    onEvent(event) {
      if (event.type === 'attempt') {
        attempt = event.attempt;
        stage = 'catalogue';
        if (attempt === 1) {
          trigger = event.trigger === 'retry' ? 'manual-retry' : 'startup';
          runId = randomUUID();
          startedAt = performance.now();
        }
        log('info', 'catalogue.preparing', {
          attempt,
          maxAttempts: MAX_PREPARATION_ATTEMPTS,
        });
      } else if (event.type === 'retry' || event.type === 'failed') {
        const fields = {
          attempt: event.attempt,
          stage,
          kind:
            event.error instanceof CatalogueClientError
              ? event.error.kind
              : 'internal',
          ...(event.error instanceof CatalogueClientError
            ? { status: event.error.status }
            : {}),
          ...(event.type === 'retry'
            ? { delayMs: event.delayMs }
            : { durationMs: duration(startedAt) }),
        };
        log(
          event.type === 'retry' ? 'warn' : 'error',
          `catalogue.${event.type}`,
          fields,
        );
      } else if (event.type === 'ready') {
        log('info', 'catalogue.ready', {
          attempt,
          durationMs: duration(startedAt),
        });
      } else if (runId)
        log('info', 'catalogue.stopped', {
          stage,
          durationMs: duration(startedAt),
        });
    },
  });
  return preparation;
}

const RUNTIME_KEY = Symbol.for('metiers360.catalogue.runtime');
type Runtime = ReturnType<typeof createCatalogueRuntime>;
type RuntimeOwner = { runtime: Runtime; removeSignals?: () => void };
const processGlobals = globalThis as typeof globalThis & {
  [RUNTIME_KEY]?: RuntimeOwner;
};

/** Same process owner even if Vite invalidates/reimports the SSR module. */
export function getCatalogueRuntime(entryPoint?: EntryPoint): Runtime {
  if (!processGlobals[RUNTIME_KEY] && !entryPoint)
    throw new Error('Catalogue runtime has not been started.');
  processGlobals[RUNTIME_KEY] ??= {
    runtime: createCatalogueRuntime({
      entryPoint: entryPoint!,
      loadSnapshot: (signal) =>
        loadCatalogueSnapshot(getCatalogueClient(), signal),
    }),
  };
  return processGlobals[RUNTIME_KEY].runtime;
}

export function stopCataloguePreparation() {
  const owner = processGlobals[RUNTIME_KEY];
  if (!owner) return;
  owner.removeSignals?.();
  owner.runtime.shutdown();
  delete processGlobals[RUNTIME_KEY];
}

/** Called only by server-start entry points, never module evaluation/build. */
export function startCataloguePreparation(entryPoint: EntryPoint) {
  const runtime = getCatalogueRuntime(entryPoint);
  const owner = processGlobals[RUNTIME_KEY]!;
  if (!owner.removeSignals) {
    const hadListeners = {
      SIGINT: process.listenerCount('SIGINT') > 0,
      SIGTERM: process.listenerCount('SIGTERM') > 0,
    };
    const onInterrupt = () => handleSignal('SIGINT');
    const onTerminate = () => handleSignal('SIGTERM');
    function handleSignal(signal: 'SIGINT' | 'SIGTERM') {
      stopCataloguePreparation();
      // Retain the CLI's own shutdown handling, or the original Node default.
      if (!hadListeners[signal] && process.listenerCount(signal) === 0)
        process.kill(process.pid, signal);
    }
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onTerminate);
    owner.removeSignals = () => {
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onTerminate);
    };
  }
  void runtime.start();
}
