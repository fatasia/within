import { expect, test, type Page } from '@playwright/test';

async function assertTouchable(page: Page, selector: string) {
  const bounds = await page.locator(selector).evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((node) => {
        const r = node.getBoundingClientRect();
        return {
          label: node.getAttribute('aria-label') ?? node.textContent,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
        };
      }),
  );
  const viewport = page.viewportSize()!;
  for (const r of bounds) {
    expect(r.w, `${r.label} width`).toBeGreaterThanOrEqual(43.9);
    expect(r.h, `${r.label} height`).toBeGreaterThanOrEqual(43.9);
    expect(r.x, `${r.label} left`).toBeGreaterThanOrEqual(-0.5);
    expect(r.y, `${r.label} top`).toBeGreaterThanOrEqual(-0.5);
    expect(r.x + r.w, `${r.label} right`).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(r.y + r.h, `${r.label} bottom`).toBeLessThanOrEqual(viewport.height + 0.5);
  }
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 360, height: 640 },
]) {
  test.describe(`touch usability ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    test('controls, original viewer, orientation and fast scene selection stay usable', async ({
      page,
    }, testInfo) => {
      test.setTimeout(120000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'starry' }));
        Object.defineProperty(screen.orientation, 'lock', { configurable: true, value: undefined });
      });
      await page.goto('/');
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
      await page.getByRole('button', { name: '走进画中', exact: true }).tap();
      await page.getByRole('button', { name: '暂停游览', exact: true }).tap();
      await assertTouchable(
        page,
        '.mobile-top button,.mobile-modes button,.mobile-play,.mobile-details',
      );
      await page.getByRole('button', { name: '步行', exact: true }).tap();
      await expect(page.getByRole('button', { name: '步行', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const overlap = await page.evaluate(() => {
        const a = document.querySelector('.scene-tools')!.getBoundingClientRect();
        const b = document.querySelector('.walk-pad')!.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
      expect(overlap).toBe(false);
      await assertTouchable(page, '.walk-joystick button');
      await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5000 });
      await page.screenshot({ path: testInfo.outputPath('walk-controls.png') });

      await page.getByRole('button', { name: '更多操作', exact: true }).tap();
      await page.getByRole('button', { name: '原作与出处', exact: true }).tap();
      const dialog = page.getByRole('dialog');
      const original = dialog.locator('.original-viewport img');
      await expect(original).toBeVisible();
      await expect
        .poll(() => original.evaluate((node) => (node as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      await dialog.getByRole('button', { name: '放大原作' }).tap();
      await expect(dialog.locator('.original-zoom')).toContainText('2×');
      expect(
        await original.evaluate(
          (node) => node.getBoundingClientRect().width > node.parentElement!.clientWidth,
        ),
      ).toBe(true);
      await dialog.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await assertTouchable(page, '.original-dialog .dialog-heading button');
      await page.screenshot({ path: testInfo.outputPath('original-viewer.png') });
      await dialog.getByRole('button', { name: '关闭弹窗' }).tap();
      await expect(dialog).toHaveCount(0);

      const rotate = page.getByRole('button', {
        name: viewport.width > viewport.height ? '切换竖屏' : '切换横屏',
        exact: true,
      });
      await page.getByRole('button', { name: '更多操作', exact: true }).tap();
      await rotate.tap();
      await expect(page.getByRole('status')).toContainText('已切换');
      await expect(page.locator('html')).toHaveAttribute('data-view-rotation', '90');
      await page.evaluate(() => {
        Object.defineProperty(document.documentElement, 'requestFullscreen', {
          configurable: true,
          value: async () => {
            document.documentElement.dataset.fullscreenRequested = 'true';
          },
        });
        Object.defineProperty(screen.orientation, 'lock', {
          configurable: true,
          value: async (direction: string) => {
            document.documentElement.dataset.lockedDirection = direction;
          },
        });
      });
      await page.getByRole('button', { name: '更多操作', exact: true }).tap();
      await page
        .getByRole('button', {
          name: viewport.width > viewport.height ? '切换横屏' : '切换竖屏',
          exact: true,
        })
        .tap();
      await expect(page.getByRole('status')).toContainText('已锁定');
      await expect(page.locator('html')).toHaveAttribute('data-fullscreen-requested', 'true');
      await expect(page.locator('html')).toHaveAttribute(
        'data-locked-direction',
        viewport.width > viewport.height ? 'landscape' : 'portrait',
      );
      await page.getByRole('button', { name: '更多操作', exact: true }).tap();
      await page.getByRole('button', { name: '画境设置', exact: true }).tap();
      await expect(page.getByRole('region', { name: '画境设置' })).toBeVisible();
      await page.getByRole('button', { name: '关闭设置' }).tap();
      await page.getByRole('button', { name: '返回画境首页', exact: true }).tap();
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeVisible();

      // Observe real configure calls rather than inferring loaded geometry from the heading.
      await page.evaluate(async () => {
        const module = performance.getEntriesByType('resource').map(entry => entry.name)
          .find(name => /\/src\/engine\/Experience\.ts(?:\?|$)/.test(name)) ?? '/src/engine/Experience.ts';
        const { Experience } = await import(/* @vite-ignore */ module);
        const original = Experience.prototype.configure;
        Experience.prototype.configure = function (state: { painting: string }) {
          original.call(this, state);
          document
            .querySelector('[data-testid=world]')!
            .setAttribute('data-rendered-painting', state.painting);
        };
        for (const name of ['选择清明上河图', '选择千里江山图', '选择山中冬夜']) {
          (document.querySelector(`button[aria-label="${name}"]`) as HTMLButtonElement).click();
        }
      });
      await expect(page.locator('.hero-copy h1')).toHaveText('山中冬夜');
      await expect(page.locator('[data-testid=world]')).toHaveAttribute(
        'data-rendered-painting',
        'winter',
      );
      await expect(page.locator('[data-testid=world]')).toHaveAttribute('aria-busy', 'false');
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath('gallery-final-selection.png') });
      expect(errors).toEqual([]);
    });
  });
}
