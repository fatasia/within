import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('terrain yields bounded CPU batches without creating a WebGL renderer', async ({ page }) => {
  test.setTimeout(120000);
  await page.route('**/terrain-cpu-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Terrain CPU fixture</title>',
    }),
  );
  await page.goto('/terrain-cpu-fixture');
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const measurements = await page.evaluate(async () => {
    // Vite modules run against a real 2D canvas; there is intentionally no WebGL scene.
    const { buildTerrainSteps } = await import('/src/engine/terrain.ts');
    const { getPainting } = await import('/src/data/paintings.ts');
    const { disposeObject } = await import('/src/engine/resources.ts');
    const measurements = [];
    for (const id of ['wuhan', 'qingming', 'xishan', 'guilin', 'winter']) {
      const times = [];
      const steps = buildTerrainSteps(getPainting(id));
      while (true) {
        const start = performance.now();
        const step = steps.next();
        times.push(performance.now() - start);
        if (step.done) {
          disposeObject(step.value.group);
          step.value.texture.dispose();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      measurements.push({
        id,
        batches: times.length,
        cpuMs: times.reduce((a, b) => a + b, 0),
        maximumMs: Math.max(...times),
        slowestBatch: times.indexOf(Math.max(...times)),
      });
    }
    return measurements;
  });
  await mkdir('artifacts/scene-switch', { recursive: true });
  await writeFile(
    'artifacts/scene-switch/terrain-cpu4x.json',
    JSON.stringify(
      { simulation: 'Desktop Chromium CPU throttled 4x, not physical mobile', measurements },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(measurements));
  for (const measurement of measurements) {
    expect(measurement.batches).toBeGreaterThan(50);
    // This coarse ceiling catches a lost yield; tighter frame budgets are reported, not
    // treated as universal hardware guarantees on a shared development machine.
    expect(measurement.maximumMs).toBeLessThan(250);
  }
});
