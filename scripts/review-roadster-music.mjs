import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/roadster-music-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button id="play">进入 Roadster</button>',
    }),
  );
  await page.goto('http://127.0.0.1:5173/roadster-music-review');
  await page.evaluate(async () => {
    const { createRoadsterMusic } = await import('/src/engine/roadsterMusic.ts');
    window.music = createRoadsterMusic();
    document.getElementById('play').onclick = () => window.music.play();
  });
  await page.click('#play');
  await page.waitForFunction(
    () => window.music.state === 'playing' && window.music.currentTime > 0.2,
  );
  const started = await page.evaluate(() => ({
    state: window.music.state,
    duration: window.music.element.duration,
    time: window.music.currentTime,
    beat: window.music.getBeat(),
  }));
  await page.evaluate(() => {
    window.music.element.currentTime = window.music.element.duration - 0.12;
  });
  await page.waitForFunction(() => window.music.currentTime < 0.5);
  const looped = await page.evaluate(() => ({
    state: window.music.state,
    time: window.music.currentTime,
  }));
  const disposed = await page.evaluate(() => {
    window.music.dispose();
    return {
      state: window.music.state,
      paused: window.music.element.paused,
      src: window.music.element.getAttribute('src'),
    };
  });
  if (errors.length || disposed.state !== 'disposed' || !disposed.paused || disposed.src !== null)
    throw Error(JSON.stringify({ errors, disposed }));
  await mkdir('artifacts/roadster-music', { recursive: true });
  const result = { started, looped, disposed, errors };
  await writeFile(
    'artifacts/roadster-music/browser-verification.json',
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser.close();
}
