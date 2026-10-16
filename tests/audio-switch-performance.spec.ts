import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('isolates audio graph rebuild CPU cost from scene rendering', async ({ page }) => {
  await page.route('**/audio-cpu-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Audio CPU fixture</title>',
    }),
  );
  await page.goto('/audio-cpu-fixture');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const measurements = await page.evaluate(async () => {
    const path = '/src/engine/audio.ts';
    const { AmbientAudio } = await import(path);
    const sound = new AmbientAudio();
    // The same graph builder runs against offline nodes, without a device or WebGL.
    sound.context = new OfflineAudioContext(2, 96000, 48000);
    sound.master = sound.context.createGain();
    const nodeCosts: { name: string; milliseconds: number }[] = [];
    for (const name of ['createConvolver', 'createBufferSource', 'createOscillator']) {
      const create = sound.context[name].bind(sound.context);
      sound.context[name] = (...args: unknown[]) => {
        const start = performance.now();
        const node = create(...args);
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'buffer');
        if (descriptor?.set)
          Object.defineProperty(node, 'buffer', {
            get: () => descriptor.get!.call(node),
            set: (value) => {
              const start = performance.now();
              descriptor.set!.call(node, value);
              nodeCosts.push({ name: `${name}.buffer`, milliseconds: performance.now() - start });
            },
          });
        nodeCosts.push({ name, milliseconds: performance.now() - start });
        return node;
      };
    }
    sound.enabled = true;
    const longtasks: number[] = [];
    const observer = new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => longtasks.push(entry.duration)),
    );
    observer.observe({ type: 'longtask' });
    const results = [];
    let cancelledScene = '',
      keptOldGraph = false,
      cacheSize = 0;
    try {
      for (const id of ['wuhan', 'winter', 'wuhan', 'winter']) {
        const start = performance.now();
        sound.setPainting(id);
        const handlerMs = performance.now() - start;
        await sound.buildTask;
        results.push({
          id,
          handlerMs,
          readyMs: performance.now() - start,
          graphPainting: sound.graphPainting,
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const previous = sound.graph;
      sound.setPainting('qingming');
      const obsolete = sound.buildTask;
      await new Promise((resolve) => setTimeout(resolve, 10));
      keptOldGraph = sound.graph === previous;
      sound.setPainting('wuhan');
      await sound.buildTask;
      await obsolete;
      cancelledScene = sound.graphPainting;
      for (const id of ['guilin', 'starry']) {
        sound.setPainting(id);
        await sound.buildTask;
      }
      cacheSize = sound.buffers.size;
    } finally {
      // dispose() expects a live AudioContext.close; release offline nodes first.
      observer.disconnect();
      sound.graph?.dispose();
      sound.graph = null;
      sound.context = null;
      sound.dispose();
    }
    return {
      results,
      longtasks,
      cancelledScene,
      keptOldGraph,
      cacheSize,
      nodeCosts: nodeCosts.filter((cost) => cost.name.endsWith('.buffer') || cost.milliseconds > 5),
    };
  });
  await mkdir('artifacts/scene-switch', { recursive: true });
  await writeFile('artifacts/scene-switch/audio-cpu4x.json', JSON.stringify(measurements, null, 2));
  console.log(JSON.stringify(measurements));
  expect(measurements.results).toHaveLength(4);
  for (const result of measurements.results) {
    expect(result.handlerMs).toBeLessThan(30);
    expect(result.graphPainting).toBe(result.id);
  }
  // A cold native convolution FFT is not divisible; cached switches must not rerun it.
  expect(
    measurements.nodeCosts.filter((cost) => cost.name === 'createConvolver.buffer'),
  ).toHaveLength(4);
  expect(measurements.cancelledScene).toBe('wuhan');
  expect(measurements.keptOldGraph).toBe(true);
  expect(measurements.cacheSize).toBe(3);
  expect(Math.max(0, ...measurements.longtasks)).toBeLessThan(120);
});
