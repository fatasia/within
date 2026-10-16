import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({headless:true,args:['--use-angle=d3d11']}); const directory = 'artifacts/polar-review'; await mkdir(directory,{recursive:true});
try {
 const errors=[]; const page=await browser.newPage({viewport:{width:1600,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const id of ['arctic','deepsea']){
  await page.goto('http://127.0.0.1:5173/');await page.evaluate(id=>localStorage.setItem('ruhua.preferences.v1',JSON.stringify({painting:id,sound:false})),id);await page.reload();
  await page.getByRole('button',{name:'走进画中'}).waitFor();await page.waitForFunction(()=>!document.querySelector('.enter-button')?.disabled);await page.screenshot({path:`${directory}/${id}-ui-home.png`});
  await page.getByRole('button',{name:'走进画中'}).click();await page.waitForTimeout(4500);await page.screenshot({path:`${directory}/${id}-ui-entered.png`});
 }
 await writeFile(`${directory}/ui-errors.json`,JSON.stringify(errors,null,2));if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close()}
