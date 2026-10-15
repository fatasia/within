import { chromium } from '@playwright/test';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const collection = new Map([
  ['qianli', '千里江山图'],
  ['fuchun', '富春山居图'],
  ['xishan', '溪山行旅图'],
  ['starry', '星月夜'],
  ['empire', '帝国的进程'],
  ['winter', '山中冬夜'],
  ['qingming', '清明上河图'],
  ['guilin', '漓江 · 黄布倒影'],
  ['zhangjiajie', '武陵源 · 云起峰林'],
]);
const selection = process.env.PAINTINGS
  ? [
      ...new Set(
        process.env.PAINTINGS.split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ]
  : [...collection.keys()];
if (!selection.length || selection.some((id) => !collection.has(id))) {
  throw new Error(
    `PAINTINGS must contain comma-separated IDs: ${[...collection.keys()].join(', ')}`,
  );
}
const portraitValue = (process.env.PORTRAIT ?? '0').toLowerCase();
if (!['0', '1', 'false', 'true'].includes(portraitValue)) {
  throw new Error('PORTRAIT must be 0, 1, false or true');
}
const portrait = ['1', 'true'].includes(portraitValue);
const quality = process.env.QUALITY ?? 'balanced';
if (!['low', 'balanced', 'high'].includes(quality)) throw new Error('Invalid QUALITY');
const output = process.env.OUTPUT_DIR
  ? resolve(process.env.OUTPUT_DIR)
  : fileURLToPath(new URL('../artifacts/videos/', import.meta.url));
const previewUrl = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await mkdir(output, { recursive: true });
try {
  await page.goto(previewUrl);
  await page.getByRole('button', { name: '走进画中' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const id of selection) {
    const title = collection.get(id);
    const startedAt = new Date().toISOString();
    await page.getByRole('button', { name: `选择${title}`, exact: true }).click();
    await page.getByRole('button', { name: '走进画中' }).click();
    await page.getByRole('button', { name: '暂停游览', exact: true }).click();
    await page.getByRole('button', { name: '画境设置', exact: true }).click();
    await page.getByLabel('渲染画质').selectOption(quality);
    await page.getByRole('button', { name: '关闭设置', exact: true }).click();
    await page.getByRole('button', { name: '导出影片', exact: true }).click();
    await page.getByRole('button', { name: portrait ? /竖屏 ·/ : /横屏 ·/ }).click();
    const downloadPromise = page.waitForEvent('download', { timeout: 180000 });
    await page.getByRole('button', { name: /开始录制/ }).click();
    const download = await downloadPromise;
    const failure = await download.failure();
    if (failure) throw new Error(`${id}: download failed: ${failure}`);
    const stem = `${id}${portrait ? '-portrait' : ''}`;
    const destination = join(output, `${stem}.webm`);
    await download.saveAs(destination);
    if (errors.length) throw new Error(`${id}: browser errors:\n${errors.join('\n')}`);
    const bytes = (await stat(destination)).size;
    if (!bytes) throw new Error(`${id}: empty recording`);
    await writeFile(
      join(output, `${stem}.recording.json`),
      JSON.stringify(
        {
          painting: id,
          title,
          portrait,
          quality,
          startedAt,
          finishedAt: new Date().toISOString(),
          bytes,
          width: portrait ? 720 : 1280,
          height: portrait ? 1280 : 720,
          intendedDurationSeconds: 24,
        },
        null,
        2,
      ),
    );
    console.log(`Recorded ${stem}: ${(bytes / 1048576).toFixed(2)} MiB → ${destination}`);
    await page.getByRole('button', { name: '返回画馆', exact: true }).click();
  }
} finally {
  await browser.close();
}
