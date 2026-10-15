import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const [id, title] of [
  ['zhangjiajie', '武陵源 · 云起峰林'],
  ['guilin', '漓江 · 黄布倒影'],
  ['qingming', '清明上河图'],
]) {
  test(`${id}: home, tour and first-person views render without browser errors`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await mkdir('artifacts/screenshots', { recursive: true });
    await page.goto('/');
    await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: `选择${title}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `选择${title}`, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `artifacts/screenshots/${id}-home-new.png` });
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    await page.getByRole('button', { name: '暂停游览', exact: true }).click();
    await page.getByRole('button', { name: '画境设置', exact: true }).click();
    await page.getByRole('button', { name: '晴昼', exact: true }).click();
    await page.getByRole('button', { name: '关闭设置', exact: true }).click();
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `artifacts/screenshots/${id}-entered-new.png` });
    await page.getByRole('button', { name: '步行', exact: true }).click();
    await expect(page.getByRole('button', { name: '向前走', exact: true })).toBeVisible();
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `artifacts/screenshots/${id}-walk-new.png` });
    await page.keyboard.down('w');
    await page.waitForTimeout(250);
    await page.keyboard.up('w');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `artifacts/screenshots/${id}-walk-moved-new.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
