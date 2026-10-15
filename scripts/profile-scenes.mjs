import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Engine-only diagnostic. Requires the Vite dev server; it does not record video or change quality.
const help = `Usage: node scripts/profile-scenes.mjs
Start the dev server first. Output: artifacts/performance/report.json (gitignored).
PERF_BASE_URL=http://127.0.0.1:5173  PERF_SCENES=qianli,qingming,wuhan
PERF_QUALITIES=high,low             PERF_FRAMES=48  PERF_WARMUP=10
PERF_ROUNDS=4                      PERF_PROGRESS=0.35
PERF_WIDTH=1280 PERF_HEIGHT=720 PERF_DPR=1.5
PERF_TIMEOUT_MS=60000              PERF_HEADLESS=1
--self-test checks statistics without launching a browser; --help shows this text.
CPU timings are JS/driver wall time, not GPU timer queries or an actual-device FPS guarantee.`;
if (process.argv.includes('--help')) {
  console.log(help);
  process.exit(0);
}

function quantile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * fraction;
  return sorted[Math.floor(at)] + (sorted[Math.ceil(at)] - sorted[Math.floor(at)]) * (at % 1);
}
function summary(values) {
  return {
    samples: values.length,
    p50: quantile(values, 0.5),
    p95: quantile(values, 0.95),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}
function resourceTrend(values) {
  const deltas = values.slice(1).map((value, i) => value - values[i]);
  return {
    values,
    deltas,
    netGrowth: values.length ? values.at(-1) - values[0] : 0,
    sustainedGrowth: deltas.length >= 3 && deltas.slice(-3).every((delta) => delta > 0),
    changed: deltas.some((delta) => delta !== 0),
  };
}
if (process.argv.includes('--self-test')) {
  assert.equal(quantile([4, 1, 3, 2], 0.5), 2.5);
  assert.equal(quantile([], 0.95), null);
  assert.equal(summary([10, 10]).p95, 10);
  assert.equal(resourceTrend([10, 11, 12, 13]).sustainedGrowth, true);
  assert.equal(resourceTrend([10, 11, 11, 11]).sustainedGrowth, false);
  assert.equal(resourceTrend([10, 9, 10, 9]).netGrowth, -1);
  console.log('Profiler statistics: 6 checks passed; no browser launched.');
  process.exit(0);
}

function number(name, fallback, min, max, integer = false) {
  const value = Number(process.env[name] ?? fallback);
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(`${name} must be ${integer ? 'an integer' : 'a number'} in ${min}..${max}`);
  return value;
}
function selection(name, fallback, allowed) {
  const values = [
    ...new Set(
      (process.env[name] ?? fallback)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
  if (!values.length || values.some((value) => !allowed.includes(value)))
    throw new Error(`Invalid ${name}`);
  return values;
}
const config = {
  baseUrl: process.env.PERF_BASE_URL ?? 'http://127.0.0.1:5173',
  scenes: selection('PERF_SCENES', 'qianli,qingming,wuhan', [
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
  ]),
  qualities: selection('PERF_QUALITIES', 'high,low', ['high', 'balanced', 'low']),
  frames: number('PERF_FRAMES', 48, 8, 600, true),
  warmup: number('PERF_WARMUP', 10, 2, 120, true),
  rounds: number('PERF_ROUNDS', 4, 4, 10, true),
  progress: number('PERF_PROGRESS', 0.35, 0, 1),
  width: number('PERF_WIDTH', 1280, 320, 2560, true),
  height: number('PERF_HEIGHT', 720, 240, 1600, true),
  dpr: number('PERF_DPR', 1.5, 0.5, 3),
  timeoutMs: number('PERF_TIMEOUT_MS', 60000, 5000, 300000, true),
};
const output = fileURLToPath(new URL('../artifacts/performance/report.json', import.meta.url));
const errors = [];
const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  status: 'running',
  config,
  methodology: {
    workload:
      'Experience engine, fixed cinematic viewpoint, animated atmosphere/weather; no React UI, video, screenshot or sound',
    cpuFrameMs:
      'performance.now around the complete Experience tick: JavaScript plus synchronous driver submission/waits; not pure CPU cycles or GPU duration',
    rafIntervalMs:
      'Unclamped interval between actual requestAnimationFrame timestamps; scheduler/compositor included',
    renderCounters:
      'renderer.info.autoReset=false; reset once before the outer tick, so main, reflection and shadow passes are accumulated',
    resources:
      'renderer.info.memory counts resident geometries/textures, not bytes, JS heap retention or complete driver allocations',
    resourceComparison:
      'Four or more repeat visits to each identical scene/quality/view after one priming pass. Three consecutive positive deltas flag sustained growth, not proof of a leak.',
    timingLimits:
      'Short diagnostic samples. Software WebGL and headed/headless browser results are not actual-phone FPS. No 60fps assertion or automatic quality changes.',
    instrumentation:
      'This dev-only script wraps the runtime tick/render/update methods without editing production code. Hooks fail explicitly if the engine API changes.',
  },
  samples: [],
  switches: [],
  resourceTrends: [],
  errors,
};
try {
  report.commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  report.commit = null;
}
report.sourceHashes = Object.fromEntries(
  await Promise.all(
    ['Experience.ts', 'resources.ts', 'river.ts', 'wuhan.ts', 'terrain.ts', 'props.ts'].map(
      async (file) => {
        const source = await readFile(new URL(`../src/engine/${file}`, import.meta.url));
        return [file, createHash('sha256').update(source).digest('hex')];
      },
    ),
  ),
);
const browser = await chromium.launch({
  headless: process.env.PERF_HEADLESS !== '0',
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: config.dpr,
  });
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', message: message.text() });
  });
  await page.route('**/__performance__', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><meta charset="utf-8"><style>html,body,#scene{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="scene"></div>',
    }),
  );
  const base = `${config.baseUrl.replace(/\/$/, '')}/`;
  await page.goto(new URL('__performance__', base).href);
  report.environment = await page.evaluate(
    async ({ config, base }) => {
      const { Experience } = await import(new URL('src/engine/Experience.ts', base).href);
      const { initialState } = await import(new URL('src/state.ts', base).href);
      const engineErrors = [];
      const state = {
        ...initialState,
        painting: config.scenes[0],
        entered: true,
        mode: 'scroll',
        playing: false,
        time: 'day',
        quality: config.qualities[0],
        sound: false,
      };
      const experience = new Experience(document.getElementById('scene'), state, {
        onTelemetry() {},
        onError(message) {
          engineErrors.push(message);
        },
      });
      const renderer = experience.renderer;
      if (typeof experience.tick !== 'function' || typeof experience.updateCamera !== 'function')
        throw new Error('Profiler runtime hooks no longer match Experience');
      cancelAnimationFrame(experience.frame);
      const rawTick = experience.tick;
      const rawRender = renderer.render.bind(renderer);
      const rawCamera = experience.updateCamera.bind(experience);
      const rawAtmosphere = experience.updateAtmosphere.bind(experience);
      let renderDepth = 0,
        stages = {},
        lastRaf = null,
        collector = null;
      renderer.info.autoReset = false;
      renderer.render = (...args) => {
        const outer = renderDepth++ === 0,
          started = performance.now();
        stages.passes = (stages.passes ?? 0) + 1;
        try {
          return rawRender(...args);
        } finally {
          renderDepth--;
          if (outer) stages.render = (stages.render ?? 0) + performance.now() - started;
        }
      };
      experience.updateCamera = (...args) => {
        const start = performance.now();
        try {
          return rawCamera(...args);
        } finally {
          stages.camera = performance.now() - start;
        }
      };
      experience.updateAtmosphere = (...args) => {
        const start = performance.now();
        try {
          return rawAtmosphere(...args);
        } finally {
          stages.atmosphere = performance.now() - start;
        }
      };
      const memory = () => ({
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
      });
      experience.tick = (time) => {
        renderer.info.reset();
        stages = {};
        const start = performance.now();
        try {
          rawTick(time);
        } catch (error) {
          engineErrors.push(String(error));
          if (collector) {
            clearTimeout(collector.timer);
            collector.reject(error);
            collector = null;
          }
          return;
        }
        const cpu = performance.now() - start;
        const interval = lastRaf === null ? null : time - lastRaf;
        lastRaf = time;
        if (!collector) return;
        if (collector.skip-- > 0) return;
        collector.frames.push({
          cpuFrameMs: cpu,
          rafIntervalMs: interval,
          updateCameraMs: stages.camera ?? 0,
          updateAtmosphereMs: stages.atmosphere ?? 0,
          renderSubmissionMs: stages.render ?? 0,
          renderPasses: stages.passes ?? 0,
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          lines: renderer.info.render.lines,
          points: renderer.info.render.points,
          ...memory(),
        });
        if (collector.frames.length >= collector.count) {
          const done = collector;
          collector = null;
          clearTimeout(done.timer);
          done.resolve(done.frames);
        }
      };
      const collect = (count, skip) =>
        new Promise((resolve, reject) => {
          if (collector) return reject(new Error('Profiler already collecting'));
          collector = {
            count,
            skip,
            frames: [],
            resolve,
            reject,
            timer: setTimeout(() => {
              const observed = collector?.frames.length ?? 0;
              collector = null;
              reject(
                new Error(
                  `Frame sample timed out: ${observed}/${count}; inspect renderer/context loss or increase PERF_TIMEOUT_MS`,
                ),
              );
            }, config.timeoutMs),
          };
        });
      globalThis.__sceneProfiler = {
        engineErrors,
        memory,
        async visit(painting, quality, count, skip) {
          const start = performance.now();
          experience.configure({ ...state, painting, quality, progress: config.progress });
          // Settle directly at the authored shot, rather than measuring a different camera after each switch.
          experience.updateCamera(10);
          const rebuildMs = performance.now() - start;
          const frames = await collect(count, skip);
          const gl = renderer.getContext();
          return {
            painting,
            quality,
            progress: config.progress,
            rebuildMs,
            frames,
            resource: memory(),
            pixelRatio: renderer.getPixelRatio(),
            drawingBuffer: [renderer.domElement.width, renderer.domElement.height],
            contextLost: gl.isContextLost(),
            glError: gl.getError(),
            visibility: document.visibilityState,
          };
        },
        dispose() {
          if (collector) clearTimeout(collector.timer);
          collector = null;
          experience.dispose();
          return memory();
        },
      };
      experience.frame = requestAnimationFrame(experience.tick);
      const gl = renderer.getContext(),
        debug = gl.getExtension('WEBGL_debug_renderer_info');
      const name = debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemoryGiB: navigator.deviceMemory ?? null,
        devicePixelRatio,
        viewport: [innerWidth, innerHeight],
        renderer: name,
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        softwareRendererDetected:
          /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(name),
        webglVersion: gl.getParameter(gl.VERSION),
        contextAttributes: gl.getContextAttributes(),
        visibility: document.visibilityState,
      };
    },
    { config, base },
  );

  const matrix = config.qualities.flatMap((quality) =>
    config.scenes.map((painting) => ({ quality, painting })),
  );
  for (const entry of matrix) {
    console.log(`Sampling ${entry.painting}/${entry.quality} (${config.frames} frames)`);
    const result = await page.evaluate(
      ({ entry, count, skip }) =>
        globalThis.__sceneProfiler.visit(entry.painting, entry.quality, count, skip),
      { entry, count: config.frames, skip: config.warmup },
    );
    const statistics = {};
    for (const metric of [
      'cpuFrameMs',
      'rafIntervalMs',
      'updateCameraMs',
      'updateAtmosphereMs',
      'renderSubmissionMs',
      'renderPasses',
      'calls',
      'triangles',
      'lines',
      'points',
      'textures',
      'geometries',
    ])
      statistics[metric] = summary(
        result.frames.map((frame) => frame[metric]).filter(Number.isFinite),
      );
    report.samples.push({ ...result, statistics });
  }
  for (let round = 0; round < config.rounds; round++) {
    for (const entry of matrix) {
      console.log(
        `Resource visit ${round + 1}/${config.rounds}: ${entry.painting}/${entry.quality}`,
      );
      const result = await page.evaluate(
        ({ entry }) => globalThis.__sceneProfiler.visit(entry.painting, entry.quality, 2, 3),
        { entry },
      );
      const { frames: _frames, ...resourceVisit } = result;
      report.switches.push({ round, ...resourceVisit });
    }
  }
  report.resourceTrends = matrix.map((entry) => {
    const visits = report.switches.filter(
      (visit) => visit.painting === entry.painting && visit.quality === entry.quality,
    );
    return {
      ...entry,
      geometries: resourceTrend(visits.map((visit) => visit.resource.geometries)),
      textures: resourceTrend(visits.map((visit) => visit.resource.textures)),
      programs: resourceTrend(visits.map((visit) => visit.resource.programs)),
    };
  });
  report.engineErrors = await page.evaluate(() => globalThis.__sceneProfiler.engineErrors);
  report.afterDispose = await page.evaluate(() => globalThis.__sceneProfiler.dispose());
  report.status =
    errors.length || report.engineErrors.length ? 'completed-with-errors' : 'completed';
  if (report.samples.some((sample) => sample.contextLost || sample.glError !== 0))
    report.status = 'completed-with-errors';
} catch (error) {
  report.status = 'failed';
  errors.push({ type: 'runner', message: error.stack ?? String(error) });
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.browserVersion = browser.version();
  await browser.close();
  await mkdir(new URL('../artifacts/performance/', import.meta.url), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.status}: ${output}`);
}
