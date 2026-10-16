import { expect, test } from '@playwright/test';

for (const [id, title, night] of [
  ['arctic', '北极冰川', true],
  ['deepsea', '深海蓝眼泪', true],
  ['sakura', '樱谷行舟', false],
] as const) {
  test(`${id}: readable titles, loaded font and no viewport overflow`, async ({ page }, info) => {
    await page.addInitScript((painting) => {
      localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting }));
    }, id);
    await page.goto('/');
    await expect(page.getByRole('button', { name: '走进画中', exact: true })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    const heading = page.locator('.experience-title h1');
    await expect(heading).toContainText(title);
    if (night) await expect(page.locator('main')).toHaveClass(/is-night/);
    const styles = await heading.evaluate(node => {
      const text = getComputedStyle(node);
      const panel = getComputedStyle(node.parentElement!);
      return { font: text.fontFamily, color: text.color, background: panel.backgroundColor, shadow: panel.textShadow };
    });
    expect(styles.font).toContain('Landscape Serif');
    expect(styles.shadow).toBe('none');
    expect(styles.background).not.toBe('rgba(0, 0, 0, 0)');
    // CDP reports the font that actually supplied glyphs, not just the CSS declaration.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.experience-title h1' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.filter(f => f.glyphCount > 0).every(f => f.isCustomFont)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${id}-ui.png`) });
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`sakura: passenger playback and seeking preserve the onboard view at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('ruhua.preferences.v1', JSON.stringify({ painting: 'sakura' })));
    await page.goto('/');
    await page.getByRole('button', { name: '走进画中', exact: true }).click();
    const passenger = page.getByRole('button', { name: '乘舟', exact: true });
    await passenger.click();
    await expect(passenger).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('步行方向控制')).toHaveCount(0);
    await expect(page.getByLabel('步行摇杆，按住拖动控制方向和速度')).toHaveCount(0);
    await page.getByRole('button', { name: '自动游览', exact: true }).click();
    await expect(page.getByRole('button', { name: '暂停游览', exact: true })).toBeVisible();
    await expect(passenger).toHaveAttribute('aria-pressed', 'true');
    const progress = page.getByRole('slider', { name: '游览进度' });
    const start = Number(await progress.inputValue());
    await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(start);
    await page.getByRole('button', { name: '暂停游览', exact: true }).click();
    await progress.fill('430');
    await expect(progress).toHaveValue('430');
    await expect(passenger).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.journey-bottom')).toContainText('船上第一视角');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: info.outputPath(`sakura-passenger-${viewport.width}.png`) });
    expect(errors).toEqual([]);
  });
}

test('every collection card has a loaded preview on desktop and mobile', async ({ page }, info) => {
  await page.goto('/');
  const collection = page.getByRole('region', { name: '画境收藏' });
  const cards = collection.getByRole('button', { name: /^选择/ });
  const expected = await page.evaluate(async () => (await import('/src/data/paintings.ts')).PAINTINGS.length);
  await expect(cards).toHaveCount(expected);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (let i = 0; i < expected; i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('img,canvas')).toHaveCount(1);
      await expect.poll(() => card.evaluate(node => {
        const image = node.querySelector('img');
        if (image) return image.complete && image.naturalWidth >= 400 && image.naturalHeight >= 160;
        const canvas = node.querySelector('canvas');
        return !!canvas && canvas.width >= 400 && canvas.height >= 160;
      }), { message: `Preview must load: ${await card.getAttribute('aria-label')}` }).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`collection-${width}.png`) });
  }
});
