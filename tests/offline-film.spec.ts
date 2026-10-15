import { test, expect } from '@playwright/test';

test('offline frames are distinct, finite and retain their requested resolution', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // A blank local fixture avoids mounting the gallery's second WebGL renderer.
  await page.route('**/offline-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body style="margin:0"><div id="stage" style="width:640px;height:360px"></div></body></html>',
    }),
  );
  await page.goto('/offline-test');
  const result = await page.evaluate(async () => {
    const engineModule = '/src/engine/Experience.ts';
    const stateModule = '/src/state.ts';
    const { Experience } = await import(engineModule);
    const { initialState } = await import(stateModule);
    const host = document.getElementById('stage')!;
    const engine = new Experience(
      host,
      { ...initialState, quality: 'low' },
      {
        onTelemetry() {},
        onError(message: string) {
          throw new Error(message);
        },
      },
    );
    try {
      engine.beginOfflineFilm(320, 180);
      const frames = [0, 0.5, 1].map((progress) =>
        engine.renderOfflineFrame(progress, progress * 2),
      );
      const images = await Promise.all(
        frames.map(async (url: string) => {
          const image = await createImageBitmap(await (await fetch(url)).blob());
          const size = { width: image.width, height: image.height };
          image.close();
          return size;
        }),
      );
      const finiteCamera = [
        ...engine.camera.position.toArray(),
        ...engine.camera.matrixWorld.elements,
      ].every(Number.isFinite);
      const originalRenderSize = [
        engine.renderer.domElement.width,
        engine.renderer.domElement.height,
      ];
      host.style.width = '720px';
      host.style.height = '480px';
      // ResizeObserver must not override an active offline render target.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const resizedRenderSize = [
        engine.renderer.domElement.width,
        engine.renderer.domElement.height,
      ];
      engine.endOfflineFilm();
      const restoredSize = [engine.renderer.domElement.width, engine.renderer.domElement.height];
      return {
        images,
        finiteCamera,
        originalRenderSize,
        resizedRenderSize,
        restoredSize,
        unique: new Set(frames).size,
        valid: frames.every(
          (frame: string) => frame.startsWith('data:image/jpeg;base64,') && frame.length > 1024,
        ),
        resumed: engine.filmActive === false && engine.offline === null,
      };
    } finally {
      engine.dispose();
    }
  });
  expect(result.valid).toBe(true);
  expect(result.unique).toBe(3);
  expect(result.images).toEqual(Array.from({ length: 3 }, () => ({ width: 320, height: 180 })));
  expect(result.finiteCamera).toBe(true);
  expect(result.originalRenderSize).toEqual([320, 180]);
  expect(result.resizedRenderSize).toEqual([320, 180]);
  // Low quality restores its 0.8 pixel-ratio budget rather than the offline ratio.
  expect(result.restoredSize).toEqual([576, 384]);
  expect(result.resumed).toBe(true);
  expect(errors).toEqual([]);
});
