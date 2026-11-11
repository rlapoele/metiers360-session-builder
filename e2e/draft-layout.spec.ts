import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1023, 1024, 1100, 1280]) {
  test(`draft layout and focus at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?q=Omar');
    await expect(
      page.locator('astro-island[component-export="CatalogueApp"]'),
    ).not.toHaveAttribute('ssr', '');
    await page
      .getByRole('button', { name: /^Ajouter à ma séance/ })
      .first()
      .click();
    const trigger = page.getByRole('button', { name: /^Ma séance, 1 vidéo/ });
    const panel = page.getByRole('complementary', { name: 'Ma séance' });
    await trigger.click();
    if (width < 1024) {
      await expect(panel).toBeHidden();
      const sheet = page.getByRole('dialog', {
        name: 'Ma séance',
        exact: true,
      });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('button', { name: 'Fermer' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    } else {
      await expect(panel).toBeVisible();
      await expect(
        panel.getByRole('heading', { name: 'Ma séance', exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole('button', { name: /^Consulter ma séance/ }),
      ).toBeHidden();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const catalogue = await page
        .getByRole('search', { name: 'Rechercher des vidéos' })
        .boundingBox();
      const rail = await panel.boundingBox();
      expect(catalogue).not.toBeNull();
      expect(rail).not.toBeNull();
      expect(rail!.x).toBeGreaterThanOrEqual(catalogue!.x + catalogue!.width);
      expect(rail!.width).toBeGreaterThan(280);
      await page.screenshot({
        path: info.outputPath(`catalogue-${width}.png`),
      });
      const finalise = panel.getByRole('button', {
        name: 'Finaliser ma séance',
      });
      await finalise.click();
      const form = page.getByRole('dialog', { name: 'Enregistrer la séance' });
      await expect(form.getByLabel('Nom de la séance')).toBeFocused();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(finalise).toBeFocused();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(
      await page
        .locator('main')
        .evaluate((main) =>
          [...main.querySelectorAll('article')].some(
            (card) => card.scrollWidth > card.clientWidth,
          ),
        ),
    ).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('hands open sheets and finalisation back to the appropriate layout after rotation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1023, height: 800 });
  await page.goto('/?q=Omar');
  await expect(
    page.locator('astro-island[component-export="CatalogueApp"]'),
  ).not.toHaveAttribute('ssr', '');
  await page
    .getByRole('button', { name: /^Ajouter à ma séance/ })
    .first()
    .click();
  await page.getByRole('button', { name: /^Ma séance, 1 vidéo/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Ma séance', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 800 });
  const panel = page.getByRole('complementary', { name: 'Ma séance' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    panel.getByRole('heading', { name: 'Ma séance', exact: true }),
  ).toBeFocused();
  await panel.getByRole('button', { name: 'Finaliser ma séance' }).click();
  await page.setViewportSize({ width: 1023, height: 800 });
  await page.keyboard.press('Escape');
  const sheet = page.getByRole('dialog', { name: 'Ma séance', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Fermer' })).toBeFocused();
  await sheet.getByRole('button', { name: 'Finaliser ma séance' }).click();
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    panel.getByRole('heading', { name: 'Ma séance', exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).not.toBe('hidden');
});
