import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11'] });
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'roadster' })));
  const pending = new Map(), requests = [], messages = [], errors = [];
  const start = Date.now();
  page.on('request', request => {
    const record = { url: request.url(), type: request.resourceType(), startMs: Date.now() - start };
    pending.set(request, record); requests.push(record);
  });
  page.on('response', response => {
    const record = pending.get(response.request());
    if (record) { record.status = response.status(); record.responseMs = Date.now() - start; }
  });
  page.on('requestfinished', request => {
    const record = pending.get(request);
    if (record) record.finishedMs = Date.now() - start;
    pending.delete(request);
  });
  page.on('requestfailed', request => {
    const record = pending.get(request);
    if (record) { record.error = request.failure(); record.failedMs = Date.now() - start; }
    pending.delete(request);
  });
  page.on('console', message => messages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://fatasia.github.io/within/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  let entered = false, issue = null;
  try {
    await page.getByRole('button', { name: '进入试场', exact: true }).click({ timeout: 60000 });
    entered = true;
    await page.waitForTimeout(2000);
  } catch (error) { issue = error.message; }
  const result = {
    elapsedMs: Date.now() - start, entered, issue, errors, messages,
    pending: [...pending.values()], requests,
    text: (await page.locator('body').innerText()).slice(0, 2500),
  };
  await writeFile('artifacts/deployment/github-roadster-diagnostic.json', JSON.stringify(result, null, 2));
  await page.screenshot({ path: 'artifacts/deployment/github-roadster-diagnostic.png' });
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
