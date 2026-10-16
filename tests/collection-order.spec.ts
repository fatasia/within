import { expect, test } from '@playwright/test';

test('featured scenes lead the collection on desktop and mobile', async ({ page }) => {
  await page.goto('/');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const cards = page
      .getByRole('region', { name: '画境收藏' })
      .getByRole('button', { name: /^选择/ });
    await expect(cards).toHaveCount(18);
    for (const [index, title] of [
      'Roadster · 未来之形',
      '清明上河图',
      '武汉 · 桂雨东湖',
      '星月夜',
      '山中冬夜',
      '北极冰川 · 极光',
      '樱谷行舟',
      '深海蓝眼泪 · 生物荧光',
      '西湖雷峰塔 · 雨后',
    ].entries()) {
      await expect(cards.nth(index)).toHaveAccessibleName(`选择${title}`);
      await expect(cards.nth(index)).toContainText(String(index + 1).padStart(2, '0'));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
