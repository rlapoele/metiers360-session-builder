import { expect, test } from '@playwright/test';
import {
  SESSION_DRAFT_STORAGE_KEY,
  EMPTY_SESSION_DRAFT,
} from '@features/sessions/session-draft.persistence';

test('pauses success dismissal during real pointer/focus interaction and keeps it dismissed after reload', async ({
  page,
  context,
}) => {
  const id = crypto.randomUUID();
  const client = crypto.randomUUID();
  const runtime = crypto.randomUUID();
  const session = {
    id: 'ses_notice_fixture',
    name: 'Confirmation conservée',
    video_ids: ['vid_001'],
    headset_id: null,
    created_at: '2026-11-11T12:00:00Z',
    total_duration_seconds: 455,
  };
  const request = {
    operation_id: id,
    client_id: client,
    draft_id: 'initial',
    revision: 1,
    expected_runtime_id: runtime,
    session: {
      name: session.name,
      video_ids: session.video_ids,
      headset_id: null,
    },
  };
  const record = {
    version: 2,
    draft_id: crypto.randomUUID(),
    revision: 0,
    draft: EMPTY_SESSION_DRAFT,
    client_id: client,
    save: {
      request,
      started_at: Date.now(),
      result: {
        operation_id: id,
        client_id: client,
        runtime_id: runtime,
        draft_id: 'initial',
        revision: 1,
        status: 'succeeded',
        session,
      },
    },
  };
  // Seed only an already confirmed browser snapshot: this test owns presentation,
  // while the delivery/recovery suites exercise actual saving independently.
  await context.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(value));
    },
    { key: SESSION_DRAFT_STORAGE_KEY, value: record },
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/sessions');
  const banner = page.getByRole('region', {
    name: 'Statut de l’enregistrement',
  });
  const link = banner.getByRole('link', { name: 'Consulter l’enregistrement' });
  await link.hover();
  await page.waitForTimeout(8500); // Longer than the real eight-second display period.
  await expect(banner).toBeVisible();
  await link.focus();
  await page.mouse.move(10, 200);
  await page.waitForTimeout(8500);
  await expect(link).toBeFocused();
  await expect(banner).toBeVisible();
  await page.getByRole('link', { name: 'Catalogue', exact: true }).focus();
  await expect(banner).toBeHidden({ timeout: 10_000 });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).save.result.status,
      SESSION_DRAFT_STORAGE_KEY,
    ),
  ).toBe('succeeded');
  await page.reload();
  await expect(
    page.locator('astro-island[component-export="SessionSaveStatus"]'),
  ).not.toHaveAttribute('ssr', '');
  await expect(banner).toHaveCount(0);
  expect(errors).toEqual([]);
});
