import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const urls = process.argv.slice(2);
if (!urls.length) throw new Error('Pass one or more deployed site URLs.');
const output = 'artifacts/live-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
});
const reports = [];
try {
  for (const url of urls) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const continueLink = page.getByText('确定访问', { exact: true });
    if (await continueLink.isVisible()) await continueLink.click();
    const enter = page.getByRole('button', { name: '走进画中', exact: true });
    await expect(enter).toBeEnabled({ timeout: 90000 });
    await page.getByRole('button', { name: '选择星月夜', exact: true }).click();
    await expect(enter).toBeEnabled();
    await enter.click();
    const world = page.locator('[data-testid="world"]');
    await expect(world).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('button', { name: '返回画境首页', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '下一个画境', exact: true }).click();
    await expect(
      page.getByRole('button', { name: '选择画境，当前山中冬夜', exact: true }),
    ).toBeVisible();
    const originals = [];
    for (const title of ['千里江山图', '富春山居图', '溪山行旅图', '武汉 · 桂雨东湖']) {
      await page.locator('.scene-switcher-current').click();
      await page.getByRole('button', { name: `切换到${title}`, exact: true }).click();
      await expect(world).toHaveAttribute('aria-busy', 'false', { timeout: 30000 });
      await page.getByRole('button', { name: '查看原作与出处', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      if (!title.startsWith('武汉')) {
        const image = dialog.locator('img');
        await expect
          .poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0))
          .toBe(true);
        originals.push({ title, width: await image.evaluate((node) => node.naturalWidth) });
      } else await expect(dialog).toContainText('没有对应的单幅古画');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
    await expect(
      page.getByRole('button', { name: '选择画境，当前桂雨东湖', exact: true }),
    ).toBeVisible();
    if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
      throw new Error(`Horizontal overflow: ${url}`);
    await page.screenshot({ path: `${output}/${new URL(url).hostname}.png` });
    await page.getByRole('button', { name: '返回画境首页', exact: true }).click();
    await expect(enter).toBeVisible();
    if (errors.length) throw new Error(JSON.stringify(errors));
    reports.push({
      url,
      originals,
      browserErrors: errors,
      mobileWidth: 390,
      checkedAt: new Date().toISOString(),
    });
    console.log(`Live verified: ${url}`);
    await page.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}
