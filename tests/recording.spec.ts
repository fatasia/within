import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

async function prepare(page: Page): Promise<void> {
  await page.route('**/recording-test', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><button id="record">录制</button><div id="scene" style="width:640px;height:360px"></div>',
    }),
  );
  await page.goto('/recording-test');
}

test('walk-mode export includes an Opus soundtrack and restores field of view', async ({
  page,
}) => {
  test.setTimeout(90000);
  await prepare(page);
  await page.evaluate(async () => {
    const modulePath = '/src/engine/Experience.ts';
    const statePath = '/src/state.ts';
    const { Experience } = await import(/* @vite-ignore */ modulePath);
    const { initialState } = await import(/* @vite-ignore */ statePath);
    const contexts: AudioContext[] = [];
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        contexts.push(context);
        return context;
      },
    });
    const experience = new Experience(
      document.getElementById('scene'),
      { ...initialState, entered: true, mode: 'walk', quality: 'low' },
      { onTelemetry() {}, onError() {} },
    );
    document.body.dataset.beforeFov = String(experience.camera.fov);
    document.getElementById('record')!.addEventListener('click', async () => {
      try {
        const film: Blob = await experience.recordFilm(
          () => {
            document.body.dataset.duringFov = String(experience.camera.fov);
          },
          false,
          2,
        );
        const reader = new FileReader();
        reader.onload = () => {
          document.body.dataset.film = String(reader.result);
          document.body.dataset.done = 'true';
        };
        document.body.dataset.afterFov = String(experience.camera.fov);
        document.body.dataset.contextState = contexts[0]!.state;
        document.body.dataset.busy = String(experience.filmActive);
        reader.readAsDataURL(film);
      } catch (error) {
        document.body.dataset.error = String(error);
      } finally {
        experience.dispose();
      }
    });
  });
  await page.getByRole('button', { name: '录制', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-done', 'true', { timeout: 45000 });
  const data = await page.locator('body').evaluate((body) => ({ ...body.dataset }));
  expect(data.error).toBeUndefined();
  expect(Number(data.beforeFov)).toBeGreaterThan(39);
  expect(Number(data.duringFov)).toBe(39);
  expect(data.afterFov).toBe(data.beforeFov);
  expect(data.contextState).toBe('closed');
  expect(data.busy).toBe('false');
  const path = test.info().outputPath('walk-with-sound.webm');
  await writeFile(path, Buffer.from(data.film!.slice(data.film!.lastIndexOf(',') + 1), 'base64'));
  const metadata = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', path], {
      encoding: 'utf8',
    }),
  ) as {
    streams: { codec_type: string; codec_name: string; channels?: number; sample_rate?: string }[];
  };
  expect(metadata.streams.some((stream) => stream.codec_type === 'video')).toBe(true);
  expect(metadata.streams.find((stream) => stream.codec_type === 'audio')).toMatchObject({
    codec_name: 'opus',
    channels: 2,
    sample_rate: '48000',
  });
  const pcm = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-map', '0:a:0', '-f', 'f32le', 'pipe:1'],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  expect(pcm.length / (48000 * 2 * 4)).toBeGreaterThan(1.5);
  let peak = 0;
  for (let offset = 0; offset < pcm.length; offset += 4)
    peak = Math.max(peak, Math.abs(pcm.readFloatLE(offset)));
  expect(peak).toBeGreaterThan(0.01);
  expect(peak).toBeLessThan(0.8);
  await test.info().attach('recording.webm', { path, contentType: 'video/webm' });
});

test('recording exceptions and disposal release the busy lock and audio context', async ({
  page,
}) => {
  test.setTimeout(90000);
  await prepare(page);
  await page.evaluate(async () => {
    const modulePath = '/src/engine/Experience.ts',
      statePath = '/src/state.ts';
    const { Experience } = await import(/* @vite-ignore */ modulePath);
    const { initialState } = await import(/* @vite-ignore */ statePath);
    const contexts: AudioContext[] = [];
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        contexts.push(context);
        return context;
      },
    });
    const experience = new Experience(
      document.getElementById('scene'),
      { ...initialState, entered: true, mode: 'walk', quality: 'low' },
      { onTelemetry() {}, onError() {} },
    );
    document.getElementById('record')!.addEventListener('click', async () => {
      try {
        await experience.recordFilm(
          () => {
            throw new Error('progress-callback-test');
          },
          false,
          0.5,
        );
      } catch (error) {
        document.body.dataset.firstError = String(error);
      }
      document.body.dataset.afterErrorBusy = String(experience.filmActive);
      const pending = experience.recordFilm(() => {}, false, 2);
      experience.dispose();
      try {
        await pending;
      } catch (error) {
        document.body.dataset.cancelError = (error as Error).name;
      }
      document.body.dataset.afterCancelBusy = String(experience.filmActive);
      document.body.dataset.contexts = contexts.map((context) => context.state).join(',');
      document.body.dataset.done = 'true';
    });
  });
  await page.getByRole('button', { name: '录制', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-done', 'true', { timeout: 45000 });
  await expect(page.locator('body')).toHaveAttribute(
    'data-first-error',
    'Error: progress-callback-test',
  );
  await expect(page.locator('body')).toHaveAttribute('data-after-error-busy', 'false');
  await expect(page.locator('body')).toHaveAttribute('data-cancel-error', 'AbortError');
  await expect(page.locator('body')).toHaveAttribute('data-after-cancel-busy', 'false');
  await expect(page.locator('body')).toHaveAttribute('data-contexts', 'closed,closed');
});
