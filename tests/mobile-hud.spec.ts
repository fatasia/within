import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
for (const viewport of [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`touch HUD preserves scene and controls ${viewport.width}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'arctic' })),
    );
    await page.goto(process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5174');
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    await expect(page.locator('.mobile-hud')).toBeVisible();
    await expect(page.locator('.mobile-dock .mini-map canvas')).toBeVisible();
    await expect(page.getByRole('navigation', { name: '章节时间轴' })).toBeVisible();
    await expect(page.locator('.scene-tools')).toBeHidden();
    await expect(page.locator('.chapter-caption')).toBeHidden();
    await page.getByRole('slider', { name: '游览进度', exact: true }).fill('380');
    const clear = await page.evaluate(() => {
      const a = document.querySelector('.mobile-top')!.getBoundingClientRect(),
        b = document.querySelector('.mobile-dock')!.getBoundingClientRect();
      return {
        fraction: (b.top - a.bottom) / innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(clear.fraction).toBeGreaterThan(viewport.height < 500 ? 0.55 : 0.75);
    expect(clear.overflow).toBe(false);
    await page.getByRole('button', { name: '章节', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '切换游览速度', exact: true }).click();
    await expect(page.locator('.mobile-speed')).toContainText('2×');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /03.*白熊远行/ })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: '更多操作', exact: true }).click();
    await page.getByRole('button', { name: '画境设置', exact: true }).click();
    await expect(page.getByRole('region', { name: '画境设置' })).toBeVisible();
    await page.getByRole('button', { name: '关闭设置' }).click();
    await page.getByRole('button', { name: '收起游览控件' }).click();
    await expect(page.locator('.mobile-top')).toBeHidden();
    await page.getByRole('button', { name: '显示游览控件' }).click();
    await mkdir('artifacts/mobile-hud-2026-10-17', { recursive: true });
    await page.waitForTimeout(3600);
    await page.screenshot({ path: `artifacts/mobile-hud-2026-10-17/arctic-${viewport.width}.png` });
    await page.getByRole('button', { name: /选择画境，当前/ }).click();
    await page.getByRole('button', { name: /^切换到樱谷行舟/ }).click();
    await page.locator('.mobile-modes').getByRole('button', { name: '乘舟' }).click();
    await expect(
      page.locator('.mobile-modes').getByRole('button', { name: '乘舟' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '自动游览', exact: true }).click();
    await expect(
      page.locator('.mobile-modes').getByRole('button', { name: '乘舟' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /选择画境，当前/ }).click();
    await page.getByRole('button', { name: /^切换到Roadster/ }).click();
    await page.locator('.mobile-boost').click();
    await expect(page.locator('.mobile-car-speed')).toContainText('KM/H');
    await page.getByRole('button', { name: '车辆', exact: true }).click();
    await page.getByRole('button', { name: '深红喷漆' }).click();
    await expect(page.getByRole('button', { name: '深红喷漆' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: '车顶彩蛋', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: '车辆', exact: true }).click();
    await page.getByRole('button', { name: '切换倒车挡', exact: true }).click();
    await expect(page.getByRole('button', { name: '倒车', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '车辆', exact: true }).click();
    await page.getByRole('button', { name: '切换前进挡', exact: true }).click();
    const throttle = page.getByRole('button', { name: '油门', exact: true });
    await throttle.dispatchEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      bubbles: true,
    });
    await throttle.dispatchEvent('pointercancel', {
      pointerId: 1,
      pointerType: 'touch',
      bubbles: true,
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `artifacts/mobile-hud-2026-10-17/roadster-${viewport.width}.png`,
    });
    expect(errors).toEqual([]);
    await context.close();
  });
}
test('desktop keeps its full controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'arctic' })),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '走进画中', exact: true }).click();
  await expect(page.locator('.mobile-hud')).toBeHidden();
  await expect(page.locator('.scene-tools')).toBeVisible();
  await expect(page.locator('.journey-panel')).toBeVisible();
});
