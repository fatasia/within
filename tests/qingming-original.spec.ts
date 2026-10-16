import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test('full scroll opens at its right-hand beginning and supports overview and all six sections', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'qingming' })),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '走进画中', exact: true }).tap();
  await page.getByRole('button', { name: '查看原作与出处', exact: true }).tap();
  const dialog = page.getByRole('dialog');
  const image = dialog.locator('.original-viewport img');
  const viewport = dialog.locator('.original-viewport');
  await expect.poll(() => image.evaluate((node) => node.naturalWidth)).toBe(16000);
  await expect
    .poll(() =>
      viewport.evaluate((node) => node.scrollLeft + node.clientWidth >= node.scrollWidth - 2),
    )
    .toBe(true);
  expect(await viewport.evaluate((node) => node.scrollWidth > node.clientWidth * 4)).toBe(true);
  await dialog.getByRole('button', { name: '全览', exact: true }).tap();
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollWidth <= node.clientWidth + 1))
    .toBe(true);
  await dialog.getByRole('button', { name: '卷首', exact: true }).tap();
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft > 1000)).toBe(true);
  for (const caption of [
    '01 郊野 · 卷首',
    '02 河岸舟运',
    '03 汴河虹桥',
    '04 桥后街市',
    '05 城门内外',
    '06 城内 · 卷尾',
  ]) {
    await dialog.getByRole('button', { name: caption, exact: true }).tap();
    await expect
      .poll(() => image.evaluate((node) => node.complete && node.naturalWidth === 3840))
      .toBe(true);
    await expect(dialog.locator('.original-caption')).toHaveText(caption);
  }
});
