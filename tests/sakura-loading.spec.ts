import { expect, test } from '@playwright/test';

test('Sakura cold entry, cached re-entry and scene switching remain usable', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS|WebGLProgram/.test(message.text())) errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'sakura' })));
  const started = Date.now();
  await page.goto('/');
  await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled({ timeout: 20000 });
  await page.getByRole('button', { name: '走进画中', exact: true }).click();
  await expect(page.getByRole('button', { name: '乘舟', exact: true })).toBeVisible({ timeout: 10000 });
  await page.waitForFunction(() => performance.getEntriesByName('sakura:boat-ready').length > 0, undefined, { timeout: 45000 });
  const readyMs = Date.now() - started;
  const entries: number[] = [];
  for (let i = 0; i < 2; i++) {
    const at = Date.now();
    await page.getByRole('button', { name: '返回画境首页', exact: true }).click();
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    await page.getByRole('button', { name: '乘舟', exact: true }).click();
    await expect(page.getByRole('button', { name: '乘舟', exact: true })).toHaveAttribute('aria-pressed', 'true');
    entries.push(Date.now() - at);
  }
  await page.getByRole('button', { name: '选择画境，当前樱谷行舟', exact: true }).click();
  await page.getByRole('button', { name: /^切换到西湖雷峰塔/ }).click();
  await expect(page.locator('.scene-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByRole('button', { name: '选择画境，当前西湖雨后', exact: true }).click();
  await page.getByRole('button', { name: /^切换到樱谷行舟/ }).click();
  await expect(page.locator('.scene-loading')).toHaveCount(0, { timeout: 30000 });
  await page.getByRole('button', { name: '乘舟', exact: true }).click();
  await expect(page.getByRole('button', { name: '乘舟', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await info.attach('entrance-timing', { body: JSON.stringify({ readyMs, repeatedEntryMs: entries }), contentType: 'application/json' });
  await page.screenshot({ path: info.outputPath('sakura-reentered.png') });
  expect(entries.every(value => value < 10000)).toBe(true);
  expect(errors).toEqual([]);
});

test('Sakura model loading failure preserves the scene and a working return action', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/sakura/models/*.glb', route => route.abort('failed'));
  await page.addInitScript(() => localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'sakura' })));
  await page.goto('/');
  await page.getByRole('button', { name: '走进画中', exact: true }).click();
  await expect(page.getByRole('button', { name: '乘舟', exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: '返回画境首页', exact: true }).click();
  await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeVisible({ timeout: 10000 });
  expect(errors).toEqual([]);
});
