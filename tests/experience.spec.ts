import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function setTime(page: Page, label: '晴昼' | '夜色'): Promise<void> {
  await page.getByRole('button', { name: '画境设置', exact: true }).click();
  const choice = page.getByRole('button', { name: label, exact: true });
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭设置', exact: true }).click();
}

test('nine worlds, navigation, settings, dialogs and screenshots', async ({ page }) => {
  // Procedural rebuilds and screenshots can exceed a minute on software WebGL.
  test.setTimeout(120000);
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: '走进画中' })).toBeEnabled();
  await mkdir('artifacts/screenshots', { recursive: true });
  for (const [id, title] of [
    ['qianli', '千里江山图'],
    ['fuchun', '富春山居图'],
    ['xishan', '溪山行旅图'],
    ['starry', '星月夜'],
    ['winter', '山中冬夜'],
    ['qingming', '清明上河图'],
    ['guilin', '漓江 · 黄布倒影'],
    ['zhangjiajie', '武陵源 · 云起峰林'],
    ['empire', '帝国的进程'],
  ]) {
    await page.getByRole('button', { name: `选择${title}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `选择${title}`, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `artifacts/screenshots/${id}-desktop.png` });
  }
  await page.getByRole('button', { name: '走进画中' }).click();
  await expect(page.getByRole('button', { name: '暂停游览', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '暂停游览', exact: true }).click();
  await page.getByRole('button', { name: '荒凉', exact: true }).click();
  await expect(page.getByRole('button', { name: '荒凉', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '画境设置', exact: true }).click();
  await page.getByLabel('渲染画质').selectOption('low');
  await expect(page.getByLabel('渲染画质')).toHaveValue('low');
  await page.getByRole('button', { name: '夜色', exact: true }).click();
  await expect(page.getByRole('button', { name: '夜色', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '关闭设置' }).click();
  await page.getByRole('button', { name: '漫游', exact: true }).click();
  await expect(page.getByRole('button', { name: '漫游', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '步行', exact: true }).click();
  await expect(page.getByRole('button', { name: '向前走' })).toBeVisible();
  await page.getByRole('button', { name: '操作说明' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '返回画馆', exact: true }).click();
  await page.getByRole('button', { name: '选择千里江山图', exact: true }).click();
  await page.getByRole('button', { name: '走进画中' }).click();
  await page.getByRole('button', { name: '暂停游览', exact: true }).click();
  await page.getByRole('button', { name: /长桥卧波/ }).click();
  await expect(page.getByLabel('游览进度')).toHaveValue('400');
  await page.screenshot({ path: 'artifacts/screenshots/qianli-explore.png' });
  expect(errors).toEqual([]);
});

test('mobile has no horizontal overflow and all collection choices are accessible', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '走进画中' })).toBeEnabled();
  await mkdir('artifacts/screenshots', { recursive: true });
  const loadedFont = await page.evaluate(async () => {
    const faces = await document.fonts.load('400 32px "Landscape Serif"', '山水冬夜');
    await document.fonts.ready;
    return faces.length > 0 && faces.every((font) => font.status === 'loaded');
  });
  expect(loadedFont).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/mobile-home.png', fullPage: true });
  for (const title of ['清明上河图', '漓江 · 黄布倒影', '武陵源 · 云起峰林']) {
    const choice = page.getByRole('button', { name: `选择${title}`, exact: true });
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: '选择星月夜', exact: true }).click();
  await expect(page.getByRole('button', { name: '选择星月夜', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '选择山中冬夜', exact: true }).click();
  await expect(page.getByRole('button', { name: '选择山中冬夜', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('heading', { name: '山中冬夜', exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'artifacts/screenshots/mobile-winter.png', fullPage: true });
  await page.getByRole('button', { name: '走进画中' }).click();
  await page.getByRole('button', { name: '暂停游览', exact: true }).click();
  await page.getByRole('button', { name: '步行', exact: true }).click();
  await expect(page.getByRole('button', { name: '向前走' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/screenshots/mobile-explore.png' });
  expect(errors).toEqual([]);
});

for (const [id, title] of [
  ['qianli', '千里江山图'],
  ['xishan', '溪山行旅图'],
  ['starry', '星月夜'],
]) {
  test(`${id}: time settings and grounded close-up camera view`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: '走进画中' })).toBeEnabled();
    await mkdir('artifacts/screenshots', { recursive: true });
    await page.getByRole('button', { name: `选择${title}`, exact: true }).click();
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    await page.getByRole('button', { name: '暂停游览', exact: true }).click();
    if (id === 'qianli') {
      await setTime(page, '夜色');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'artifacts/screenshots/qianli-night.png' });
    }
    await setTime(page, id === 'starry' ? '夜色' : '晴昼');
    await page.getByRole('button', { name: '步行', exact: true }).click();
    await expect(page.getByRole('button', { name: '步行', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: '向前走', exact: true })).toBeVisible();
    // Exercise a real movement key, then allow the damped camera to settle.
    await page.keyboard.down('w');
    await page.waitForTimeout(250);
    await page.keyboard.up('w');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `artifacts/screenshots/${id}-walk.png` });
    expect(errors).toEqual([]);
  });
}
