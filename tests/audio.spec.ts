import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('all scene soundtracks render stereo without silence or clipping', async ({ page }) => {
  test.setTimeout(120000);
  await page.route('**/audio-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Soundtrack checks</title>',
    }),
  );
  await page.goto('/audio-test');
  const measurements = await page.evaluate(async () => {
    const path = '/src/engine/audio.ts';
    const { renderSoundtrack } = await import(/* @vite-ignore */ path);
    const ids = [
      'qianli',
      'fuchun',
      'xishan',
      'starry',
      'empire',
      'winter',
      'qingming',
      'zhangjiajie',
      'guilin',
    ];
    const result = [];
    for (const id of ids) {
      const blob: Blob = await renderSoundtrack(id, 24, 48000);
      const data = new DataView(await blob.arrayBuffer());
      let peak = 0,
        square = 0,
        tail = 0;
      for (let offset = 44; offset < data.byteLength; offset += 2) {
        const sample = data.getInt16(offset, true) / 32768;
        peak = Math.max(peak, Math.abs(sample));
        square += sample * sample;
        if (offset > data.byteLength - 960) tail = Math.max(tail, Math.abs(sample));
      }
      result.push({
        id,
        duration: (data.byteLength - 44) / (48000 * 4),
        channels: data.getUint16(22, true),
        peak,
        rms: Math.sqrt(square / ((data.byteLength - 44) / 2)),
        tail,
      });
    }
    return result;
  });
  for (const item of measurements) {
    expect(item.duration, item.id).toBe(24);
    expect(item.channels, item.id).toBe(2);
    expect(item.peak, item.id).toBeGreaterThan(0.01);
    expect(item.peak, item.id).toBeLessThan(0.8);
    expect(item.rms, item.id).toBeGreaterThan(0.002);
    expect(item.tail, item.id).toBeLessThan(0.005);
  }
  const path = test.info().outputPath('audio-measurements.json');
  await writeFile(path, JSON.stringify(measurements, null, 2));
  await test.info().attach('audio-measurements.json', { path, contentType: 'application/json' });
});

test('sound requires a gesture, switches scenes, and closes its audio context', async ({
  page,
}) => {
  await page.route('**/audio-lifecycle', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><button>播放</button>',
    }),
  );
  await page.goto('/audio-lifecycle');
  await page.evaluate(async () => {
    const contexts: AudioContext[] = [];
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        contexts.push(context);
        return context;
      },
    });
    const path = '/src/engine/audio.ts';
    const { AmbientAudio } = await import(/* @vite-ignore */ path);
    const audio = new AmbientAudio();
    document.body.dataset.contextsBeforeGesture = String(contexts.length);
    document.querySelector('button')!.addEventListener('click', async () => {
      await audio.start();
      for (const id of ['starry', 'winter', 'qingming', 'guilin', 'zhangjiajie'])
        audio.setPainting(id);
      audio.setMix(0.4, 0.7);
      await audio.stop();
      document.body.dataset.stopped = contexts[0]!.state;
      await audio.start();
      document.body.dataset.started = contexts[0]!.state;
      audio.dispose();
      setTimeout(() => {
        document.body.dataset.closed = contexts[0]!.state;
      }, 150);
    });
  });
  await expect(page.locator('body')).toHaveAttribute('data-contexts-before-gesture', '0');
  await page.getByRole('button', { name: '播放' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-stopped', 'suspended');
  await expect(page.locator('body')).toHaveAttribute('data-started', 'running');
  await expect(page.locator('body')).toHaveAttribute('data-closed', 'closed');
});

test('music and environmental buses render independently, including crowd and insects', async ({
  page,
}) => {
  await page.route('**/audio-mix', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Mix checks</title>' }),
  );
  await page.goto('/audio-mix');
  const results = await page.evaluate(async () => {
    const path = '/src/engine/audio.ts';
    const { renderSoundtrack } = await import(/* @vite-ignore */ path);
    const result = [];
    for (const id of ['qingming', 'starry', 'winter']) {
      const levels = [];
      for (const mix of [
        { music: 0, ambience: 0 },
        { music: 1, ambience: 0 },
        { music: 0, ambience: 1 },
      ]) {
        const blob: Blob = await renderSoundtrack(id, 8, 22050, mix);
        const view = new DataView(await blob.arrayBuffer());
        let squared = 0;
        for (let i = 44; i < view.byteLength; i += 2)
          squared += (view.getInt16(i, true) / 32768) ** 2;
        levels.push(Math.sqrt(squared / ((view.byteLength - 44) / 2)));
      }
      result.push({ id, levels });
    }
    return result;
  });
  for (const { id, levels } of results) {
    expect(levels[0], `${id}: both muted`).toBe(0);
    expect(levels[1], `${id}: music only`).toBeGreaterThan(0.001);
    expect(levels[2], `${id}: environment only`).toBeGreaterThan(0.0001);
    expect(Math.abs(levels[1]! - levels[2]!), `${id}: distinct stems`).toBeGreaterThan(0.0001);
  }
});

test('rapid mute and scene switches cannot reopen the master output', async ({ page }) => {
  await page.route('**/audio-race', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><button>Start</button>' }),
  );
  await page.goto('/audio-race');
  await page.evaluate(async () => {
    const path = '/src/engine/audio.ts';
    const { AmbientAudio } = await import(/* @vite-ignore */ path);
    const audio = new AmbientAudio();
    document.querySelector('button')!.addEventListener('click', async () => {
      try {
        await audio.start();
        const stopping = audio.stop();
        audio.setPainting('qingming');
        audio.setPainting('starry');
        const retired = [...audio.retired.keys()] as { music: GainNode; ambience: GainNode }[];
        const scheduled: number[] = [];
        for (const graph of retired)
          for (const param of [graph.music.gain, graph.ambience.gain]) {
            const schedule = param.linearRampToValueAtTime.bind(param);
            param.linearRampToValueAtTime = (value, time) => {
              scheduled.push(value);
              return schedule(value, time);
            };
          }
        audio.setMix(0, 0);
        const retiredMuted =
          retired.length > 0 &&
          scheduled.length === retired.length * 2 &&
          scheduled.every((value) => value === 0);
        await stopping;
        await new Promise((resolve) => setTimeout(resolve, 350));
        document.body.dataset.master = String(audio.master.gain.value);
        document.body.dataset.state = audio.context.state;
        document.body.dataset.retired = String(audio.retired.size);
        document.body.dataset.retiredMuted = String(retiredMuted);
        audio.setMix(0, 0);
        await audio.start();
        await new Promise((resolve) => setTimeout(resolve, 80));
        document.body.dataset.pausedMix = `${audio.graph.music.gain.value},${audio.graph.ambience.gain.value}`;
        // Last request wins even when a resume has not resolved yet.
        const masterEvents: number[] = [];
        const masterParam = audio.master.gain as AudioParam;
        const setMasterValue = masterParam.setValueAtTime.bind(masterParam);
        masterParam.setValueAtTime = (value, time) => { masterEvents.push(value); return setMasterValue(value, time); };
        const first = audio.start();
        const second = audio.stop();
        const third = audio.start();
        const last = audio.stop();
        audio.setPainting('winter');
        await Promise.all([first, second, third, last]);
        document.body.dataset.lastState = audio.context.state;
        // Suspended AudioParam.value is frozen until another render quantum.
        document.body.dataset.lastMaster = String(masterEvents.at(-1));
        audio.dispose();
        document.body.dataset.done = 'true';
      } catch (error) {
        document.body.dataset.error = String(error);
      }
    });
  });
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-done', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-master', '0');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'suspended');
  await expect(page.locator('body')).toHaveAttribute('data-retired', '0');
  await expect(page.locator('body')).toHaveAttribute('data-retired-muted', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-paused-mix', '0,0');
  await expect(page.locator('body')).toHaveAttribute('data-last-state', 'suspended');
  await expect(page.locator('body')).toHaveAttribute('data-last-master', '0');
});
