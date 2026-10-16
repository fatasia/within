import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('retained scenes respect memory limits and isolate quality, period and interrupted builds', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 640, height: 400 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/scene-cache-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body style="margin:0"><div id="stage" style="width:640px;height:400px"></div>',
    }),
  );
  await page.goto('/scene-cache-fixture');
  const report = await page.evaluate(async () => {
    const enginePath = '/src/engine/Experience.ts',
      statePath = '/src/state.ts',
      resourcesPath = '/src/engine/resources.ts';
    const { Experience } = await import(enginePath);
    const { initialState } = await import(statePath);
    const { estimateSceneBytes } = await import(resourcesPath);
    const engine = new Experience(
      document.getElementById('stage'),
      {
        ...initialState,
        painting: 'wuhan',
        quality: 'high',
        playing: false,
        entered: false,
      },
      {
        onTelemetry() {},
        onError(message: string) {
          throw new Error(message);
        },
      },
    );
    // No continuous rendering or camera motion. configureAsync still performs its real
    // shader compile and first-frame render; the test does not replace renderer methods.
    cancelAnimationFrame(engine.frame);
    const snapshots = [];
    const snapshot = (label: string) => {
      const item = {
        label,
        painting: engine.painting.id,
        requested: engine.state.painting,
        quality: engine.sceneQuality,
        requestedQuality: engine.state.quality,
        wuhanQuality: engine.wuhan?.userData.quality ?? null,
        content: engine.content.uuid,
        pending: engine.pendingScene,
        building: engine.sceneBuilding,
        ready: engine.sceneReady,
        attached: engine.content.parent === engine.scene,
        period: engine.scenePeriod,
        requestedPeriod: engine.state.period,
        empire: engine.empire?.uuid ?? null,
        episodePeriod:
          engine.empire?.getObjectByName('Empire period foreground episodes')?.userData.period ??
          null,
        boats: engine.boats.map((boat: { visible: boolean }) => boat.visible),
        cache: [...engine.sceneCache.entries()].map(([key, bundle]: [string, any]) => ({
          key,
          content: bundle.content.uuid,
          bytes: bundle.retainedBytes,
          measuredBytes: estimateSceneBytes(bundle.content),
          attached: bundle.content.parent !== null,
        })),
      };
      snapshots.push(item);
      return item;
    };
    const select = async (painting: string, quality = 'high', period = 2) => {
      await engine.configureAsync({
        ...engine.state,
        painting,
        quality,
        period,
        progress: 0,
        playing: false,
      });
      return snapshot(`${painting}:${quality}:${period}`);
    };
    let cacheAfterDispose = -1;
    try {
      snapshot('initial-high');
      await select('winter');
      await select('wuhan');
      // Match the UI's same-scene quality path, then navigate away and back.
      engine.configure({ ...engine.state, quality: 'low' });
      snapshot('same-scene-low');
      await select('winter');
      await select('wuhan', 'high');
      await select('winter');
      await select('wuhan', 'low');
      await select('empire', 'high', 2);
      await select('winter');
      await select('empire', 'high', 4);
      await select('winter');
      await select('empire', 'high', 2);
      // Let a cold request enter its generator before superseding it, rather than
      // only issuing a sequence of already-cached scene requests.
      const abandoned = engine.configureAsync({ ...engine.state, painting: 'guilin' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      const final = engine.configureAsync({
        ...engine.state,
        painting: 'wuhan',
        quality: 'low',
        period: 0,
      });
      await Promise.all([abandoned, final]);
      snapshot('interrupted-final');
    } finally {
      engine.dispose();
      cacheAfterDispose = engine.sceneCache.size;
    }
    return { snapshots, cacheAfterDispose };
  });
  await mkdir('artifacts/scene-switch', { recursive: true });
  await writeFile('artifacts/scene-switch/cache-regression.json', JSON.stringify(report, null, 2));
  for (const snapshot of report.snapshots) {
    expect(snapshot.requested, snapshot.label).toBe(snapshot.painting);
    expect(snapshot.requestedQuality, snapshot.label).toBe(snapshot.quality);
    expect(snapshot.pending, snapshot.label).toBeNull();
    expect(snapshot.building, snapshot.label).toBe(false);
    expect(snapshot.ready, snapshot.label).toBe(true);
    expect(snapshot.attached, snapshot.label).toBe(true);
    expect(snapshot.cache.length, snapshot.label).toBeLessThanOrEqual(2);
    expect(
      snapshot.cache.reduce((sum: number, entry: { bytes: number }) => sum + entry.bytes, 0),
      snapshot.label,
    ).toBeLessThanOrEqual(96 * 1024 * 1024);
    for (const entry of snapshot.cache) {
      expect(entry.bytes).toBeGreaterThan(0);
      expect(entry.bytes).toBe(entry.measuredBytes);
      expect(entry.attached).toBe(false);
      expect(entry.key).not.toBe(`${snapshot.painting}:${snapshot.quality}`);
      expect(entry.content).not.toBe(snapshot.content);
    }
    if (snapshot.painting === 'wuhan') expect(snapshot.wuhanQuality).toBe(snapshot.quality);
    if (snapshot.painting === 'empire') {
      expect(snapshot.period).toBe(snapshot.requestedPeriod);
      expect(snapshot.episodePeriod).toBe(snapshot.requestedPeriod);
      expect(snapshot.boats.length).toBeGreaterThan(0);
      expect(
        snapshot.boats.every((visible: boolean) => visible === (snapshot.requestedPeriod === 2)),
      ).toBe(true);
    }
  }
  const high = report.snapshots.filter(
    (s: { painting: string; quality: string }) => s.painting === 'wuhan' && s.quality === 'high',
  );
  expect(high[1]!.content).toBe(high[0]!.content);
  expect(high[2]!.content).not.toBe(high[0]!.content);
  const low = report.snapshots.filter(
    (s: { painting: string; quality: string }) => s.painting === 'wuhan' && s.quality === 'low',
  );
  expect(low[1]!.content).toBe(low[0]!.content);
  const empire = report.snapshots.filter((s: { painting: string }) => s.painting === 'empire');
  expect(empire).toHaveLength(3);
  expect(empire[1]!.content).toBe(empire[0]!.content);
  expect(empire[1]!.empire).not.toBe(empire[0]!.empire);
  expect(empire[2]!.content).toBe(empire[0]!.content);
  expect(report.snapshots.at(-1)!.painting).toBe('wuhan');
  expect(report.snapshots.at(-1)!.quality).toBe('low');
  expect(report.cacheAfterDispose).toBe(0);
  expect(errors).toEqual([]);
});
