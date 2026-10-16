import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test.describe(`forced landscape ${viewport.width}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test('rotates the page, touch axes, joystick and top-layer dialogs', async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'winter' }));
        Object.defineProperty(screen.orientation, 'lock', {
          value: async () => {
            throw new Error('NotSupportedError');
          },
          configurable: true,
        });
        Object.defineProperty(Element.prototype, 'requestFullscreen', {
          value: async () => {
            throw new Error('NotSupportedError');
          },
          configurable: true,
        });
      });
      await page.goto('/');
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
      await page.evaluate(async () => {
        // Vite may have added an HMR version to the module loaded by App.
        // Patch that same class, not a second import of the unversioned module.
        const module = performance.getEntriesByType('resource').map(entry => entry.name)
          .find(name => /\/src\/engine\/Experience\.ts(?:\?|$)/.test(name)) ?? '/src/engine/Experience.ts';
        const { Experience } = await import(module);
        const original = Experience.prototype.configure;
        Experience.prototype.configure = function (state: unknown) {
          original.call(this, state);
          (window as unknown as Record<string, unknown>).rotationHarness = () => ({
            progress: this.progress,
            yaw: this.yaw,
            pitch: this.pitch,
            stick: { ...this.stick },
            width: this.host.clientWidth,
            height: this.host.clientHeight,
          });
        };
      });
      await page.getByRole('button', { name: '走进画中', exact: true }).tap();
      await page.getByRole('button', { name: '暂停游览', exact: true }).tap();
      await page.getByRole('button', { name: '切换横屏', exact: true }).tap();
      await expect(page.locator('html')).toHaveAttribute('data-view-rotation', '90');
      await expect(page.getByRole('button', { name: '切换竖屏', exact: true })).toBeVisible();
      const dimensions = await page
        .locator('[data-testid=world]')
        .evaluate((n) => ({ width: n.clientWidth, height: n.clientHeight }));
      expect(dimensions).toEqual({ width: viewport.height, height: viewport.width });
      const controls = await page
        .locator('.home-button,.scene-tools button,.scene-switcher button,.view-switch button')
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          }),
        );
      for (const r of controls) {
        expect(r.x).toBeGreaterThanOrEqual(-1);
        expect(r.y).toBeGreaterThanOrEqual(-1);
        expect(r.x + r.w).toBeLessThanOrEqual(viewport.width + 1);
        expect(r.y + r.h).toBeLessThanOrEqual(viewport.height + 1);
      }
      await page.getByRole('button', { name: '步行', exact: true }).tap();
      const snapshot = () =>
        page.evaluate(() =>
          (
            window as unknown as {
              rotationHarness(): { yaw: number; pitch: number; stick: { x: number; y: number } };
            }
          ).rotationHarness(),
        );
      const cdp = await page.context().newCDPSession(page);
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
        });
      const drag = async (x: number, y: number, dx: number, dy: number) => {
        await touch('touchStart', x, y);
        // CDP does not provide human gesture timing. A zero-duration 40px move
        // suppresses the following tap even in a plain HTML canvas/button page.
        // Send a real multi-frame drag rather than retrying that lost click.
        for (let step = 1; step <= 5; step++) {
          await page.waitForTimeout(25);
          await touch('touchMove', x + (dx * step) / 5, y + (dy * step) / 5);
        }
        await page.waitForTimeout(75);
      };
      const r = (await page.locator('[data-testid=world] canvas').boundingBox())!;
      const before = await snapshot();
      await drag(r.x + r.width / 2, r.y + r.height * 0.7, 0, 40);
      await touch('touchEnd');
      const after = await snapshot();
      const b = (await page.locator('.walk-joystick').boundingBox())!;
      await drag(b.x + b.width / 2, b.y + b.height / 2, 25, 0);
      const moving = (await snapshot()).stick;
      await touch('touchEnd');
      const motion = {
        yawDelta: after.yaw - before.yaw,
        pitchDelta: after.pitch - before.pitch,
        moving,
        released: (await snapshot()).stick,
      };
      expect(motion.yawDelta).toBeCloseTo(-0.16, 3);
      expect(motion.pitchDelta).toBeCloseTo(0, 3);
      expect(motion.moving.y).toBeGreaterThan(0.3);
      expect(Math.abs(motion.moving.x)).toBeLessThan(0.01);
      expect(motion.released).toEqual({ x: 0, y: 0 });
      await page.screenshot({ path: testInfo.outputPath('forced-landscape.png') });
      await page.getByRole('button', { name: '查看原作与出处', exact: true }).tap();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect
        .poll(() => dialog.locator('img').evaluate((n) => n.naturalWidth))
        .toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath('rotated-original.png') });
      await dialog.getByRole('button', { name: '关闭弹窗' }).tap();
      await expect(dialog).toHaveCount(0);
      // Physical device rotation while forced must not rotate the scene a second time.
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await expect(page.locator('html')).toHaveAttribute('data-view-rotation', '0');
      await page.setViewportSize(viewport);
      await expect(page.locator('html')).toHaveAttribute('data-view-rotation', '90');
      await page.getByRole('button', { name: '切换竖屏', exact: true }).tap();
      await expect(page.locator('html')).toHaveAttribute('data-view-rotation', '0');
      await page.getByRole('button', { name: '返回画境首页', exact: true }).tap();
      await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
