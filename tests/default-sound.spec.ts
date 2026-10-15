import { expect, test, type Page } from '@playwright/test';

type AudioWindow = Window & { soundContexts: AudioContext[] };

async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    (window as unknown as AudioWindow).soundContexts = contexts;
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        contexts.push(context);
        return context;
      },
    });
  });
}

async function audioStates(page: Page) {
  return page.evaluate(() =>
    (window as unknown as AudioWindow).soundContexts.map((context) => context.state),
  );
}

for (const mobile of [false, true]) {
  test.describe(mobile ? 'touch audio' : 'desktop audio', () => {
    test.use({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });

    test('first entry starts default sound; mute survives subsequent interactions', async ({
      page,
    }) => {
      await observeAudio(page);
      await page.goto('/');
      await expect(page.getByRole('button', { name: '关闭配乐与音效' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(await audioStates(page)).toEqual([]);
      const enter = page.getByRole('button', { name: '走进画中' });
      if (mobile) await enter.tap();
      else await enter.click();
      await expect.poll(() => audioStates(page)).toEqual(['running']);
      await page.getByRole('button', { name: '画境设置', exact: true }).click();
      await expect(page.getByRole('slider', { name: /背景音乐/ })).toHaveValue('0.58');
      await expect(page.getByRole('slider', { name: /场景音效/ })).toHaveValue('0.62');
      await page.getByRole('button', { name: '关闭配乐与音效' }).click();
      await expect.poll(() => audioStates(page)).toEqual(['suspended']);
      await page.getByRole('slider', { name: /背景音乐/ }).fill('0.4');
      await page.getByRole('button', { name: '画境设置', exact: true }).click();
      expect(await audioStates(page)).toEqual(['suspended']);
      await page.getByRole('button', { name: '开启配乐与音效' }).click();
      await expect.poll(() => audioStates(page)).toEqual(['running']);
    });
  });
}

test('muting as the first gesture does not create an audio context', async ({ page }) => {
  await observeAudio(page);
  await page.goto('/');
  await page.getByRole('button', { name: '关闭配乐与音效' }).click();
  await page.getByRole('button', { name: '走进画中' }).click();
  expect(await audioStates(page)).toEqual([]);
  await expect(page.getByRole('button', { name: '开启配乐与音效' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('keyboard entry starts sound without a separate audio action', async ({ page }) => {
  await observeAudio(page);
  await page.goto('/');
  const enter = page.getByRole('button', { name: '走进画中' });
  await expect(enter).toBeEnabled();
  await enter.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => audioStates(page)).toEqual(['running']);
});
