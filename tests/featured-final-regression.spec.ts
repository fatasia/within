import { expect, test } from '@playwright/test';
for (const width of [1440, 390]) test(`Arctic controls clear characters and tapping opens only a toast at ${width}px`, async ({page}, info) => {
  await page.setViewportSize({width,height:width===390?844:900});
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('ruhua.preferences.v1',JSON.stringify({painting:'arctic'})));
  await page.goto('/');await page.getByRole('button',{name:'走进画中',exact:true}).click();
  await page.getByRole('slider',{name:'游览进度'}).fill('380');
  await expect(page.locator('main')).toHaveAttribute('data-painting','arctic');
  await expect.poll(async()=>{const a=await page.locator('.chapter-caption').boundingBox(), b=await page.locator('.journey-panel').boundingBox();return !!a&&!!b&&a.y+a.height<b.y;}).toBe(true);
  await page.waitForTimeout(1800);
  await page.screenshot({path:info.outputPath(`arctic-before-${width}.png`)});
  await page.mouse.click(width===390?333:550,width===390?460:400);
  await expect(page.locator('.toast')).toContainText(width===390?'企鹅':'白熊');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`arctic-tap-${width}.png`)});expect(errors).toEqual([]);
});

