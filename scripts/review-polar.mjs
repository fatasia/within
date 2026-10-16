import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'artifacts/polar-review'; await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/polar-review', route => route.fulfill({ contentType: 'text/html', body: '<style>html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>' }));
  await page.goto('http://127.0.0.1:5173/polar-review');
  const shots = await page.evaluate(async () => {
    const { Experience } = await import('/src/engine/Experience.ts'); const { initialState } = await import('/src/state.ts');  const result = [];
    for (const id of ['arctic', 'deepsea']) {
      const engine = new Experience(document.getElementById('stage'), { ...initialState, painting: id }, { onTelemetry() {}, onError(message) { throw new Error(message); } });
      try {
        engine.beginOfflineFilm(1600, 1000);
        const views = id === 'arctic' ? [['overview', { eye: [-4, 11, 48], target: [-9, 7, -30] }], ['bear', { eye: [-3, 5.3, 27], target: [-11, 1.6, 12] }], ['penguins', { eye: [10, 3.3, 22], target: [5, 1, 12] }]] : [['overview', { eye: [15, 25, 94], target: [20, 12, -20] }], ['whale', { eye: [52, 23, 50], target: [37, 14, -3] }]];        for (const [name, view] of views) { engine.renderOfflineFrame(0.25, 12, view); const durations = []; const gl = engine.renderer.getContext(); for (let sample = 0; sample < 7; sample++) { gl.finish(); const start = performance.now(); engine.renderOfflineFrame(0.25, 12 + sample / 60, view); gl.finish(); durations.push(performance.now() - start); } durations.sort((a,b)=>a-b); result.push({ frameMedianMs: durations[3], frameMaxMs: durations[6], name: `${id}-${name}`, image: engine.renderer.domElement.toDataURL('image/png'), calls: engine.renderer.info.render.calls, triangles: engine.renderer.info.render.triangles }); }
        if (id === 'arctic') for (const elapsed of [0, 9, 12, 18]) for (const [name, view] of views.slice(0, 2)) { engine.renderOfflineFrame(.25, elapsed, view); result.push({ name: `${id}-${name}-t${elapsed}`, image: engine.renderer.domElement.toDataURL('image/png') }); }
      } finally { engine.dispose(); }
    }
    return result;
  });
  for (const shot of shots) await writeFile(`${directory}/${shot.name}.png`, Buffer.from(shot.image.split(',')[1], 'base64'));
  await writeFile(`${directory}/metrics.json`, JSON.stringify({ errors, shots: shots.map(({ image, ...s }) => s) }, null, 2));
  if (errors.length) throw new Error(errors.join('\n')); console.log(JSON.stringify(shots.map(({ image, ...s }) => s)));
} finally { await browser.close(); }






