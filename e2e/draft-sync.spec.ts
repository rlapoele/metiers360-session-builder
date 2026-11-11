import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import {
  PersistedSessionDraftSchema,
  SESSION_DRAFT_STORAGE_KEY,
} from '@features/sessions/session-draft.persistence';

async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(
    page.locator('astro-island[component-export="CatalogueApp"]'),
  ).not.toHaveAttribute('ssr', '');
  await expect(
    page.getByRole('button', { name: /^Ajouter à ma séance :/ }).first(),
  ).toBeVisible();
}

async function openDraft(page: Page, desktop: boolean) {
  if (!desktop)
    await page.getByRole('button', { name: /^Ma séance, \d/ }).click();
  return desktop
    ? page.getByRole('complementary', { name: 'Ma séance' })
    : page.getByRole('dialog', { name: 'Ma séance', exact: true });
}

test('synchronizes simultaneous and alternating draft edits without changing each tab’s search', async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  const second = await context.newPage();
  for (const current of [page, second])
    current.on('pageerror', (error) => errors.push(error.message));
  await ready(page, '/?q=Omar');
  await ready(second, '/?q=L%C3%A9a');
  const firstTitle = await page
    .getByRole('article')
    .first()
    .getByRole('heading')
    .innerText();
  const secondTitle = await second
    .getByRole('article')
    .first()
    .getByRole('heading')
    .innerText();

  // Hold the actual browser lock so both clicks are queued against the same old draft.
  await page.evaluate(
    () =>
      new Promise<void>((acquired) => {
        void navigator.locks.request(
          'metiers360.session-draft',
          () =>
            new Promise<void>((release) => {
              window.addEventListener(
                'test:release-draft-lock',
                () => release(),
                { once: true },
              );
              acquired();
            }),
        );
      }),
  );
  await Promise.all(
    [page, second].map((current) =>
      current
        .getByRole('button', { name: /^Ajouter à ma séance :/ })
        .first()
        .click(),
    ),
  );
  await page.evaluate(() =>
    window.dispatchEvent(new Event('test:release-draft-lock')),
  );
  for (const current of [page, second]) {
    await expect(
      current.getByRole('button', { name: 'Ma séance, 2 vidéos', exact: true }),
    ).toBeVisible();
  }
  await expect
    .poll(async () => {
      const raw = await page.evaluate(
        (key) => localStorage.getItem(key),
        SESSION_DRAFT_STORAGE_KEY,
      );
      return PersistedSessionDraftSchema.parse(JSON.parse(raw!)).draft.video_ids
        .length;
    })
    .toBe(2);

  const desktop = info.project.name === 'desktop';
  const firstDraft = await openDraft(page, desktop);
  const secondDraft = await openDraft(second, desktop);
  for (const [current, draft] of [
    [page, firstDraft],
    [second, secondDraft],
  ] as const) {
    // Cross-tab IDs must resolve actual titles/durations, with explicit recovery for mock failures.
    const remoteTitle = current === page ? secondTitle : firstTitle;
    for (let attempt = 0; attempt < 8; attempt++) {
      const retry = draft.getByRole('button', {
        name: /^Réessayer de charger/,
      });
      await expect(
        draft
          .getByRole('heading', { name: remoteTitle, exact: true })
          .or(retry)
          .first(),
      ).toBeVisible();
      if (await retry.count()) await retry.first().click();
      else break;
    }
    await expect(
      draft.getByRole('heading', { name: firstTitle, exact: true }),
    ).toBeVisible();
    await expect(
      draft.getByRole('heading', { name: secondTitle, exact: true }),
    ).toBeVisible();
    await expect(draft.getByText('Chargement de la durée…')).toHaveCount(0);
    expect(
      await current.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  const firstRemoveInSecond = secondDraft.getByRole('button', {
    name: `Retirer ${firstTitle} de ma séance`,
    exact: true,
  });
  await firstRemoveInSecond.focus();
  await firstDraft
    .getByRole('button', {
      name: `Retirer ${firstTitle} de ma séance`,
      exact: true,
    })
    .click();
  await expect(
    secondDraft.getByRole('button', {
      name: `Retirer ${secondTitle} de ma séance`,
      exact: true,
    }),
  ).toBeFocused();
  await secondDraft
    .getByRole('button', {
      name: `Retirer ${secondTitle} de ma séance`,
      exact: true,
    })
    .click();
  await expect(
    firstDraft.getByRole('heading', { name: 'Votre séance est vide' }),
  ).toBeVisible();
  await expect(
    secondDraft.getByRole('heading', { name: 'Votre séance est vide' }),
  ).toBeFocused();

  if (!desktop) {
    await firstDraft
      .getByRole('button', { name: 'Fermer', exact: true })
      .click();
    await secondDraft
      .getByRole('button', { name: 'Fermer', exact: true })
      .click();
  }
  await page
    .getByRole('button', { name: /^Ajouter à ma séance :/ })
    .first()
    .click();
  for (const current of [page, second]) {
    const draft = await openDraft(current, desktop);
    await draft
      .getByRole('button', { name: 'Finaliser ma séance', exact: true })
      .click();
  }
  const name = page.getByRole('textbox', { name: 'Nom de la séance' });
  await name.pressSequentially('Atelier partagé', { delay: 15 });
  await expect(
    second.getByRole('textbox', { name: 'Nom de la séance' }),
  ).toHaveValue('Atelier partagé');
  await expect(name).toBeFocused();
  await second.getByLabel('Casque VR (facultatif)').selectOption('pico-4');
  await expect(page.getByLabel('Casque VR (facultatif)')).toHaveValue('pico-4');

  expect(new URL(page.url()).searchParams.get('q')).toBe('Omar');
  expect(new URL(second.url()).searchParams.get('q')).toBe('Léa');
  await second.reload();
  await expect(
    second.locator('astro-island[component-export="CatalogueApp"]'),
  ).not.toHaveAttribute('ssr', '');
  const restored = await openDraft(second, desktop);
  await restored
    .getByRole('button', { name: 'Finaliser ma séance', exact: true })
    .click();
  await expect(
    second.getByRole('textbox', { name: 'Nom de la séance' }),
  ).toHaveValue('Atelier partagé');
  await expect(second.getByLabel('Casque VR (facultatif)')).toHaveValue(
    'pico-4',
  );
  await second.screenshot({ path: info.outputPath('shared-draft.png') });
  const audit = await new AxeBuilder({ page: second })
    .withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ])
    .analyze();
  await info.attach('axe-shared-draft', {
    body: JSON.stringify(audit),
    contentType: 'application/json',
  });
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
});
