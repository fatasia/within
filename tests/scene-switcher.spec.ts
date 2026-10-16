import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 360, height: 640 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test.describe(`in-scene switching ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: viewport.width < 1000 });
    test('switches previous/next and arbitrary scenes without leaving exploration', async ({
      page,
    }, testInfo) => {
      test.setTimeout(120000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'starry' }));
      });
      await page.goto('/');
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: '走进画中', exact: true }).click();
      await page.getByRole('button', { name: '步行', exact: true }).click();
      await page.getByRole('button', { name: '画境设置', exact: true }).click();
      await page.getByLabel('渲染画质').selectOption('low');
      await page.locator('#music-volume').press('Home');
      await page.locator('#ambience-volume').press('End');
      await page.getByRole('button', { name: '关闭设置', exact: true }).click();
      await page.evaluate(async () => {
        const module = '/src/engine/Experience.ts';
        const { Experience } = await import(/* @vite-ignore */ module);
        const configure = Experience.prototype.configure;
        Experience.prototype.configure = function (state: Record<string, unknown>) {
          configure.call(this, state);
          document
            .querySelector('[data-testid=world]')!
            .setAttribute('data-configured-state', JSON.stringify(state));
        };
      });
      const world = page.locator('[data-testid=world]');
      await page.getByRole('button', { name: '下一个画境', exact: true }).click();
      await expect(
        page.getByRole('button', { name: '选择画境，当前山中冬夜', exact: true }),
      ).toBeVisible();
      await expect
        .poll(
          async () =>
            JSON.parse((await world.getAttribute('data-configured-state')) ?? '{}').painting,
        )
        .toBe('winter');
      let state = JSON.parse((await world.getAttribute('data-configured-state')) ?? '{}');
      expect(state).toMatchObject({
        entered: true,
        mode: 'scroll',
        playing: false,
        quality: 'low',
        sound: false,
        period: 0,
        time: 'night',
      });
      expect(state.progress).toBe(0);
      await expect(page.locator('main')).toHaveClass(/is-exploring/);
      await expect(page.getByRole('button', { name: '展卷', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.getByRole('button', { name: '上一个画境', exact: true }).click();
      await expect
        .poll(
          async () =>
            JSON.parse((await world.getAttribute('data-configured-state')) ?? '{}').painting,
        )
        .toBe('starry');
      await page.getByRole('button', { name: '选择画境，当前星月夜', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '切换画境', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('.scene-picker-list > button')).toHaveCount(18);
      const labels = await dialog
        .locator('.scene-picker-list > button')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
      expect(labels.slice(0, 4)).toEqual([
        '切换到Roadster · 未来之形',
        '切换到清明上河图',
        '切换到武汉 · 桂雨东湖',
        '切换到星月夜',
      ]);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await page.getByRole('button', { name: '选择画境，当前星月夜', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath('scene-picker.png') });
      await dialog.getByRole('button', { name: '切换到富春山居图', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect
        .poll(
          async () =>
            JSON.parse((await world.getAttribute('data-configured-state')) ?? '{}').painting,
        )
        .toBe('fuchun');
      state = JSON.parse((await world.getAttribute('data-configured-state')) ?? '{}');
      expect(state).toMatchObject({
        entered: true,
        mode: 'scroll',
        playing: false,
        quality: 'low',
        sound: false,
        time: 'journey',
      });
      await page.getByRole('button', { name: '画境设置', exact: true }).click();
      await expect(page.getByLabel('渲染画质')).toHaveValue('low');
      await expect(page.locator('#music-volume')).toHaveValue('0');
      await expect(page.locator('#ambience-volume')).toHaveValue('1');
      await page.getByRole('button', { name: '关闭设置', exact: true }).click();
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: '步行', exact: true }).click();
      const bounds = await page.locator('.scene-switcher button').evaluateAll((nodes) =>
        nodes.map((node) => {
          const b = node.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        }),
      );
      for (const b of bounds) {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
      }
      expect(
        await page.evaluate(() => {
          const a = document.querySelector('.scene-switcher')!.getBoundingClientRect();
          return [
            '.scene-tools',
            '.walk-pad',
            '.home-button',
            '.view-switch',
            '.header-actions',
          ].every((selector) => {
            const b = document.querySelector(selector)!.getBoundingClientRect();
            return a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
          });
        }),
      ).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('switched-exploration.png') });
      expect(errors).toEqual([]);
    });
  });
}
