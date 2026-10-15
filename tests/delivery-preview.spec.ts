import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

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
  test(`${id}: delivery shots render at full quality`, async ({ page }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.route('**/delivery-preview', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><style>@font-face{font-family:"Landscape Serif";src:url("/fonts/landscape-serif.woff2")}html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>',
      }),
    );
    await page.goto('/delivery-preview');
    const frames = await page.evaluate(async (id) => {
      const engineModule = '/src/engine/Experience.ts',
        stateModule = '/src/state.ts',
        dataModule = '/src/data/paintings.ts',
        filmModule = '/src/engine/filmTimeline.ts';
      const { Experience } = await import(engineModule);
      const { initialState } = await import(stateModule);
      const { getPainting } = await import(dataModule);
      const { getFilmShot } = await import(filmModule);
      await document.fonts.load('400 34px "Landscape Serif"', '山水清明星月武汉桂雨东湖');
      const engine = new Experience(
        document.getElementById('stage'),
        { ...initialState, painting: id },
        {
          onTelemetry() {},
          onError(message: string) {
            throw new Error(message);
          },
        },
      );
      try {
        engine.beginOfflineFilm(1920, 1080);
        return (id === 'empire' ? [1, 3, 5, 7, 9] : [1.5, 4.5, 8]).map((time) => {
          const shot = getFilmShot(getPainting(id), time, 10);
          return { time, data: engine.renderOfflineFrame(shot.progress, time, shot.view) };
        });
      } finally {
        engine.dispose();
      }
    }, id);
    await mkdir('artifacts/delivery-review', { recursive: true });
    for (const frame of frames) {
      expect(frame.data.startsWith('data:image/jpeg;base64,')).toBe(true);
      await writeFile(
        `artifacts/delivery-review/${id}-${frame.time}.jpg`,
        Buffer.from(frame.data.split(',')[1], 'base64'),
      );
    }
    expect(errors).toEqual([]);
  });
}
