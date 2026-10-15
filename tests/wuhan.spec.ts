import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('East Lake has reachable detail chapters and mobile walking controls', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '选择武汉 · 桂雨东湖', exact: true }).click();
  await expect(page.getByRole('heading', { name: '桂雨东湖', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '走进画中', exact: true }).click();
  await page.getByRole('button', { name: '暂停游览', exact: true }).click();
  await mkdir('artifacts/screenshots', { recursive: true });
  for (const [title, progress, file] of [
    ['枝间金粟', '210', 'flowers'],
    ['湖亭小歇', '660', 'shelter'],
  ]) {
    await page.getByRole('button', { name: new RegExp(title!) }).click();
    await expect(page.getByLabel('游览进度')).toHaveValue(progress!);
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `artifacts/screenshots/wuhan-${file}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '步行', exact: true }).click();
  const stick = page.getByRole('group', { name: '步行摇杆，按住拖动控制方向和速度' });
  await expect(stick).toBeVisible();
  const bounds = (await stick.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 18, bounds.y + bounds.height / 2 - 22);
  await page.waitForTimeout(180);
  await page.mouse.up();
  await page.waitForTimeout(2300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/wuhan-mobile-walk.png' });
  expect(errors).toEqual([]);
});
