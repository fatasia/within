import { expect, test } from '@playwright/test';

for (const device of [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 3 },
]) {
  test(`${device.name} starts at highest quality, including returning visitors`, async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.name === 'mobile',
      hasTouch: device.name === 'mobile',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      for (const saved of [null, 'low']) {
        if (saved) {
          await page.evaluate((quality) => {
            localStorage.setItem(
              'ruhua.preferences.v1',
              JSON.stringify({ quality, painting: 'wuhan' }),
            );
          }, saved);
        }
        await page.goto('/');
        await expect(page).toHaveTitle('入画 · WITHIN');
        await page.getByRole('button', { name: '走进画中', exact: true }).click();
        await page.getByRole('button', { name: '暂停游览', exact: true }).click();
        await page.getByRole('button', { name: '画境设置', exact: true }).click();
        await expect(page.getByLabel('渲染画质')).toHaveValue('high');
        const resolution = await page.locator('[data-testid=world] canvas').evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          return {
            actual: canvas.width,
            expected: Math.floor(canvas.clientWidth * Math.min(devicePixelRatio, 1.75)),
          };
        });
        expect(resolution.actual).toBe(resolution.expected);
        await page.getByLabel('渲染画质').selectOption('low');
        await expect(page.getByLabel('渲染画质')).toHaveValue('low');
        await page.getByLabel('渲染画质').selectOption('high');
        await expect(page.getByLabel('渲染画质')).toHaveValue('high');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
