import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('Guilin river remains visible with and without planar reflections', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '选择漓江 · 黄布倒影', exact: true }).click();
  await page.getByRole('button', { name: '走进画中', exact: true }).click();
  await page.getByRole('button', { name: '暂停游览', exact: true }).click();
  await page.getByRole('button', { name: '步行', exact: true }).click();
  const waterSamples: number[][] = [];
  for (const quality of ['low', 'balanced'] as const) {
    await page.getByRole('button', { name: '画境设置', exact: true }).click();
    await page.getByRole('button', { name: '晴昼', exact: true }).click();
    await page.getByLabel('渲染画质').selectOption(quality);
    await page.getByRole('button', { name: '关闭设置', exact: true }).click();
    await page.waitForTimeout(2400);
    await page.screenshot({ path: `artifacts/screenshots/guilin-river-${quality}-new.png` });
    // Read the rendered canvas, not the page overlay. This near-bank patch must
    // retain water colour; the former vertex-distance bug made it pale sky.
    const pixels = await page.evaluate(() => {
      const source = document.querySelector<HTMLCanvasElement>('[data-testid="world"] canvas')!;
      const copy = document.createElement('canvas');
      copy.width = source.clientWidth;
      copy.height = source.clientHeight;
      const context = copy.getContext('2d')!;
      context.drawImage(source, 0, 0, copy.width, copy.height);
      const result: number[] = [];
      for (let y = 590; y <= 710; y += 20)
        for (let x = 930; x <= 1110; x += 20) {
          const pixel = context.getImageData(x, y, 1, 1).data;
          result.push(pixel[0]!, pixel[1]!, pixel[2]!);
        }
      return result;
    });
    waterSamples.push(pixels);
    const brightness = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
    expect(brightness).toBeLessThan(210);
    if (quality === 'low') {
      let greenExcess = 0;
      for (let i = 0; i < pixels.length; i += 3) greenExcess += pixels[i + 1]! - pixels[i]!;
      expect(greenExcess / (pixels.length / 3)).toBeGreaterThan(7);
    }
  }
  const reflectedDifference =
    waterSamples[0]!.reduce((sum, value, i) => sum + Math.abs(value - waterSamples[1]![i]!), 0) /
    waterSamples[0]!.length;
  expect(reflectedDifference).toBeGreaterThan(3);
  expect(errors).toEqual([]);
});
