import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

for (const device of [
  { name: 'desktop', width: 1440, height: 900, throttle: 1 },
  { name: 'mobile-simulated-4x', width: 390, height: 844, throttle: 4 },
]) {
  test(`${device.name}: selection feedback, latest-request wins and staged build measurements`, async ({
    browser,
  }) => {
    test.setTimeout(180000);
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 1,
      hasTouch: device.throttle > 1,
    });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: device.throttle });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript(() => {
      const metrics = {
        stages: [] as unknown[],
        compiles: [] as unknown[],
        frames: [] as number[],
        longtasks: [] as number[],
        feedback: [] as unknown[],
        lastFrame: 0,
        engine: null as any,
      };
      (window as any).__switchMetrics = metrics;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) metrics.longtasks.push(entry.duration);
      }).observe({ type: 'longtask', buffered: false });
      const raf = (time: number) => {
        if (metrics.lastFrame) metrics.frames.push(time - metrics.lastFrame);
        metrics.lastFrame = time;
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      document.addEventListener(
        'click',
        (event) => {
          const button = (event.target as Element).closest<HTMLButtonElement>(
            'button[aria-label^="选择"]',
          );
          if (!button) return;
          const start = performance.now(),
            name = button.getAttribute('aria-label');
          requestAnimationFrame(() =>
            metrics.feedback.push({
              name,
              milliseconds: performance.now() - start,
              selectedAtNextFrame: button.getAttribute('aria-pressed') === 'true',
            }),
          );
        },
        true,
      );
    });
    try {
      await page.goto('/');
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled({
        timeout: 30000,
      });
      await page.locator('[data-testid="world"] canvas').waitFor();
      // Separate cold scene construction from the initial page's first shader render.
      await page.waitForTimeout(700);
      await page.evaluate(async () => {
        const path = '/src/engine/Experience.ts';
        const { Experience } = await import(path);
        const original = Experience.prototype.loadPaintingSteps;
        Experience.prototype.loadPaintingSteps = function () {
          const iterator = original.call(this),
            engine = this;
          let index = 0;
          return {
            next() {
              const start = performance.now();
              const result = iterator.next();
              (window as any).__switchMetrics.stages.push({
                painting: engine.state.painting,
                stage: index++,
                milliseconds: performance.now() - start,
                done: result.done,
              });
              return result;
            },
            return() {
              return iterator.return();
            },
            [Symbol.iterator]() {
              return this;
            },
          };
        };
        const configure = Experience.prototype.configureAsync;
        Experience.prototype.configureAsync = function (state: any) {
          (window as any).__switchMetrics.engine = this;
          if (!this.renderer.__measuredCompile) {
            const compile = this.renderer.compileAsync.bind(this.renderer);
            this.renderer.compileAsync = async (...args: any[]) => {
              const start = performance.now();
              const result = await compile(...args);
              (window as any).__switchMetrics.compiles.push({
                milliseconds: performance.now() - start,
              });
              return result;
            };
            this.renderer.__measuredCompile = true;
          }
          return configure.call(this, state);
        };
      });
      const runs = [];
      const select = async (title: string, label: string, rapid = false) => {
        await page.evaluate(() => {
          const m = (window as any).__switchMetrics;
          for (const key of ['stages', 'compiles', 'frames', 'longtasks', 'feedback']) m[key] = [];
          m.lastFrame = 0;
        });
        const start = Date.now();
        if (rapid) {
          await page.evaluate(async () => {
            for (const title of [
              '星月夜',
              '漓江 · 黄布倒影',
              '山中冬夜',
              '千里江山图',
              '武汉 · 桂雨东湖',
            ]) {
              document
                .querySelector<HTMLButtonElement>(`button[aria-label="选择${title}"]`)!
                .click();
              await new Promise((resolve) => setTimeout(resolve, 25));
            }
          });
        } else await page.getByRole('button', { name: `选择${title}`, exact: true }).click();
        await expect(
          page.getByRole('button', { name: `选择${title}`, exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-testid="world"]')).toHaveAttribute('aria-busy', 'false', {
          timeout: 60000,
        });
        await page.waitForTimeout(80);
        const measurement = await page.evaluate(() => {
          const m = (window as any).__switchMetrics,
            e = m.engine;
          return {
            stages: m.stages,
            compiles: m.compiles,
            feedback: m.feedback,
            longestRaf: Math.max(0, ...m.frames),
            longestTask: Math.max(0, ...m.longtasks),
            longtasks: m.longtasks,
            actualPainting: e.painting.id,
            statePainting: e.state.painting,
            pending: e.pendingScene,
            building: e.sceneBuilding,
            resources: { ...e.renderer.info.memory },
            children: e.content.children.length,
            cachedScenes: [...e.sceneCache.entries()].map(([key, bundle]: [string, any]) => ({
              key,
              bytes: bundle.retainedBytes,
              attached: bundle.content.parent !== null,
            })),
            sceneQuality: e.sceneQuality,
            stateQuality: e.state.quality,
          };
        });
        runs.push({ label, wallMs: Date.now() - start, ...measurement });
        expect(measurement.actualPainting).toBe(
          title === '清明上河图' ? 'qingming' : title === '山中冬夜' ? 'winter' : 'wuhan',
        );
        expect(measurement.statePainting).toBe(measurement.actualPainting);
        expect(measurement.pending).toBeNull();
        expect(measurement.building).toBe(false);
        expect(measurement.sceneQuality).toBe(measurement.stateQuality);
        expect(measurement.cachedScenes.length).toBeLessThanOrEqual(2);
        expect(
          measurement.cachedScenes.reduce(
            (bytes: number, scene: { bytes: number }) => bytes + scene.bytes,
            0,
          ),
        ).toBeLessThanOrEqual(96 * 1024 * 1024);
        for (const scene of measurement.cachedScenes) {
          expect(scene.bytes).toBeGreaterThan(0);
          expect(scene.attached).toBe(false);
          expect(scene.key).not.toBe(`${measurement.actualPainting}:${measurement.sceneQuality}`);
        }
      };
      await select('武汉 · 桂雨东湖', 'wuhan-cold');
      await select('山中冬夜', 'winter-cold');
      await select('武汉 · 桂雨东湖', 'wuhan-repeat');
      expect(runs[2]!.stages).toHaveLength(1);
      await select('武汉 · 桂雨东湖', 'rapid-latest-wins', true);
      await mkdir('artifacts/scene-switch', { recursive: true });
      await writeFile(
        `artifacts/scene-switch/${device.name}.json`,
        JSON.stringify(
          {
            device,
            simulation:
              'Desktop Chromium; mobile viewport plus CDP CPU throttling, not a physical phone.',
            runs,
            errors,
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          device: device.name,
          runs: runs.map((run) => ({
            ...run,
            stages: undefined,
            slowestStage: [...run.stages].sort(
              (a: any, b: any) => b.milliseconds - a.milliseconds,
            )[0],
          })),
        }),
      );
      await page.screenshot({ path: `artifacts/scene-switch/${device.name}.png` });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
