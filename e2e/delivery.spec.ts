import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function recoverReads(page: Page, ready: Locator) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const button = page.getByRole('button', { name: /^Réessayer/ }).first();
    const link = page.getByRole('link', { name: 'Réessayer', exact: true });
    await expect(ready.or(button).or(link).first()).toBeVisible();
    if (await button.isVisible()) {
      const response = page.waitForResponse(
        (value) =>
          value.request().method() === 'GET' &&
          new URL(value.url()).pathname.startsWith('/api/'),
      );
      await button.click();
      await response;
      await page.waitForLoadState('networkidle');
    } else if (await link.isVisible()) await link.click();
    else return;
  }
  throw new Error(
    'Read recovery did not complete after eight explicit retries.',
  );
}

async function scan(page: Page, info: TestInfo, state: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250); // Allow the control color transitions to settle.
  const result = await new AxeBuilder({ page })
    .withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ])
    .analyze();
  await info.attach(`axe-${state}`, {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
  expect(result.violations, `Axe violations in ${state}`).toEqual([]);
  // Incomplete results remain in the report for manual review; they are not passes.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}

async function capture(page: Page, info: TestInfo, name: string) {
  if (process.env.CAPTURE_README !== '1') return;
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/${info.project.name}-${name}.png`,
  });
}

async function fieldBoundaries(page: Page, info: TestInfo, state: string) {
  const measurements = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context)
      throw new Error('Contrast measurement requires a canvas context.');
    const rgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (color: number[]) =>
      color
        .map((value) => {
          value /= 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (total, value, index) =>
            total + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const contrast = (a: number[], b: number[]) =>
      (Math.max(luminance(a), luminance(b)) + 0.05) /
      (Math.min(luminance(a), luminance(b)) + 0.05);
    const root = document.querySelector('dialog[open]') ?? document;
    return [...root.querySelectorAll('input,select')]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const style = getComputedStyle(element);
        let parent = element.parentElement;
        while (
          parent &&
          getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)'
        )
          parent = parent.parentElement;
        if (!parent) throw new Error('No opaque field background found.');
        const border = rgb(style.borderTopColor);
        return {
          id: element.id,
          outside: contrast(
            border,
            rgb(getComputedStyle(parent).backgroundColor),
          ),
          inside: contrast(border, rgb(style.backgroundColor)),
        };
      });
  });
  await info.attach(`field-boundaries-${state}`, {
    body: JSON.stringify(measurements),
    contentType: 'application/json',
  });
  expect(measurements.length).toBeGreaterThan(0);
  for (const measurement of measurements) {
    expect(measurement.outside, measurement.id).toBeGreaterThanOrEqual(3);
    expect(measurement.inside, measurement.id).toBeGreaterThanOrEqual(3);
  }
}

test('prepare, persist, order, save and review a session', async ({
  page,
}, info) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto('/?q=Omar');
  const catalogueReady = page
    .getByRole('article')
    .first()
    .getByText('Meta Quest 3', { exact: true });
  await recoverReads(page, catalogueReady);
  await expect(
    page.getByRole('button', { name: /^Ma séance, 0 vidéo/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('article')
      .first()
      .getByRole('list', { name: 'Casques compatibles' })
      .getByRole('listitem'),
  ).toHaveCount(4);
  await scan(page, info, 'catalogue');
  await fieldBoundaries(page, info, 'catalogue');

  const detailsTrigger = page
    .getByRole('button', { name: /^Voir les détails/ })
    .first();
  await detailsTrigger.click();
  const details = page.getByRole('dialog', { name: 'Détails de la vidéo' });
  await expect(details.getByRole('button', { name: 'Fermer' })).toBeFocused();
  await recoverReads(page, details.getByText(/Publiée le/));
  await expect(details.getByText(/Publiée le/)).toBeVisible();
  await details.getByRole('button', { name: 'Fermer' }).focus();
  await page.keyboard.press('Tab');
  await expect(
    details.getByRole('region', { name: 'Contenu de la vidéo' }),
  ).toBeFocused();
  await scan(page, info, 'video-details');
  if (info.project.name === 'tablet') await capture(page, info, 'details');
  await page.keyboard.press('Escape');
  await expect(detailsTrigger).toBeFocused();

  for (let index = 0; index < 3; index++) {
    await page
      .getByRole('button', { name: /^Ajouter à ma séance :/ })
      .first()
      .click();
  }
  await page.reload();
  await recoverReads(page, catalogueReady);
  const draftTrigger = page.getByRole('button', {
    name: /^Ma séance, 3 vidéos/,
  });
  await expect(draftTrigger).toBeVisible();
  if (info.project.name !== 'desktop') await draftTrigger.click();
  const draft =
    info.project.name === 'desktop'
      ? page.getByRole('complementary', { name: 'Ma séance' })
      : page.getByRole('dialog', { name: 'Ma séance', exact: true });
  await recoverReads(page, draft.getByRole('heading', { level: 3 }).first());
  await page.waitForLoadState('networkidle');
  const titles = await draft
    .getByRole('heading', { level: 3 })
    .allTextContents();
  await draft
    .getByRole('button', { name: `Descendre ${titles[0]}`, exact: true })
    .click();
  const removal = draft.getByRole('button', {
    name: `Retirer ${titles[0]} de ma séance`,
    exact: true,
  });
  await removal.focus();
  await page.keyboard.press('Enter');
  await expect(
    draft.getByRole('button', {
      name: `Retirer ${titles[2]} de ma séance`,
      exact: true,
    }),
  ).toBeFocused();
  const savedOrder = await draft
    .getByRole('heading', { level: 3 })
    .allTextContents();
  await scan(page, info, 'draft');
  if (info.project.name === 'desktop') {
    await page.evaluate(() => scrollTo(0, 0));
    await capture(page, info, 'catalogue');
  }
  await draft
    .getByRole('button', { name: 'Finaliser ma séance', exact: true })
    .click();
  const form = page.getByRole('dialog', {
    name: 'Enregistrer la séance',
    exact: true,
  });
  const name = form.getByRole('textbox', { name: /Nom de la séance/ });
  await expect(name).toBeFocused();
  await form
    .getByRole('button', { name: 'Enregistrer la séance', exact: true })
    .click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  const sessionName = `Atelier découverte — ${info.project.name}`;
  await name.fill(sessionName);
  await form
    .getByRole('combobox', { name: /Casque VR/ })
    .selectOption('pico-4');
  await scan(page, info, 'finalisation');
  await fieldBoundaries(page, info, 'finalisation');
  if (info.project.name === 'mobile') await capture(page, info, 'finalisation');
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = page.waitForResponse(
      (value) =>
        value.url().endsWith('/api/sessions') &&
        value.request().method() === 'POST',
    );
    await form
      .getByRole('button', {
        name: /^(Enregistrer la séance|Réessayer d’enregistrer)$/,
      })
      .click();
    if ((await response).status() === 201) break;
    await expect(name).toHaveValue(sessionName); // Explicit user retry, never automatic application replay.
  }
  await expect(page).toHaveURL(/\/sessions\?created=ses_/);
  await recoverReads(
    page,
    page.getByRole('link', {
      name: `Consulter la séance : ${sessionName}`,
      exact: true,
    }),
  );
  await scan(page, info, 'saved-list');
  await page
    .getByRole('link', {
      name: `Consulter la séance : ${sessionName}`,
      exact: true,
    })
    .click();
  await recoverReads(
    page,
    page.getByRole('heading', { level: 1, name: sessionName }),
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(sessionName);
  const programme = page.locator('main ol');
  await expect(programme.getByRole('heading')).toHaveText(savedOrder);
  await expect(
    page.getByRole('link', { name: /^Ma séance, 0 vidéo/ }),
  ).toBeVisible();
  await scan(page, info, 'saved-details');
  expect(runtimeErrors).toEqual([]);
});

test('recover from catalogue failure and keep narrow text readable', async ({
  page,
}, info) => {
  await page.goto('/');
  await recoverReads(
    page,
    page
      .getByRole('article')
      .first()
      .getByText('Meta Quest 3', { exact: true }),
  );
  await page.route('**/api/videos?**', async (route) => {
    await route.fulfill({
      status: 503,
      json: { error: 'upstream_error', message: 'Service indisponible.' },
    });
  });
  await page.getByRole('searchbox').fill('zzzz-verification');
  await page.getByRole('searchbox').press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Le catalogue ne peut pas être chargé' }),
  ).toBeVisible();
  await scan(page, info, 'catalogue-error');
  await page.unroute('**/api/videos?**');
  await recoverReads(
    page,
    page.getByRole('heading', { name: 'Aucune vidéo trouvée', exact: true }),
  );
  await expect(
    page.getByRole('heading', { name: 'Aucune vidéo trouvée', exact: true }),
  ).toBeVisible();
  await scan(page, info, 'catalogue-empty');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const transition = await page
    .getByRole('searchbox')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(parseFloat(transition)).toBeLessThan(0.001);
  if (info.project.name === 'mobile')
    await page.setViewportSize({ width: 320, height: 740 });
  await page.addStyleTag({
    content:
      '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}',
  });
  await scan(page, info, 'text-spacing-reduced-motion');
  await page.goto('/sessions/ses_nonexistent');
  await recoverReads(page, page.getByRole('heading', { name: /introuvable/i }));
  await expect(
    page.getByRole('heading', { name: /introuvable/i }),
  ).toBeVisible();
  await scan(page, info, 'not-found');
});
