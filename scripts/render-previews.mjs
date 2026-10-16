import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173';
const requested = process.argv.slice(2);
await mkdir('public/previews', { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/scene-posters', route => route.fulfill({ contentType: 'text/html', body: '<style>html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>' }));
  await page.goto(`${base}/scene-posters`);
  const ids = await page.evaluate(async () => (await import('/src/data/paintings.ts')).PAINTINGS.map(p => p.id));
  for (const id of requested.length ? requested : ids) {
    if (!ids.includes(id)) throw new Error(`Unknown scene: ${id}`);
    const frames = await page.evaluate(async id => {
      const { Experience } = await import('/src/engine/Experience.ts');
      const { initialState } = await import('/src/state.ts');
      const { getPainting } = await import('/src/data/paintings.ts');
      const { FEATURED_SCENES } = await import('/src/data/featuredScenes.ts');
      const THREE = await import('/node_modules/three/build/three.module.js');
      let loading = false;
      let finished;
      const textures = new Promise(resolve => { finished = resolve; });
      const failed = [];
      THREE.DefaultLoadingManager.onStart = () => { loading = true; };
      THREE.DefaultLoadingManager.onLoad = () => finished();
      THREE.DefaultLoadingManager.onError = url => failed.push(url);
      const engine = new Experience(document.getElementById('stage'), { ...initialState, painting: id }, {
        onTelemetry() {}, onError(message) { throw new Error(message); },
      });
      try {
        engine.beginOfflineFilm(1200, 800);
        engine.scene.traverse(object => object.userData.prepareAssets?.(engine.renderer));
        if (loading) await textures;
        const promises = [];
        engine.scene.traverse(object => {
          if (object.userData.ready instanceof Promise) promises.push(object.userData.ready);
          if (object.userData.sakuraAssetsReady instanceof Promise) promises.push(object.userData.sakuraAssetsReady);
        });
        await Promise.all(promises);
        if (failed.length) throw new Error(`Missing textures: ${failed.join(', ')}`);
        const painting = getPainting(id);
        // The wide collection crop must retain the vessel as well as the blossom-lined valley.
        const posterView = id === 'sakura' ? { eye: [1.5, 11, 52], target: [0, 4, -18] } : painting.overview;
        engine.renderOfflineFrame(0, 4, posterView);
        const poster = engine.renderer.domElement.toDataURL('image/webp', 0.85);
        let thumbnail;
        if (id === 'roadster' || FEATURED_SCENES.some(scene => scene.id === id)) {
          engine.renderer.setSize(960, 480, false);
          engine.camera.aspect = 2;
          engine.camera.updateProjectionMatrix();
          engine.renderOfflineFrame(0, 4, posterView);
          thumbnail = engine.renderer.domElement.toDataURL('image/webp', 0.88);
        }
        return { poster, thumbnail };
      } finally { engine.dispose(); }
    }, id);
    for (const [suffix, data] of [['', frames.poster], ['-thumb', frames.thumbnail]]) {
      if (!data) continue;
      if (!data.startsWith('data:image/webp;base64,')) throw new Error(`WebP unavailable: ${id}`);
      await writeFile(`public/previews/${id}${suffix}.webp`, Buffer.from(data.split(',')[1], 'base64'));
    }
    console.log(`Preview rendered: ${id}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
