import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  SaveOperationRequestSchema,
  type SaveOperationRequest,
} from '@features/sessions/save-operation-contracts';
import { SessionSchema, type Session } from '@lib/api/schemas';

async function controlledBff(context: BrowserContext) {
  let runtime = crypto.randomUUID();
  let offline = false;
  const operations = new Map<
    string,
    {
      input: SaveOperationRequest;
      status: 'pending' | 'failed' | 'succeeded';
      session?: Session;
    }
  >();
  await context.route('**/api/session-save-operations**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let status = 200;
    let body: unknown;
    if (path.endsWith('/session-save-operations') && request.method() === 'GET')
      body = { runtime_id: runtime };
    else if (request.method() === 'POST') {
      const input = SaveOperationRequestSchema.parse(request.postDataJSON());
      if (input.expected_runtime_id !== runtime) {
        status = 409;
        body = { runtime_id: runtime, error: 'runtime_changed' };
      } else {
        if (!operations.has(input.operation_id))
          operations.set(input.operation_id, { input, status: 'pending' });
        status = 202;
        body = { ...input, runtime_id: runtime, status: 'pending' };
      }
    } else {
      if (offline) {
        await route.abort('failed');
        return;
      }
      const id = path.split('/').at(-1)!;
      const operation = operations.get(id);
      if (!operation || operation.input.expected_runtime_id !== runtime) {
        status = 404;
        body = { runtime_id: runtime, error: 'operation_unknown' };
      } else
        body = {
          ...operation.input,
          runtime_id: runtime,
          status: operation.status,
          ...(operation.status === 'succeeded'
            ? { session: operation.session }
            : {}),
          ...(operation.status === 'failed'
            ? {
                failure: {
                  http_status: 503,
                  body: { error: 'unavailable', message: 'Réessayez.' },
                },
              }
            : {}),
        };
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(body),
    });
  });
  return {
    operations,
    offline: (value: boolean) => {
      offline = value;
    },
    restart: () => {
      runtime = crypto.randomUUID();
    },
  };
}
async function ready(page: Page) {
  await page.goto('/?q=Omar');
  await expect(
    page.locator('astro-island[component-export="CatalogueApp"]'),
  ).not.toHaveAttribute('ssr', '');
  await expect(
    page.getByRole('button', { name: /^Ajouter à ma séance/ }).first(),
  ).toBeVisible();
}
async function finalise(page: Page) {
  await page.getByRole('button', { name: 'Finaliser ma séance' }).click();
  return page.getByRole('dialog', { name: 'Enregistrer la séance' });
}

test('keeps draft editing available but explains and blocks saving without cross-tab locks', async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    Object.defineProperty(navigator, 'locks', { value: undefined }),
  );
  let submissions = 0;
  await context.route('**/api/session-save-operations', async (route) => {
    if (route.request().method() === 'POST') submissions++;
    await route.continue();
  });
  await ready(page);
  await expect(
    page.getByRole('region', { name: 'Statut de l’enregistrement' }),
  ).toContainText('n’est pas disponible dans ce navigateur');
  await page
    .getByRole('button', { name: /^Ajouter à ma séance/ })
    .first()
    .click();
  const form = await finalise(page);
  await form.getByLabel('Nom de la séance').fill('Brouillon conservé');
  await expect(form.getByRole('alert')).toContainText(
    'Autorisez le stockage local',
  );
  await expect(
    form.getByRole('button', { name: 'Enregistrer la séance', exact: true }),
  ).toBeDisabled();
  expect(submissions).toBe(0);
});

test('recovers delayed failure and success across tab closure, response loss and reload', async ({
  page,
  context,
}, info) => {
  const bff = await controlledBff(context);
  await ready(page);
  await page
    .getByRole('button', { name: /^Ajouter à ma séance/ })
    .first()
    .click();
  const first = await finalise(page);
  const name = `Reprise ${crypto.randomUUID()}`;
  await first.getByLabel('Nom de la séance').fill(name);
  const second = await context.newPage();
  await ready(second);
  const other = await finalise(second);
  await first
    .getByRole('button', { name: 'Enregistrer la séance', exact: true })
    .click();
  await expect(other.getByLabel('Nom de la séance')).toBeDisabled();
  await expect(
    other.getByRole('button', { name: 'Enregistrement en cours…' }),
  ).toBeDisabled();
  await expect(
    other.getByRole('region', { name: 'Statut de l’enregistrement' }),
  ).toHaveClass(/bg-warning/);
  await expect(other.getByRole('status')).toContainText('plus de temps');
  expect(
    (
      await new AxeBuilder({ page: second })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await second.screenshot({ path: info.outputPath('save-delayed.png') });
  await page.close(); // No unload/crash detection is needed to recover server-owned work.
  expect(bff.operations.size).toBe(1);
  [...bff.operations.values()][0].status = 'failed';
  await expect(other.getByLabel('Nom de la séance')).toBeEnabled();
  await expect(other.getByLabel('Nom de la séance')).toHaveValue(name);
  await expect(other.getByRole('alert')).toContainText(
    'brouillon est conservé',
  );
  await other
    .getByRole('button', { name: 'Enregistrer la séance', exact: true })
    .click();
  await expect.poll(() => bff.operations.size).toBe(2);
  bff.offline(true);
  await expect(other.getByRole('status')).toContainText(
    'réponse n’a pas pu être confirmée',
  );
  await second.reload();
  await expect(
    second.getByRole('button', { name: /^Ajouter à ma séance/ }).first(),
  ).toBeDisabled();
  const pending = [...bff.operations.values()][1];
  let saved: Session | undefined;
  // Create a real mock-API fixture so the recovered success points to an existing session.
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await context.request.post('/api/sessions', {
      data: pending.input.session,
    });
    if (response.status() === 201) {
      saved = SessionSchema.parse(await response.json());
      break;
    }
  }
  expect(saved).toBeDefined();
  pending.session = saved;
  pending.status = 'succeeded';
  bff.offline(false);
  await expect(
    second.getByRole('status').filter({ hasText: 'a été enregistrée' }),
  ).toBeVisible();
  await expect(
    second.getByRole('button', { name: /^Ma séance, 0 vidéo/ }),
  ).toBeVisible();
  await expect(
    second.getByRole('link', { name: 'Consulter l’enregistrement' }),
  ).toHaveAttribute('href', `/sessions/${saved!.id}`);
  await expect(
    second.getByRole('button', { name: /^Ajouter à ma séance/ }).first(),
  ).toBeEnabled();
  await second.screenshot({ path: info.outputPath('save-recovered.png') });
  expect(bff.operations.size).toBe(2);
});

test('keeps a lost result protected until explicit manual verification, without replaying into a new runtime', async ({
  page,
  context,
}, info) => {
  const bff = await controlledBff(context);
  await ready(page);
  await page
    .getByRole('button', { name: /^Ajouter à ma séance/ })
    .first()
    .click();
  let form = await finalise(page);
  await form.getByLabel('Nom de la séance').fill('Résultat inconnu');
  await form
    .getByRole('button', { name: 'Enregistrer la séance', exact: true })
    .click();
  await expect.poll(() => bff.operations.size).toBe(1);
  bff.restart();
  await expect(form.getByRole('status')).toContainText('résultat est inconnu');
  await expect(form.getByLabel('Nom de la séance')).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: /^Ajouter à ma séance/ }).first(),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Vérifier le statut' }).click();
  expect(bff.operations.size).toBe(1);
  await page.screenshot({ path: info.outputPath('save-unknown.png') });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page
    .getByRole('button', { name: 'Reprendre après vérification' })
    .click();
  await expect(
    page.getByRole('button', { name: /^Ajouter à ma séance/ }).first(),
  ).toBeDisabled();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Reprendre après vérification' })
    .click();
  await expect(
    page.getByRole('button', { name: /^Ajouter à ma séance/ }).first(),
  ).toBeEnabled();
  form = await finalise(page);
  await expect(form.getByLabel('Nom de la séance')).toHaveValue(
    'Résultat inconnu',
  );
  expect(bff.operations.size).toBe(1);
});
