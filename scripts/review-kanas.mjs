import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out='artifacts/kanas-fix';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:916}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/kanas-review',r=>r.fulfill({contentType:'text/html',body:'<style>html,body,#stage{width:100%;height:100%;margin:0}</style><div id="stage"></div>'}));await page.goto('http://127.0.0.1:5173/kanas-review');
 await page.evaluate(async()=>{const {Experience}=await import('/src/engine/Experience.ts');const {initialState}=await import('/src/state.ts');window.e=new Experience(document.getElementById('stage'),{...initialState,painting:'kanas',entered:true},{onTelemetry(){}});e.beginOfflineFilm(1920,916)});
 for(const p of [0,.1,.24,.4,.58,.74,.88,1]){const image=await page.evaluate(async p=>{const {getCinematicView}=await import('/src/engine/cinematography.ts');const {getPainting}=await import('/src/data/paintings.ts');e.renderOfflineFrame(p,8,getCinematicView(getPainting('kanas'),p));return e.renderer.domElement.toDataURL('image/jpeg',.9)},p);await writeFile(`${out}/route-${p}.jpg`,Buffer.from(image.split(',')[1],'base64'));}
 await page.evaluate(()=>e.dispose());
 for(const [name,width,height] of [['desktop',1920,916],['mobile',390,844]]){
 await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5173/');await page.evaluate(()=>localStorage.setItem('ruhua.preferences.v1',JSON.stringify({painting:'kanas',sound:false})));await page.reload();await page.waitForFunction(()=>{const b=document.querySelector('.enter-button');return b&&!b.disabled});await page.getByRole('button',{name:'走进画中'}).click();await page.waitForTimeout(1800);await page.screenshot({path:`${out}/${name}-entered.png`});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error(`${name} overflow`);
 }
 await writeFile(`${out}/errors.json`,JSON.stringify(errors));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close()}
