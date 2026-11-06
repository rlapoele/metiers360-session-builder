import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await expect(
    page.locator('astro-island[component-export="CatalogueApp"]'),
  ).not.toHaveAttribute('ssr', '');
  const retry = page.getByRole('button', { name: 'Réessayer', exact: true });
  for (let i = 0; i < 5; i++) {
    if (await retry.isVisible().catch(() => false)) await retry.click();
    if (
      await page
        .getByRole('combobox', { name: 'Métiers ou mots-clés' })
        .isEnabled()
    )
      return;
    await page.waitForTimeout(500);
  }
  await expect(
    page.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
  ).toBeEnabled();
}
async function chooseTitle(page: Page, label: string) {
  await page
    .getByRole('combobox', { name: 'Métiers ou mots-clés' })
    .fill(label);
  await page
    .getByRole('group', { name: 'Titre de vidéo', exact: true })
    .getByRole('option', { name: label, exact: true })
    .click();
}

test('restores selected appellations through SSR, reload and browser history', async ({
  page,
}) => {
  const response = await page.goto(
    '/?job=I1604&jobTerm=I1604%3Aappellation%2Fgaragiste&page=999',
  );
  expect(response?.status()).toBe(200);
  await ready(page);
  const expectedHeight = await page
    .getByRole('button', { name: /^Ajouter à ma séance :/ })
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  for (const control of [
    page.getByLabel('Public', { exact: true }),
    page.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
    page.getByLabel('Casque VR', { exact: true }),
    page.getByRole('button', { name: 'Rechercher', exact: true }),
  ]) {
    expect(
      await control.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBe(expectedHeight);
    expect(
      await control.evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe('14px');
  }
  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    const publicBox = await page.locator('.search-form-audience').boundingBox();
    const keywordBox = await page
      .locator('.search-form-keywords')
      .boundingBox();
    const headsetBox = await page.locator('.search-form-headset').boundingBox();
    expect(Math.abs(publicBox!.y - keywordBox!.y)).toBeLessThan(2);
    expect(Math.abs(keywordBox!.y - headsetBox!.y)).toBeLessThan(2);
  }
  await expect(
    page.getByRole('button', { name: 'Retirer le critère Métier : Garagiste' }),
  ).toBeVisible();
  const chip = page
    .getByRole('list', { name: 'Critères sélectionnés' })
    .getByRole('listitem')
    .first();
  const chipHeight = await chip.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const badgeHeight = await page
    .locator('article [data-slot=badge]')
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(chipHeight).toBe(36);
  expect(chipHeight).toBeGreaterThan(badgeHeight);
  expect(chipHeight).toBeLessThan(expectedHeight);
  const removal = page.getByRole('button', {
    name: 'Retirer le critère Métier : Garagiste',
  });
  expect(
    await removal.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(24);
  const reveal = page.getByRole('button', {
    name: 'Afficher le libellé complet du critère Métier : Garagiste',
  });
  await reveal.click();
  await expect(
    page.getByRole('region', { name: 'Libellé complet du critère' }),
  ).toContainText('Garagiste');
  await page.getByRole('button', { name: 'Fermer le libellé complet' }).click();
  await expect(reveal).toBeFocused();
  expect(new URL(page.url()).searchParams.get('page')).toBeNull();
  await page.getByLabel('Public', { exact: true }).selectOption('college');
  expect(new URL(page.url()).searchParams.get('audience')).toBeNull();
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('audience'))
    .toBe('college');
  await expect(
    page.getByText(/résultats précédents/).first(),
  ).not.toBeVisible();
  await page.getByRole('combobox', { name: 'Métiers ou mots-clés' }).fill('x');
  await page.goBack();
  await expect(page.getByLabel('Public', { exact: true })).toHaveValue('');
  await expect(
    page.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
  ).toHaveValue('');
  await page.goForward();
  await expect(page.getByLabel('Public', { exact: true })).toHaveValue(
    'college',
  );
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole('button', { name: 'Retirer le critère Métier : Garagiste' }),
  ).toBeVisible();
  await expect(page.getByLabel('Public', { exact: true })).toHaveValue(
    'college',
  );
});

test('uses keyword AND, stages removals and keeps unchanged submitted searches on their page', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.getByText('Page 2 sur 9')).toBeVisible();
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('page')).toBe('2');
  const keywords = page.getByRole('combobox', { name: 'Métiers ou mots-clés' });
  await keywords.fill('jard');
  const labelColor = await page
    .locator('[data-slot=keyword-selector] label')
    .evaluate((element) => getComputedStyle(element).color);
  for (const category of ['Métier', 'Titre de vidéo']) {
    const heading = page.getByText(category, { exact: true });
    await expect(heading).toBeVisible();
    expect(
      await heading.evaluate((element) => getComputedStyle(element).color),
    ).toBe(labelColor);
    expect(
      await heading
        .locator('svg')
        .evaluate((element) => getComputedStyle(element).color),
    ).toBe(labelColor);
  }
  await keywords.press('Escape');
  await chooseTitle(page, 'Omar');
  await chooseTitle(page, 'Hugo');
  expect(new URL(page.url()).searchParams.get('page')).toBe('2');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Aucune vidéo trouvée', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.getAll('title')).toEqual([
    'hugo',
    'omar',
  ]);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await page
    .getByRole('button', { name: 'Retirer le critère Titre de vidéo : Omar' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Aucune vidéo trouvée', exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.getAll('title')).toHaveLength(2);
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
  for (const title of await page
    .getByRole('article')
    .getByRole('heading', { level: 2 })
    .allTextContents())
    expect(title.toLowerCase()).toContain('hugo');
});

test('keeps malformed URLs explicit until correction is submitted', async ({
  page,
}) => {
  const response = await page.goto('/?job=UNKNOWN&title=unknown&page=2');
  expect(response?.status()).toBe(400);
  await expect(
    page.locator('astro-island[component-export="CatalogueApp"]'),
  ).not.toHaveAttribute('ssr', '');
  await expect(
    page.getByRole('heading', {
      name: 'Les critères de recherche sont invalides.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Modifier les critères' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Métiers ou mots-clés' }),
  ).toBeEnabled();
  expect(new URL(page.url()).searchParams.get('job')).toBe('UNKNOWN');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
});
