import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = 'artifacts/qingming-review/final-ui';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11'] });
const results = [];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.addInitScript(() =>
      localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'qingming' })),
    );
    const start = Date.now();
    await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:5174/');
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    await page.getByRole('slider', { name: '游览进度' }).fill('790');
    await page.waitForTimeout(800);
    const timings = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let last = performance.now();
          const times = [];
          function frame(t) {
            times.push(t - last);
            last = t;
            if (times.length < 120) requestAnimationFrame(frame);
            else {
              times.sort((a, b) => a - b);
              resolve({ median: times[60], p95: times[114], max: times[119] });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
    await page.screenshot({ path: `${dir}/caravan-${width}.png` });
    await page.getByRole('slider', { name: '游览进度' }).fill('885');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/shop-${width}.png` });
    results.push({
      width,
      elapsedMs: Date.now() - start,
      rafIntervalsMs: timings,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${dir}/checks.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
if (results.some((x) => x.errors.length || x.overflow)) process.exitCode = 1;
