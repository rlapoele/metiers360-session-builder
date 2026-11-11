import { expect, test, type Page } from '@playwright/test';

import {
  SaveOperationSchema,
  type SaveOperationRequest,
} from '@features/sessions/save-operation-contracts';
import { SessionListSchema } from '@lib/api/schemas';

async function start(page: Page, input: SaveOperationRequest) {
  return page.evaluate(async (body) => {
    const response = await fetch('/api/session-save-operations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result: unknown = await response.json();
    return {
      status: response.status,
      cache: response.headers.get('cache-control'),
      location: response.headers.get('location'),
      body: result,
    };
  }, input);
}

test('tracks one process-owned save across pages and replays it without another saved session', async ({
  page,
  context,
}) => {
  await page.goto('/');
  const second = await context.newPage();
  await second.goto('/sessions');
  const draftId = crypto.randomUUID();
  const name = `Suivi BFF ${crypto.randomUUID()}`;
  let input: SaveOperationRequest = {
    operation_id: crypto.randomUUID(),
    client_id: crypto.randomUUID(),
    draft_id: draftId,
    revision: 4,
    session: { name, video_ids: ['vid_001'], headset_id: null },
  };

  // The unchanged mock deliberately fails occasionally. Only the test initiates
  // a fresh attempt after an explicitly reported failure; the BFF never retries.
  let succeeded = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    input = { ...input, operation_id: crypto.randomUUID() };
    const accepted = await start(page, input);
    expect(accepted.status).toBe(202);
    expect(accepted.cache).toBe('no-store');
    expect(accepted.location).toBe(
      `/api/session-save-operations/${input.operation_id}`,
    );
    expect(SaveOperationSchema.parse(accepted.body).status).toBe('pending');
    const joined = await start(second, input);
    expect([200, 202]).toContain(joined.status);
    await expect
      .poll(async () => {
        const response = await context.request.get(accepted.location!);
        expect(response.headers()['cache-control']).toBe('no-store');
        return SaveOperationSchema.parse(await response.json()).status;
      })
      .not.toBe('pending');
    const terminal = SaveOperationSchema.parse(
      (await start(second, input)).body,
    );
    if (terminal.status === 'succeeded') {
      succeeded = true;
      expect(terminal.session.name).toBe(name);
      break;
    }
    expect(terminal.status).toBe('failed');
  }
  expect(succeeded).toBe(true);
  const replay = await start(page, input);
  expect(replay.status).toBe(200);
  const conflict = await start(second, {
    ...input,
    operation_id: crypto.randomUUID(),
  });
  expect(conflict.status).toBe(409);
  expect(conflict.body).toMatchObject({
    error: 'draft_already_saved',
    operation: { operation_id: input.operation_id, status: 'succeeded' },
  });
  expect((await start(page, { ...input, revision: 5 })).status).toBe(409);

  await expect
    .poll(async () => {
      const response = await context.request.get('/api/sessions');
      if (!response.ok()) return -1;
      return SessionListSchema.parse(await response.json()).data.filter(
        (session) => session.name === name,
      ).length;
    })
    .toBe(1);
});
