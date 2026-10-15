import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5175';
const folder = resolve('artifacts/delivery');
const names = [
  'starry',
  'winter',
  'qingming',
  'wuhan',
  'qianli',
  'fuchun',
  'xishan',
  'empire',
  'zhangjiajie',
  'guilin',
  'within-all-worlds-30s',
];
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir(`${folder}/playback-checks`, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/film-check', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><style>body{margin:0;background:#101916}video{width:100vw;height:100vh}</style><video controls muted playsinline></video>',
    }),
  );
  await page.goto(new URL('/film-check', base).href);
  for (const name of names) {
    // Decode every audio and video packet, not just container metadata.
    execFileSync(
      process.env.FFMPEG ?? 'ffmpeg',
      ['-hide_banner', '-v', 'error', '-xerror', '-i', `${folder}/${name}.mp4`, '-f', 'null', '-'],
      { windowsHide: true, stdio: 'pipe' },
    );
    const result = await page.evaluate(
      async ({ url, end }) => {
        const video = document.querySelector('video');
        video.src = url;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video load timed out')), 15000);
          video.onloadeddata = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Video error ${video.error?.code}`));
          };
          video.load();
        });
        await video.play();
        await new Promise((resolve, reject) => {
          const deadline = performance.now() + 10000;
          const check = () => {
            if (video.currentTime > 0.1) resolve();
            else if (video.error || performance.now() > deadline)
              reject(
                new Error(`Playback did not advance: ${video.error?.message ?? video.currentTime}`),
              );
            else setTimeout(check, 50);
          };
          check();
        });
        const advanced = video.currentTime > 0.1;
        video.pause();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video seek timed out')), 10000);
          video.onseeked = () => {
            clearTimeout(timeout);
            resolve();
          };
          video.currentTime = end - 0.7;
        });
        if (!advanced || video.error || video.videoWidth !== 1920 || video.readyState < 2)
          throw new Error(
            `Browser playback validation failed: ${JSON.stringify({ advanced, width: video.videoWidth, readyState: video.readyState, error: video.error?.message })}`,
          );
        return {
          advanced,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          lastSeek: video.currentTime,
          readyState: video.readyState,
        };
      },
      {
        url: new URL(`/artifacts/delivery/${name}.mp4`, base).href,
        end: name.includes('30s') ? 30 : 10,
      },
    );
    await page.screenshot({ path: `${folder}/playback-checks/${name}.jpg` });
    results.push({ name, fullDecode: true, ...result });
    console.log(`Playback verified: ${name}`);
  }
  await writeFile(`${folder}/playback-checks/report.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
