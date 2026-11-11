import { SessionSaveError } from '@features/sessions/api';
import { isDraftSaveLocked } from '@features/sessions/session-draft.persistence';
import {
  sessionDraftStore,
  type createSessionDraftStore,
} from '@features/sessions/session-draft.store';
import {
  SaveOperationSchema,
  SaveOperationProblemSchema,
  SaveRuntimeSchema,
} from '@features/sessions/save-operation-contracts';
import {
  ValidationErrorSchema,
  type CreateSession,
  type Session,
} from '@lib/api/schemas';

type Store = ReturnType<typeof createSessionDraftStore>;
type Transport = (
  path: string,
  init?: RequestInit,
) => Promise<{ status: number; body: unknown }>;
const base = '/api/session-save-operations';
const send: Transport = async (path, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
    const body: unknown = await response.json();
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
};

export function createSaveCoordinator(
  store: Store,
  transport: Transport = send,
) {
  let checking: Promise<void> | undefined;
  async function check() {
    const save = store.$saveState.get();
    if (!isDraftSaveLocked(save) || !save) return;
    const request = save.request;
    try {
      let response = await transport(`${base}/${request.operation_id}`);
      if (response.status === 404) {
        const unknown = SaveOperationProblemSchema.safeParse(response.body);
        if (
          !unknown.success ||
          unknown.data.runtime_id !== request.expected_runtime_id ||
          save.uncertain === 'runtime'
        ) {
          await store.markSaveUncertain(request.operation_id, 'runtime');
          return;
        }
        // Same epoch: replay the original ID, never invent a retry after response loss.
        response = await transport(base, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        });
      }
      const result = SaveOperationSchema.safeParse(response.body);
      if (response.status < 300 && result.success) {
        if (!(await store.applySaveResult(result.data)))
          await store.markSaveUncertain(request.operation_id, 'network');
        return;
      }
      const problem = SaveOperationProblemSchema.safeParse(response.body);
      if (
        problem.success &&
        problem.data.runtime_id === request.expected_runtime_id &&
        [
          'operation_capacity',
          'validation_error',
          'invalid_json',
          'invalid_parameter',
        ].includes(problem.data.error)
      ) {
        const validation = ValidationErrorSchema.safeParse(response.body);
        await store.applySaveResult({
          ...request,
          runtime_id: request.expected_runtime_id,
          status: 'failed',
          failure: {
            http_status: response.status,
            body: validation.success
              ? validation.data
              : {
                  error: problem.data.error,
                  message:
                    problem.data.message ?? 'La demande n’a pas été envoyée.',
                },
          },
        });
      } else
        await store.markSaveUncertain(
          request.operation_id,
          problem.success && problem.data.error === 'runtime_changed'
            ? 'runtime'
            : 'network',
        );
    } catch {
      await store.markSaveUncertain(
        request.operation_id,
        save.uncertain === 'runtime' ? 'runtime' : 'network',
      );
    }
  }
  function reconcile() {
    if (!checking)
      checking = check()
        .catch(() => {
          store.$saveIssue.set(
            'La vérification du suivi local est indisponible. Le brouillon reste protégé.',
          );
        })
        .finally(() => {
          checking = undefined;
        });
    return checking;
  }

  async function save(input: CreateSession): Promise<Session> {
    let runtime: string;
    try {
      const response = await transport(base);
      if (response.status !== 200) throw new Error('Unavailable');
      runtime = SaveRuntimeSchema.parse(response.body).runtime_id;
    } catch {
      throw new SessionSaveError(
        'Le service d’enregistrement est indisponible. Votre brouillon est conservé. Réessayez.',
      );
    }
    let operation;
    try {
      operation = await store.beginSave(input, runtime);
    } catch (error) {
      throw new SessionSaveError(
        error instanceof Error
          ? error.message
          : 'Le brouillon ne peut pas être enregistré.',
      );
    }
    const id = operation.request.operation_id;
    for (;;) {
      await reconcile();
      const current = store.$saveState.get();
      if (!current || current.request.operation_id !== id)
        throw new SessionSaveError(
          'Le suivi a changé. Consultez le statut de la séance.',
        );
      if (current.result?.status === 'succeeded') return current.result.session;
      if (current.result?.status === 'failed') {
        const validation = ValidationErrorSchema.safeParse(
          current.result.failure.body,
        );
        throw new SessionSaveError(
          'La séance n’a pas pu être enregistrée. Votre brouillon est conservé. Vous pouvez réessayer.',
          validation.success ? validation.data.details : [],
        );
      }
      if (current.uncertain || store.$saveIssue.get())
        throw new SessionSaveError(
          'L’enregistrement n’a pas pu être confirmé. Le brouillon reste protégé pendant la vérification.',
        );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  function watch() {
    let stopped = false;
    const update = () => {
      if (!stopped) void reconcile();
    };
    const unsubscribe = store.$saveState.listen(() => queueMicrotask(update));
    const interval = setInterval(update, 1000);
    window.addEventListener('focus', update);
    window.addEventListener('online', update);
    update();
    return () => {
      stopped = true;
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', update);
      window.removeEventListener('online', update);
    };
  }
  return { save, reconcile, watch };
}
export const saveCoordinator = createSaveCoordinator(sessionDraftStore);
