// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSaveCoordinator } from '@features/sessions/save-coordinator';
import {
  createSessionDraftStore,
  SESSION_DRAFT_STORAGE_KEY,
} from '@features/sessions/session-draft.store';

const runtime = crypto.randomUUID();
const draft = { name: 'Atelier', video_ids: ['one'], headset_id: null };
const stores: ReturnType<typeof createSessionDraftStore>[] = [];
function make() {
  localStorage.setItem(
    SESSION_DRAFT_STORAGE_KEY,
    JSON.stringify({ version: 1, ...draft }),
  );
  const store = createSessionDraftStore({ runExclusive: async (fn) => fn() });
  stores.push(store);
  store.hydrate(localStorage);
  return store;
}
afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose());
  localStorage.clear();
});
describe('save recovery coordinator', () => {
  it('resumes a prepared request with its original ID only within the expected runtime', async () => {
    const store = make();
    const save = await store.beginSave(draft, runtime);
    const send = vi.fn(async (_path: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? {
            status: 202,
            body: { ...save.request, runtime_id: runtime, status: 'pending' },
          }
        : {
            status: 404,
            body: { runtime_id: runtime, error: 'operation_unknown' },
          },
    );
    await createSaveCoordinator(store, send).reconcile();
    expect(JSON.parse(send.mock.calls[1][1]!.body as string).operation_id).toBe(
      save.request.operation_id,
    );
    expect(store.$isReadOnly.get()).toBe(true);
  });
  it('never resubmits after runtime loss and preserves the draft through transport errors', async () => {
    const store = make();
    await store.beginSave(draft, runtime);
    const send = vi.fn(async () => ({
      status: 404,
      body: { runtime_id: crypto.randomUUID(), error: 'operation_unknown' },
    }));
    await createSaveCoordinator(store, send).reconcile();
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.$saveState.get()?.uncertain).toBe('runtime');
    const offline = vi.fn().mockRejectedValue(new Error('offline'));
    await createSaveCoordinator(store, offline).reconcile();
    expect(store.$isReadOnly.get()).toBe(true);
    expect(store.$draft.get().name).toBe('Atelier');
  });
  it('recovers delayed success without the submitting component and discards mismatched responses', async () => {
    const store = make();
    const save = await store.beginSave(draft, runtime);
    const result = {
      ...save.request,
      runtime_id: runtime,
      status: 'succeeded',
      session: {
        id: 'saved',
        ...draft,
        created_at: '2026-11-11T12:00:00Z',
        total_duration_seconds: 60,
      },
    };
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        body: { ...result, operation_id: crypto.randomUUID() },
      })
      .mockResolvedValue({ status: 200, body: result });
    const controller = createSaveCoordinator(store, send);
    await controller.reconcile();
    expect(store.$draft.get().video_ids).toEqual(['one']);
    await controller.reconcile();
    expect(store.$draft.get().video_ids).toEqual([]);
    expect(store.$saveState.get()?.result?.status).toBe('succeeded');
  });
  it('turns a definitive admission rejection into a retryable failure without clearing the draft', async () => {
    const store = make();
    await store.beginSave(draft, runtime);
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        status: 404,
        body: { runtime_id: runtime, error: 'operation_unknown' },
      })
      .mockResolvedValueOnce({
        status: 503,
        body: {
          runtime_id: runtime,
          error: 'operation_capacity',
          message: 'Full',
        },
      });
    await createSaveCoordinator(store, send).reconcile();
    expect(store.$saveState.get()?.result?.status).toBe('failed');
    expect(store.$isReadOnly.get()).toBe(false);
    expect(store.$draft.get().name).toBe('Atelier');
  });
});
