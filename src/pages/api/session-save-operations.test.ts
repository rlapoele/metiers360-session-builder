import type { APIContext } from 'astro';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  POST,
  GET as runtimeStatus,
} from '@pages/api/session-save-operations/index';
import { GET } from '@pages/api/session-save-operations/[id]';
import { createSaveOperationRegistry } from '@features/sessions/save-operations.server';
import { SaveOperationSchema } from '@features/sessions/save-operation-contracts';

vi.mock('@features/sessions/save-operation-runtime.server', () => ({
  getSaveOperationRegistry: () => registry,
}));
const save = vi.fn();
let registry = createSaveOperationRegistry(save);
const input = () => ({
  operation_id: crypto.randomUUID(),
  client_id: crypto.randomUUID(),
  draft_id: crypto.randomUUID(),
  revision: 2,
  session: { name: 'Atelier', video_ids: ['vid_001'] },
});
function context(body?: string, id?: string, signal?: AbortSignal) {
  return {
    request: new Request('http://localhost/api/session-save-operations', {
      method: 'POST',
      body,
      signal,
    }),
    params: { id },
  } as unknown as APIContext;
}
async function response(value: ReturnType<typeof POST>) {
  const result = await value;
  if (!(result instanceof Response)) throw new Error('Missing response');
  expect(result.headers.get('cache-control')).toBe('no-store');
  return result;
}
beforeEach(() => {
  save.mockReset();
  save.mockResolvedValue({
    id: 'saved_1',
    name: 'Atelier',
    video_ids: ['vid_001'],
    headset_id: null,
    created_at: '2026-11-11T12:00:00Z',
    total_duration_seconds: 455,
  });
  registry = createSaveOperationRegistry(save);
});
describe('save-operation HTTP boundary', () => {
  it('provides a no-store runtime handshake before a browser reserves its save', async () => {
    const result = await response(runtimeStatus(context()));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ runtime_id: registry.runtimeId });
    expect(save).not.toHaveBeenCalled();
  });
  it('validates JSON and identifiers without calling the upstream', async () => {
    expect((await response(POST(context('{')))).status).toBe(400);
    for (const body of [
      {},
      { ...input(), operation_id: 'not-a-uuid' },
      { ...input(), revision: -1 },
      { ...input(), session: { name: '', video_ids: [] } },
    ]) {
      const invalid = await response(POST(context(JSON.stringify(body))));
      expect(invalid.status).toBe(422);
      expect(await invalid.json()).toMatchObject({
        error: 'validation_error',
        runtime_id: registry.runtimeId,
      });
    }
    expect((await response(GET(context(undefined, 'bad')))).status).toBe(400);
    const missing = await response(
      GET(context(undefined, crypto.randomUUID())),
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: 'operation_unknown',
      runtime_id: registry.runtimeId,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('returns a pending Location, keeps work after a browser abort and exposes the terminal result', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof save>>) => void;
    save.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const controller = new AbortController();
    const body = input();
    const accepted = await response(
      POST(context(JSON.stringify(body), undefined, controller.signal)),
    );
    expect(accepted.status).toBe(202);
    expect(accepted.headers.get('location')).toBe(
      `/api/session-save-operations/${body.operation_id}`,
    );
    SaveOperationSchema.parse(await accepted.json());
    controller.abort();
    expect(
      (await response(GET(context(undefined, body.operation_id)))).status,
    ).toBe(200);
    const joined = await response(POST(context(JSON.stringify(body))));
    expect(joined.status).toBe(202);
    const conflict = await response(
      POST(
        context(JSON.stringify({ ...body, operation_id: crypto.randomUUID() })),
      ),
    );
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      operation: { operation_id: body.operation_id },
    });
    resolve({
      id: 'saved_1',
      name: 'Atelier',
      video_ids: ['vid_001'],
      headset_id: null,
      created_at: '2026-11-11T12:00:00Z',
      total_duration_seconds: 455,
    });
    await vi.waitFor(async () => {
      const complete = await response(
        GET(context(undefined, body.operation_id)),
      );
      expect(SaveOperationSchema.parse(await complete.json())).toMatchObject({
        status: 'succeeded',
        session: { id: 'saved_1' },
      });
    });
    expect((await response(POST(context(JSON.stringify(body))))).status).toBe(
      200,
    );
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('canonicalizes trimmed names and omitted/null headset before replay comparison', async () => {
    const body = input();
    await response(POST(context(JSON.stringify(body))));
    await vi.waitFor(() =>
      expect(registry.get(body.operation_id).body).toMatchObject({
        status: 'succeeded',
      }),
    );
    expect(
      (
        await response(
          POST(
            context(
              JSON.stringify({
                ...body,
                session: {
                  ...body.session,
                  name: '  Atelier  ',
                  headset_id: null,
                },
              }),
            ),
          ),
        )
      ).status,
    ).toBe(200);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
