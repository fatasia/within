import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const dir = 'artifacts/sakura-ui';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'sakura' })));
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: '走进画中', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let i = 0; i < 90; i++) await new Promise(requestAnimationFrame);
  });
  await page.screenshot({ path: `${dir}/follow.png` });
  await page.getByRole('button', { name: '乘舟', exact: true }).click();
  await page.evaluate(async () => { for (let i = 0; i < 90; i++) await new Promise(requestAnimationFrame); });
  await page.screenshot({ path: `${dir}/passenger.png` });
  await writeFile(`${dir}/errors.json`, JSON.stringify(errors, null, 2));
  console.log(JSON.stringify({ errors, screenshots: dir }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
