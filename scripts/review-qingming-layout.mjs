import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const label = process.argv[2] ?? 'layout';
const directory = `artifacts/qingming-review/${label}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/qingming-review', route => route.fulfill({ contentType: 'text/html', body: '<style>html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>' }));
  await page.goto('http://127.0.0.1:5173/qingming-review');
  const shots = await page.evaluate(async () => {
    const { Experience } = await import('/src/engine/Experience.ts');
    const { initialState } = await import('/src/state.ts');
    const { getPainting } = await import('/src/data/paintings.ts');
    const engine = new Experience(document.getElementById('stage'), { ...initialState, painting: 'qingming' }, { onTelemetry() {}, onError(message) { throw new Error(message); } });
    try {
      engine.beginOfflineFilm(1600, 1000);
      return [
        ['overview', getPainting('qingming').overview, 0],
        ['river-group', {eye:[-90,20,26],target:[-73,2,-1]},8],
        ['bridge-street', {eye:[-42,45,32],target:[8,3,-30]},8],
        ['gate', {eye:[34,19,-29],target:[55,11,-45]},8],
        ['city-courts', {eye:[124,46,20],target:[95,4,-42]},8],
      ].map(([name, view, time]) => {
        engine.renderOfflineFrame(0.25, time, view);
        return { name, image: engine.renderer.domElement.toDataURL('image/png') };
      });
    } finally { engine.dispose(); }
  });
  for (const shot of shots) await writeFile(`${directory}/${shot.name}.png`, Buffer.from(shot.image.split(',')[1], 'base64'));
  await writeFile(`${directory}/errors.json`, JSON.stringify(errors, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Rendered ${shots.length} Qingming review frames in ${directory}; no browser errors.`);
} finally { await browser.close(); }
