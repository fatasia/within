import { expect, test } from '@playwright/test';

test('featured scenes lead the collection on desktop and mobile', async ({ page }) => {
  await page.goto('/');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const cards = page
      .getByRole('region', { name: '画境收藏' })
      .getByRole('button', { name: /^选择/ });
    await expect(cards).toHaveCount(10);
    for (const [index, title] of [
      '星月夜',
      '山中冬夜',
      '清明上河图',
      '武汉 · 桂雨东湖',
    ].entries()) {
      await expect(cards.nth(index)).toHaveAccessibleName(`选择${title}`);
      await expect(cards.nth(index)).toContainText(String(index + 1).padStart(2, '0'));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
