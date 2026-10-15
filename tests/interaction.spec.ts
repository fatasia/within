import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    navigationHarness: {
      snapshot(): {
        progress: number;
        zoom: number;
        yaw: number;
        pointers: number;
        keys: number;
        stick: { x: number; y: number };
        walk: number[];
        eye: number[];
      };
      mode(value: string): void;
      moveWalk(): void;
      input(x: number, y: number): void;
      dispose(): void;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.route('**/navigation-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><style>html,body{margin:0}#stage{width:100vw;height:100vh}canvas{width:100%;height:100%}</style><div id="stage"></div>',
    }),
  );
  await page.goto('/navigation-test');
  await page.evaluate(async () => {
    const engineModule = '/src/engine/Experience.ts',
      stateModule = '/src/state.ts';
    const { Experience } = await import(engineModule);
    const { initialState } = await import(stateModule);
    const engine = new Experience(
      document.getElementById('stage'),
      { ...initialState, quality: 'low' },
      {
        onTelemetry() {},
        onError(message: string) {
          throw new Error(message);
        },
      },
    );
    cancelAnimationFrame(engine.frame);
    engine.configure({ ...engine.state, entered: true, progress: 0.4 });
    engine.updateCamera(10);
    window.navigationHarness = {
      snapshot: () => ({
        progress: engine.progress,
        zoom: engine.camera.zoom,
        yaw: engine.yaw,
        pointers: engine.pointers.size,
        keys: engine.keys.size,
        stick: engine.stick,
        walk: engine.walkingPosition.toArray(),
        eye: engine.camera.position.toArray(),
      }),
      mode: (mode) => engine.configure({ ...engine.state, mode, progress: engine.progress }),
      moveWalk: () => {
        engine.walkingPosition.x += 0.2;
        engine.walkingPosition.z += 0.1;
        engine.updateCamera(10);
      },
      input: (x, y) => engine.setWalkInput(x, y),
      dispose: () => engine.dispose(),
    };
  });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.navigationHarness?.dispose());
});

test('wheel units, keyboard zoom and camera handoff preserve navigation state', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const canvas = page.locator('canvas');
  await canvas.dispatchEvent('wheel', { deltaX: 100, deltaY: 0, deltaMode: 0 });
  expect((await page.evaluate(() => window.navigationHarness.snapshot())).progress).toBeCloseTo(
    0.435,
  );
  await canvas.dispatchEvent('wheel', { deltaY: -3, deltaMode: 1, ctrlKey: true });
  const zoom = (await page.evaluate(() => window.navigationHarness.snapshot())).zoom;
  expect(zoom).toBeGreaterThan(1);
  await page.keyboard.press('Equal');
  expect((await page.evaluate(() => window.navigationHarness.snapshot())).zoom).toBeCloseTo(
    zoom * 1.12,
  );
  await page.keyboard.press('Minus');
  expect((await page.evaluate(() => window.navigationHarness.snapshot())).zoom).toBeCloseTo(zoom);
  const before = await page.evaluate(() => window.navigationHarness.snapshot());
  await page.evaluate(() => window.navigationHarness.mode('orbit'));
  const orbit = await page.evaluate(() => window.navigationHarness.snapshot());
  for (let i = 0; i < 3; i++) expect(orbit.eye[i]).toBeCloseTo(before.eye[i]!, 5);
  await page.evaluate(() => {
    window.navigationHarness.mode('walk');
    window.navigationHarness.moveWalk();
  });
  const walked = await page.evaluate(() => window.navigationHarness.snapshot());
  await page.evaluate(() => {
    window.navigationHarness.mode('orbit');
    window.navigationHarness.mode('walk');
  });
  expect((await page.evaluate(() => window.navigationHarness.snapshot())).walk).toEqual(
    walked.walk,
  );
  await page.evaluate(() => window.navigationHarness.input(0.15, 0.2));
  await page.keyboard.down('w');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const cleared = await page.evaluate(() => window.navigationHarness.snapshot());
  expect(cleared.keys).toBe(0);
  expect(cleared.stick).toEqual({ x: 0, y: 0 });
  expect(errors).toEqual([]);
});

test('two-finger zoom retains the surviving pointer and walk look ignores a second finger', async ({
  page,
  context,
}) => {
  const session = await context.newCDPSession(page);
  const touch = (type: string, points: { id: number; x: number; y: number }[]) =>
    session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((point) => ({ ...point, radiusX: 1, radiusY: 1, force: 1 })),
    });
  await touch('touchStart', [
    { id: 1, x: 200, y: 300 },
    { id: 2, x: 400, y: 300 },
  ]);
  await touch('touchMove', [
    { id: 1, x: 150, y: 300 },
    { id: 2, x: 450, y: 300 },
  ]);
  await expect
    .poll(async () => (await page.evaluate(() => window.navigationHarness.snapshot())).zoom)
    .toBeCloseTo(1.5, 2);
  let snapshot = await page.evaluate(() => window.navigationHarness.snapshot());
  expect(snapshot.zoom).toBeCloseTo(1.5, 2);
  expect(snapshot.progress).toBeCloseTo(0.4);
  await touch('touchEnd', [{ id: 1, x: 150, y: 300 }]);
  await touch('touchMove', [{ id: 2, x: 430, y: 300 }]);
  snapshot = await page.evaluate(() => window.navigationHarness.snapshot());
  expect(snapshot.pointers).toBe(1);
  await expect
    .poll(async () => (await page.evaluate(() => window.navigationHarness.snapshot())).progress)
    .toBeCloseTo(0.42);
  await touch('touchEnd', []);
  await expect
    .poll(async () => (await page.evaluate(() => window.navigationHarness.snapshot())).pointers)
    .toBe(0);
  await page.evaluate(() => window.navigationHarness.mode('walk'));
  const yaw = (await page.evaluate(() => window.navigationHarness.snapshot())).yaw;
  await touch('touchStart', [
    { id: 1, x: 550, y: 300 },
    { id: 2, x: 700, y: 300 },
  ]);
  await touch('touchMove', [
    { id: 1, x: 550, y: 300 },
    { id: 2, x: 750, y: 300 },
  ]);
  expect((await page.evaluate(() => window.navigationHarness.snapshot())).yaw).toBe(yaw);
  await touch('touchEnd', [{ id: 2, x: 750, y: 300 }]);
  await touch('touchMove', [{ id: 1, x: 570, y: 300 }]);
  await expect
    .poll(async () => (await page.evaluate(() => window.navigationHarness.snapshot())).yaw)
    .toBeCloseTo(yaw - 0.08);
  await touch('touchEnd', []);
  await session.detach();
});

test('mouse click locks first-person look and Escape releases it', async ({ page }) => {
  await page.evaluate(() => window.navigationHarness.mode('walk'));
  await page.locator('canvas').click({ position: { x: 500, y: 200 } });
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe('CANVAS');
  const yaw = (await page.evaluate(() => window.navigationHarness.snapshot())).yaw;
  await page.evaluate(() =>
    document.dispatchEvent(new MouseEvent('mousemove', { movementX: 20, movementY: 0 })),
  );
  expect((await page.evaluate(() => window.navigationHarness.snapshot())).yaw).toBeCloseTo(
    yaw - 0.08,
  );
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBeNull();
});
