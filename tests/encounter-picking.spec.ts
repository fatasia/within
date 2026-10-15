import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    encounterHarness: {
      snapshot(): { encounters: number; playing: boolean };
      mode(mode: string): void;
      dispose(): void;
    };
  }
}

test('visitor picking requires a short primary tap and releases pointer lock without reacquiring it', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 800, height: 600 });
  await page.route('**/encounter-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><style>html,body{margin:0}#stage{width:100vw;height:100vh}canvas{width:100%;height:100%}</style><div id="stage"></div>',
    }),
  );
  await page.goto('/encounter-test');
  await page.evaluate(async () => {
    const engineModule = '/src/engine/Experience.ts',
      stateModule = '/src/state.ts';
    const threeModule = '/node_modules/three/build/three.module.js';
    const { Experience } = await import(engineModule);
    const { initialState } = await import(stateModule);
    const THREE = await import(threeModule);
    let encounters = 0;
    const engine = new Experience(
      document.getElementById('stage'),
      { ...initialState, quality: 'low' },
      {
        onTelemetry() {},
        onError(message: string) {
          throw new Error(message);
        },
        onEncounter() {
          encounters++;
        },
      },
    );
    cancelAnimationFrame(engine.frame);
    const existingVisitor = engine.content.getObjectByName('Quiet visitor');
    if (existingVisitor) {
      const resourceModule = '/src/engine/resources.ts';
      const { disposeObject } = await import(resourceModule);
      disposeObject(existingVisitor);
      existingVisitor.removeFromParent();
    }
    const visitor = new THREE.Group();
    visitor.name = 'Quiet visitor';
    visitor.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()));
    engine.content.add(visitor);
    const mode = (value: string) => {
      engine.configure({ ...engine.state, entered: true, playing: true, mode: value });
      engine.camera.position.set(0, 0, 10);
      engine.camera.lookAt(0, 0, 0);
      engine.camera.updateMatrixWorld();
    };
    mode('scroll');
    window.encounterHarness = {
      snapshot: () => ({ encounters, playing: engine.state.playing }),
      mode,
      dispose: () => {
        engine.dispose();
        visitor.children.forEach(
          (mesh: { geometry: { dispose(): void }; material: { dispose(): void } }) => {
            mesh.geometry.dispose();
            mesh.material.dispose();
          },
        );
      },
    };
  });
  try {
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 40, y: 40 } });
    expect((await page.evaluate(() => window.encounterHarness.snapshot())).encounters).toBe(0);
    await canvas.click({ position: { x: 400, y: 300 }, button: 'right' });
    expect((await page.evaluate(() => window.encounterHarness.snapshot())).encounters).toBe(0);
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(430, 300, { steps: 3 });
    await page.mouse.up();
    expect((await page.evaluate(() => window.encounterHarness.snapshot())).encounters).toBe(0);
    await canvas.click({ position: { x: 400, y: 300 } });
    expect(await page.evaluate(() => window.encounterHarness.snapshot())).toEqual({
      encounters: 1,
      playing: false,
    });

    await page.evaluate(() => window.encounterHarness.mode('walk'));
    await canvas.click({ position: { x: 40, y: 40 } });
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
      .toBe('CANVAS');
    // While locked, the screen centre is the picking ray regardless of cursor coordinates.
    await page.mouse.click(40, 40);
    await expect
      .poll(async () => (await page.evaluate(() => window.encounterHarness.snapshot())).encounters)
      .toBe(2);
    await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBeNull();

    await page.evaluate(() => window.encounterHarness.mode('scroll'));
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 400, y: 300, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
      .poll(async () => (await page.evaluate(() => window.encounterHarness.snapshot())).encounters)
      .toBe(3);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: 390, y: 300, id: 1 },
        { x: 410, y: 300, id: 2 },
      ],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
    expect((await page.evaluate(() => window.encounterHarness.snapshot())).encounters).toBe(3);
    await session.detach();
    expect(errors).toEqual([]);
  } finally {
    await page.evaluate(() => window.encounterHarness.dispose());
  }
});
