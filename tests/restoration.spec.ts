import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const [id, shots] of [
  ['xishan', [0.22, 0.43]],
  ['qingming', [0.32]],
] as const) {
  test(`${id}: authored detail shots render without unrelated river props`, async ({ page }) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/restoration-test', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><style>html,body{margin:0}#stage{width:100vw;height:100vh}</style><div id="stage"></div>',
      }),
    );
    await page.goto('/restoration-test');
    const scene = await page.evaluate(async (id) => {
      const engineModule = '/src/engine/Experience.ts',
        stateModule = '/src/state.ts';
      const { Experience } = await import(engineModule);
      const { initialState } = await import(stateModule);
      const engine = new Experience(
        document.getElementById('stage'),
        {
          ...initialState,
          painting: id,
          entered: true,
          playing: false,
          quality: 'balanced',
          time: 'day',
        },
        {
          onTelemetry() {},
          onError(message: string) {
            throw new Error(message);
          },
        },
      );
      cancelAnimationFrame(engine.frame);
      Object.assign(window, { restorationPreview: engine });
      return {
        boats: engine.boats.length,
        passage: engine.content.children.some(
          (child: { userData: Record<string, unknown> }) => child.userData.bridgePassage,
        ),
      };
    }, id);
    if (id === 'xishan') expect(scene.boats).toBe(0);
    if (id === 'qingming') expect(scene.passage).toBe(true);
    await mkdir('artifacts/restoration-review', { recursive: true });
    for (const progress of shots) {
      await page.evaluate((progress) => {
        // Test-only fixture exposes the real engine, never the production window.
        const engine = (
          window as unknown as {
            restorationPreview: {
              progress: number;
              updateCamera(dt: number): void;
              updateAtmosphere(dt: number): void;
              renderer: { render(scene: unknown, camera: unknown): void };
              scene: unknown;
              camera: unknown;
            };
          }
        ).restorationPreview;
        engine.progress = progress;
        engine.updateCamera(10);
        engine.updateAtmosphere(10);
        engine.renderer.render(engine.scene, engine.camera);
      }, progress);
      await page.screenshot({ path: `artifacts/restoration-review/${id}-${progress}.png` });
    }
    await page.evaluate(() =>
      (
        window as unknown as { restorationPreview: { dispose(): void } }
      ).restorationPreview.dispose(),
    );
    expect(errors).toEqual([]);
  });
}
