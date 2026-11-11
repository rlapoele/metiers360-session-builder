import { describe, expect, it, vi } from 'vitest';

import { createSaveOperationRegistry } from '@features/sessions/save-operations.server';
import { SaveOperationRequestSchema } from '@features/sessions/save-operation-contracts';
import { CatalogueClientError } from '@lib/api/errors';
import type { Session } from '@lib/api/schemas';

const session: Session = {
  id: 'saved_1',
  name: 'Atelier',
  video_ids: ['vid_001'],
  headset_id: null,
  created_at: '2026-11-11T12:00:00Z',
  total_duration_seconds: 455,
};
const clientId = crypto.randomUUID();
function request(overrides = {}) {
  return SaveOperationRequestSchema.parse({
    operation_id: crypto.randomUUID(),
    client_id: clientId,
    draft_id: 'draft-a',
    revision: 3,
    session: { name: 'Atelier', video_ids: ['vid_001'] },
    ...overrides,
  });
}
function deferred() {
  let resolve!: (value: Session) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Session>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('process-owned save operations', () => {
  it('rejects a stale runtime before admission, including replay, without another upstream call', async () => {
    const save = vi.fn().mockResolvedValue(session);
    const registry = createSaveOperationRegistry(save);
    const input = request();
    expect(
      registry.start({ ...input, expected_runtime_id: crypto.randomUUID() }),
    ).toMatchObject({ status: 409, body: { error: 'runtime_changed' } });
    expect(save).not.toHaveBeenCalled();
    registry.start({ ...input, expected_runtime_id: registry.runtimeId });
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(
      registry.start({ ...input, expected_runtime_id: crypto.randomUUID() })
        .status,
    ).toBe(409);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('admits synchronously, joins concurrent requests and replays one successful save', async () => {
    const delayed = deferred();
    const save = vi.fn(() => delayed.promise);
    const registry = createSaveOperationRegistry(save);
    const input = request();
    const first = registry.start(input);
    expect(first.status).toBe(202);
    expect(first.body).toMatchObject({ status: 'pending', revision: 3 });
    expect(registry.start(input)).toEqual(first);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    delayed.resolve(session);
    await vi.waitFor(() =>
      expect(registry.get(input.operation_id).body).toMatchObject({
        status: 'succeeded',
        session,
      }),
    );
    expect(registry.start(input).status).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rejects ID reuse with a different snapshot and other operations for the same pending/saved draft', async () => {
    const delayed = deferred();
    const save = vi.fn(() => delayed.promise);
    const registry = createSaveOperationRegistry(save);
    const input = request();
    registry.start(input);
    expect(registry.start({ ...input, revision: 4 })).toMatchObject({
      status: 409,
      body: { error: 'operation_conflict' },
    });
    expect(registry.start(request())).toMatchObject({
      status: 409,
      body: {
        error: 'draft_already_saving',
        operation: { operation_id: input.operation_id },
      },
    });
    delayed.resolve(session);
    await vi.waitFor(() =>
      expect(registry.get(input.operation_id).body).toMatchObject({
        status: 'succeeded',
      }),
    );
    expect(registry.start(request({ revision: 4 }))).toMatchObject({
      status: 409,
      body: { error: 'draft_already_saved' },
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('retains a sanitised failure, preserves validation details and allows an explicit new attempt', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(
        new CatalogueClientError({
          kind: 'upstream',
          status: 422,
          message: 'private message',
          upstream: {
            error: 'validation_error',
            message: 'Invalid',
            details: [{ field: 'name', message: 'Nom déjà utilisé.' }],
          },
        }),
      )
      .mockResolvedValue(session);
    const registry = createSaveOperationRegistry(save);
    const input = request();
    registry.start(input);
    await vi.waitFor(() =>
      expect(registry.get(input.operation_id).body).toMatchObject({
        status: 'failed',
        failure: { http_status: 422, body: { details: [{ field: 'name' }] } },
      }),
    );
    expect(registry.start(input).status).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
    const next = request();
    expect(registry.start(next).status).toBe(202);
    await vi.waitFor(() =>
      expect(registry.get(next.operation_id).body).toMatchObject({
        status: 'succeeded',
      }),
    );
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('isolates identical initial draft IDs in unrelated browser clients', async () => {
    const save = vi.fn().mockResolvedValue(session);
    const registry = createSaveOperationRegistry(save);
    const first = request({ draft_id: 'initial' });
    expect(registry.start(first).status).toBe(202);
    const other = request({
      draft_id: 'initial',
      client_id: crypto.randomUUID(),
    });
    expect(registry.start(other).status).toBe(202);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(
      registry.start({ ...first, client_id: other.client_id }).status,
    ).toBe(409);
  });

  it('contains synchronous exceptions without leaking them or leaving an operation pending', async () => {
    const registry = createSaveOperationRegistry(() => {
      throw new Error('secret hostname');
    });
    const input = request();
    registry.start(input);
    await vi.waitFor(() =>
      expect(registry.get(input.operation_id).body).toMatchObject({
        status: 'failed',
        failure: { http_status: 500, body: { error: 'internal_error' } },
      }),
    );
    expect(JSON.stringify(registry.get(input.operation_id))).not.toContain(
      'secret',
    );
  });

  it('bounds admission without evicting results or preventing known-ID replay', async () => {
    const save = vi.fn().mockResolvedValue(session);
    const registry = createSaveOperationRegistry(save, { capacity: 1 });
    const input = request();
    registry.start(input);
    await vi.waitFor(() =>
      expect(registry.get(input.operation_id).body).toMatchObject({
        status: 'succeeded',
      }),
    );
    expect(registry.start(request({ draft_id: 'other' }))).toMatchObject({
      status: 503,
      body: { error: 'operation_capacity' },
    });
    expect(registry.start(input).status).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('distinguishes process loss from success/failure and owns snapshots independently of callers', async () => {
    const first = createSaveOperationRegistry(async () => session);
    const input = request();
    first.start(input);
    input.session.name = 'mutated';
    await vi.waitFor(() =>
      expect(first.get(input.operation_id).body).toMatchObject({
        status: 'succeeded',
      }),
    );
    const restarted = createSaveOperationRegistry(async () => session);
    expect(restarted.runtimeId).not.toBe(first.runtimeId);
    expect(restarted.get(input.operation_id)).toMatchObject({
      status: 404,
      body: { error: 'operation_unknown', runtime_id: restarted.runtimeId },
    });
    expect(first.get(input.operation_id).body).toMatchObject({
      runtime_id: first.runtimeId,
    });
  });
});
