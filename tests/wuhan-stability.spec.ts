import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('Wuhan reflection tracks a moving view without held-frame judder', async ({ page }) => {
  test.setTimeout(120000);
  await mkdir('artifacts/wuhan-stability', { recursive: true });
  await page.setViewportSize({ width: 640, height: 400 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/wuhan-stability-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body style="margin:0"><div id="stage" style="width:100vw;height:100vh"></div>',
    }),
  );
  await page.goto('/wuhan-stability-fixture');
  const result = await page.evaluate(async () => {
    const module = '/src/engine/Experience.ts',
      stateModule = '/src/state.ts';
    const { Experience } = await import(module),
      { initialState } = await import(stateModule);
    const start = performance.now();
    const engine = new Experience(
      document.getElementById('stage'),
      {
        ...initialState,
        painting: 'wuhan',
        entered: true,
        playing: false,
        mist: false,
        quality: 'high',
        time: 'day',
      },
      {
        onTelemetry() {},
        onError(message: string) {
          throw new Error(message);
        },
      },
    );
    const buildMs = performance.now() - start;
    cancelAnimationFrame(engine.frame);
    engine.updateAtmosphere(10);
    engine.vegetation.update(0);
    const gl = engine.renderer.getContext(),
      width = 640,
      height = 400;
    const read = () => {
      const data = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    };
    const view = (i: number) => {
      engine.camera.position.set(-12 + i * 0.083333, 5, -4);
      engine.camera.lookAt(i * 0.083333, 3, -140);
      engine.camera.updateMatrixWorld();
    };
    const render = (i: number, time: number) => {
      view(i);
      engine.river.update(time, 0);
      // Freeze wave phase and all wind/rain/lighting so only camera/reflection cadence remains.
      engine.river.mesh.material.uniforms.uTime.value = 4;
      engine.renderer.render(engine.scene, engine.camera);
      return read();
    };
    const fixedA = render(0, 0),
      fixedB = render(0, 0);
    const fixedChanged = fixedA.reduce((total, value, i) => total + Number(value !== fixedB[i]), 0);
    const frames: Uint8Array[] = [],
      matrices: string[] = [];
    for (let i = 0; i < 30; i++) {
      frames.push(render(i, i / 60));
      matrices.push(engine.river.mesh.material.uniforms.textureMatrix.value.elements.join(','));
    }
    const errorsAgainstFresh: number[] = [];
    for (let i = 0; i < 30; i++) {
      const fresh = render(i, 10 + i / 10),
        old = frames[i]!;
      let sum = 0,
        count = 0;
      // Bottom 55% is the lake reflection; exclude alpha and keep metric in 8-bit units.
      for (let p = 0; p < width * Math.floor(height * 0.55); p++)
        for (let channel = 0; channel < 3; channel++) {
          sum += Math.abs(fresh[p * 4 + channel]! - old[p * 4 + channel]!);
          count++;
        }
      errorsAgainstFresh.push(sum / count);
    }
    const heldViews = matrices.slice(1).filter((matrix, i) => matrix === matrices[i]).length;
    view(0);
    engine.river.update(100, 0);
    engine.renderer.render(engine.scene, engine.camera);
    Object.assign(window, { stabilityEngine: engine });
    return {
      buildMs,
      fixedChanged,
      heldViews,
      errorsAgainstFresh,
      maxError: Math.max(...errorsAgainstFresh),
      meanError: errorsAgainstFresh.reduce((a, b) => a + b) / errorsAgainstFresh.length,
    };
  });
  await page.locator('canvas').screenshot({ path: 'artifacts/wuhan-stability/lake.png' });
  const tour = await page.evaluate(() => {
    const engine = (window as unknown as Record<string, any>).stabilityEngine;
    engine.state.mode = 'scroll';
    engine.state.entered = true;
    engine.progress = 0.1;
    engine.updateCamera(10);
    const views: string[] = [],
      steps: number[] = [],
      frameTimes: number[] = [];
    let previous = engine.camera.position.clone();
    for (let frame = 0; frame < 30; frame++) {
      const start = performance.now();
      engine.elapsed = 110 + frame / 60;
      engine.progress = 0.1 + frame / 60 / 150;
      engine.vegetation.update(engine.elapsed);
      engine.updateCamera(1 / 60);
      engine.updateAtmosphere(1 / 60);
      engine.renderer.render(engine.scene, engine.camera);
      steps.push(engine.camera.position.distanceTo(previous));
      previous.copy(engine.camera.position);
      views.push(engine.river.mesh.material.uniforms.textureMatrix.value.elements.join(','));
      frameTimes.push(performance.now() - start);
    }
    return {
      heldViews: views.slice(1).filter((view, i) => view === views[i]).length,
      largestCameraStep: Math.max(...steps),
      finite: steps.every(Number.isFinite),
      frameTimes,
    };
  });
  await page.locator('canvas').screenshot({ path: 'artifacts/wuhan-stability/automatic-tour.png' });
  await page.evaluate(() => {
    (window as unknown as Record<string, any>).stabilityEngine.dispose();
  });
  await writeFile(
    'artifacts/wuhan-stability/metrics.json',
    JSON.stringify({ ...result, tour, errors }, null, 2),
  );
  console.log(JSON.stringify(result));
  expect(errors).toEqual([]);
  expect(result.fixedChanged).toBe(0);
  expect(result.heldViews).toBe(0);
  expect(result.maxError).toBeLessThan(0.02);
  expect(tour.heldViews).toBe(0);
  expect(tour.finite).toBe(true);
  expect(tour.largestCameraStep).toBeLessThan(0.5);
});
