import type { CatalogueSnapshot } from '@features/catalogue/search-snapshot.server';
import { CatalogueClientError } from '@lib/api/errors';

export type CataloguePreparationState<Dictionary> =
  | { readonly status: 'idle' }
  | { readonly status: 'preparing'; readonly attempt: number }
  | {
      readonly status: 'ready';
      readonly snapshot: CatalogueSnapshot;
      readonly dictionary: Dictionary;
    }
  | {
      readonly status: 'failed';
      readonly attempt: number;
      readonly message: string;
    }
  | { readonly status: 'stopped' };

interface PreparationOptions<Dictionary> {
  loadSnapshot: (signal: AbortSignal) => Promise<CatalogueSnapshot>;
  buildDictionary: (
    snapshot: CatalogueSnapshot,
    signal: AbortSignal,
  ) => Dictionary | Promise<Dictionary>;
  reportFailure?: (error: unknown, attempt: number) => void;
  onEvent?: (event: CataloguePreparationEvent) => void;
}

export type CataloguePreparationEvent =
  | { type: 'attempt'; attempt: number; trigger: 'start' | 'retry' }
  | { type: 'retry'; attempt: number; delayMs: number; error: unknown }
  | { type: 'failed'; attempt: number; error: unknown }
  | { type: 'ready'; attempt: number }
  | { type: 'stopped' };

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
export const MAX_PREPARATION_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
const FAILURE_MESSAGE = 'Le catalogue ne peut pas être préparé. Réessayez.';

function retryDelay(error: unknown, attempt: number): number | undefined {
  const baseDelay = RETRY_DELAYS_MS[attempt - 1];
  if (baseDelay === undefined || !(error instanceof CatalogueClientError))
    return undefined;
  const retryable =
    error.kind === 'transport' ||
    error.kind === 'timeout' ||
    (error.kind === 'upstream' &&
      (error.status === 408 || error.status === 429 || error.status >= 500));
  if (!retryable) return undefined;
  return error.kind === 'upstream' && error.status === 429
    ? Math.max(
        baseDelay,
        Math.min(30_000, Math.max(0, error.retryAfterMs ?? 0)),
      )
    : baseDelay;
}

function waitForRetry(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

function logFailure(error: unknown, attempt: number) {
  // Do not log raw upstream bodies or configuration values.
  console.error('Catalogue preparation failed.', {
    attempt,
    kind: error instanceof CatalogueClientError ? error.kind : 'internal',
    status: error instanceof CatalogueClientError ? error.status : undefined,
  });
}

/**
 * Own one shared, bounded preparation cycle and retain successful data for its
 * owner's process lifetime. start() and concurrent recovery calls join it.
 *
 * The dictionary callback is required: no snapshot-only "ready" placeholder.
 * Task 14 supplies the real builder and creates the shared startup-owned instance.
 * shutdown() is process-owned, never attached to an individual visitor request.
 */
export function createCataloguePreparation<Dictionary>({
  loadSnapshot,
  buildDictionary,
  reportFailure,
  onEvent,
}: PreparationOptions<Dictionary>) {
  let state: CataloguePreparationState<Dictionary> = { status: 'idle' };
  let pending: Promise<CataloguePreparationState<Dictionary>> | undefined;
  let controller: AbortController | undefined;

  function emit(event: CataloguePreparationEvent) {
    try {
      onEvent?.(event);
    } catch {
      console.error('Catalogue preparation telemetry failed.');
    }
  }

  async function run(signal: AbortSignal, trigger: 'start' | 'retry') {
    for (let attempt = 1; attempt <= MAX_PREPARATION_ATTEMPTS; attempt += 1) {
      if (signal.aborted) return state;
      state = { status: 'preparing', attempt };
      emit({ type: 'attempt', attempt, trigger });
      try {
        const snapshot = await loadSnapshot(signal);
        signal.throwIfAborted();
        const dictionary = await buildDictionary(snapshot, signal);
        signal.throwIfAborted();
        state = { status: 'ready', snapshot, dictionary };
        emit({ type: 'ready', attempt });
        return state;
      } catch (error) {
        if (signal.aborted) return state;
        if (reportFailure) reportFailure(error, attempt);
        else if (!onEvent) logFailure(error, attempt);
        const delay = retryDelay(error, attempt);
        if (delay === undefined) {
          state = { status: 'failed', attempt, message: FAILURE_MESSAGE };
          emit({ type: 'failed', attempt, error });
          return state;
        }
        emit({ type: 'retry', attempt, delayMs: delay, error });
        try {
          await waitForRetry(delay, signal);
        } catch {
          return state;
        }
      }
    }
    return state;
  }

  function begin(trigger: 'start' | 'retry') {
    controller = new AbortController();
    const signal = controller.signal;
    state = { status: 'preparing', attempt: 1 };
    // Assign pending before invoking any caller-supplied work.
    pending = Promise.resolve()
      .then(() => (signal.aborted ? state : run(signal, trigger)))
      .finally(() => {
        pending = undefined;
      });
    return pending;
  }

  return {
    getState: () => state,
    start() {
      if (pending) return pending;
      return state.status === 'idle' ? begin('start') : Promise.resolve(state);
    },
    retry() {
      if (pending) return pending;
      return state.status === 'failed'
        ? begin('retry')
        : Promise.resolve(state);
    },
    shutdown() {
      if (state.status === 'stopped') return;
      state = { status: 'stopped' };
      controller?.abort();
      emit({ type: 'stopped' });
    },
  };
}
