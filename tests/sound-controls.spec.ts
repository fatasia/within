import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 667 },
]) {
  test(`sound controls remain usable at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('button', { name: '走进画中' })).toBeEnabled();
    await expect(page.getByRole('button', { name: '开启配乐与音效' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.getByRole('button', { name: '走进画中' }).click();
    await page.getByRole('button', { name: '暂停游览', exact: true }).click();
    await page.getByRole('button', { name: '画境设置', exact: true }).click();
    await expect(page.getByText('青绿远汀', { exact: true })).toBeVisible();
    const music = page.getByRole('slider', { name: /背景音乐/ });
    const ambience = page.getByRole('slider', { name: /场景音效/ });
    await music.fill('0');
    await expect(music).toHaveValue('0');
    await expect(ambience).toHaveValue('0.62');
    await ambience.fill('0.8');
    await expect(ambience).toHaveValue('0.8');
    await page.getByRole('button', { name: '开启声音', exact: true }).click();
    await expect(page.getByRole('button', { name: '关闭配乐与音效' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(ambience).toBeVisible();
    const rect = await ambience.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await mkdir('artifacts/screenshots', { recursive: true });
    await page.screenshot({ path: `artifacts/screenshots/sound-controls-${viewport.width}.png` });
    await page.getByRole('button', { name: '关闭声音', exact: true }).click();
    await expect(page.getByRole('button', { name: '开启配乐与音效' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(errors).toEqual([]);
  });
}
