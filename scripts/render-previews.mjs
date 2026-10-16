import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5175';
await mkdir('public/previews', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.route('**/scene-posters', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<style>html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>',
    }),
  );
  await page.goto(`${base}/scene-posters`);
  for (const id of [
    'starry',
    'winter',
    'qingming',
    'wuhan',
    'qianli',
    'fuchun',
    'xishan',
    'empire',
    'zhangjiajie',
    'guilin',
  ]) {
    const data = await page.evaluate(async (id) => {
      const engineModule = '/src/engine/Experience.ts',
        stateModule = '/src/state.ts',
        dataModule = '/src/data/paintings.ts';
      const { Experience } = await import(engineModule);
      const { initialState } = await import(stateModule);
      const { getPainting } = await import(dataModule);
      const engine = new Experience(
        document.getElementById('stage'),
        { ...initialState, painting: id },
        {
          onTelemetry() {},
          onError(message) {
            throw new Error(message);
          },
        },
      );
      try {
        engine.beginOfflineFilm(1200, 800);
        engine.renderOfflineFrame(0, 0, getPainting(id).overview);
        return engine.renderer.domElement.toDataURL('image/webp', 0.76);
      } finally {
        engine.dispose();
      }
    }, id);
    if (!data.startsWith('data:image/webp;base64,')) throw new Error(`WebP unavailable: ${id}`);
    await writeFile(`public/previews/${id}.webp`, Buffer.from(data.split(',')[1], 'base64'));
    console.log(`Preview rendered: ${id}`);
  }
} finally {
  await browser.close();
}
