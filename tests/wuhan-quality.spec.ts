import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

interface WuhanPreview {
  render(progress: number): void;
  dispose(): void;
}

test('Wuhan: quality replacement retains the view and renders authored close-ups', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/wuhan-quality-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><style>html,body{margin:0}#stage{width:100vw;height:100vh}</style><div id="stage"></div>',
    }),
  );
  await page.goto('/wuhan-quality-test');
  try {
    const snapshots = await page.evaluate(async () => {
      const engineModule = '/src/engine/Experience.ts',
        stateModule = '/src/state.ts';
      const { Experience } = await import(engineModule);
      const { initialState } = await import(stateModule);
      const engine = new Experience(
        document.getElementById('stage'),
        {
          ...initialState,
          painting: 'wuhan',
          entered: true,
          playing: false,
          mode: 'scroll',
          progress: 0.32,
          time: 'day',
        },
        {
          onTelemetry() {},
          onError(message: string) {
            throw new Error(message);
          },
        },
      );
      // Isolated dev fixture: no production globals or continuous animation.
      cancelAnimationFrame(engine.frame);
      engine.progress = 0.32;
      engine.updateCamera(10);
      const snapshot = () => ({
        quality: engine.wuhan.userData.quality,
        group: engine.wuhan.uuid,
        progress: engine.progress,
        mode: engine.state.mode,
        camera: engine.camera.position.toArray(),
        quaternion: engine.camera.quaternion.toArray(),
        target: engine.currentTarget.toArray(),
        zoom: engine.camera.zoom,
        shadows: engine.renderer.shadowMap.enabled,
        petals: engine.wuhan.getObjectByName('Sparse windborne osmanthus petals').count,
      });
      Object.assign(window, {
        wuhanPreview: {
          render(progress: number) {
            engine.progress = progress;
            engine.updateCamera(10);
            engine.updateAtmosphere(10);
            engine.renderer.render(engine.scene, engine.camera);
          },
          dispose() {
            engine.dispose();
          },
        },
      });
      const high = snapshot();
      engine.configure({ ...engine.state, quality: 'low' });
      const low = snapshot();
      engine.configure({ ...engine.state, quality: 'high' });
      return [high, low, snapshot()];
    });
    expect(snapshots.map((s) => s.quality)).toEqual(['high', 'low', 'high']);
    expect(snapshots.map((s) => s.petals)).toEqual([168, 48, 168]);
    expect(snapshots.map((s) => s.shadows)).toEqual([true, false, true]);
    expect(new Set(snapshots.map((s) => s.group)).size).toBe(3);
    for (const snapshot of snapshots) {
      expect(snapshot.progress).toBe(0.32);
      expect(snapshot.mode).toBe('scroll');
      expect(snapshot.camera).toEqual(snapshots[0]!.camera);
      expect(snapshot.quaternion).toEqual(snapshots[0]!.quaternion);
      expect(snapshot.target).toEqual(snapshots[0]!.target);
      expect(snapshot.zoom).toBe(snapshots[0]!.zoom);
    }
    await mkdir('artifacts/wuhan-review', { recursive: true });
    for (const progress of [0.21, 0.32, 0.43, 0.66]) {
      await page.evaluate((progress) => {
        (window as unknown as { wuhanPreview: WuhanPreview }).wuhanPreview.render(progress);
      }, progress);
      await page.screenshot({ path: `artifacts/wuhan-review/wuhan-${progress}.png` });
    }
    expect(errors).toEqual([]);
  } finally {
    await page.evaluate(() => {
      (window as unknown as { wuhanPreview?: WuhanPreview }).wuhanPreview?.dispose();
    });
  }
});
