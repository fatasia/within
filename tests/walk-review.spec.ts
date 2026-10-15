import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('ten authored walking starts and three metres of real forward movement', async ({ page }) => {
  test.setTimeout(240000);
  await mkdir('artifacts/walk-review', { recursive: true });
  await page.setViewportSize({ width: 1200, height: 750 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/walk-review-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body style="margin:0"><div id="stage" style="width:100vw;height:100vh"></div></body></html>',
    }),
  );
  await page.goto('/walk-review-fixture');
  const reports = [];
  for (const id of [
    'qianli',
    'fuchun',
    'xishan',
    'starry',
    'empire',
    'winter',
    'qingming',
    'zhangjiajie',
    'guilin',
    'wuhan',
  ]) {
    const report = await page.evaluate(async (painting) => {
      const engineModule = '/src/engine/Experience.ts',
        stateModule = '/src/state.ts',
        terrainModule = '/src/engine/terrain.ts';
      const { Experience } = await import(engineModule),
        { initialState } = await import(stateModule);
      const { groundHeight } = await import(terrainModule);
      const engine = new Experience(
        document.getElementById('stage')!,
        { ...initialState, painting, quality: 'high' },
        {
          onTelemetry() {},
          onError(message: string) {
            throw new Error(message);
          },
        },
      );
      cancelAnimationFrame(engine.frame);
      engine.configure({
        ...initialState,
        painting,
        quality: 'high',
        entered: true,
        mode: 'walk',
        time: 'day',
      });
      engine.elapsed = 3;
      engine.updateAtmosphere(2);
      engine.updateCamera(2);
      engine.renderer.render(engine.scene, engine.camera);
      (window as unknown as Record<string, unknown>).__walkReview = { engine, groundHeight };
      return {
        painting,
        start: engine.walkingPosition.toArray(),
        ground: groundHeight(engine.painting, engine.walkingPosition.x, engine.walkingPosition.z),
        yaw: engine.yaw,
      };
    }, id);
    await page.locator('canvas').screenshot({ path: `artifacts/walk-review/${id}-start.png` });
    const forward = await page.evaluate(() => {
      const { engine, groundHeight } = (window as unknown as Record<string, any>).__walkReview;
      const samples: number[][] = [];
      engine.setWalkInput(0, 1);
      for (let i = 0; i < 60; i++) {
        engine.updateCamera(0.01);
        samples.push([
          engine.walkingPosition.x,
          groundHeight(engine.painting, engine.walkingPosition.x, engine.walkingPosition.z),
          engine.walkingPosition.z,
        ]);
      }
      engine.setWalkInput(0, 0);
      engine.updateCamera(2);
      engine.renderer.render(engine.scene, engine.camera);
      return { end: engine.walkingPosition.toArray(), samples };
    });
    await page.locator('canvas').screenshot({ path: `artifacts/walk-review/${id}-forward.png` });
    await page.evaluate(() => {
      (window as unknown as Record<string, any>).__walkReview.engine.dispose();
    });
    const distance = Math.hypot(forward.end[0] - report.start[0], forward.end[2] - report.start[2]);
    reports.push({ ...report, ...forward, distance });
  }
  await writeFile(
    'artifacts/walk-review/report.json',
    JSON.stringify({ reports, errors }, null, 2),
  );
  expect(errors).toEqual([]);
  for (const report of reports) {
    expect(report.distance, report.painting).toBeGreaterThan(2.95);
    expect(
      report.samples.every((point) => point.every(Number.isFinite) && point[1]! > 0.15),
      report.painting,
    ).toBe(true);
  }
});
