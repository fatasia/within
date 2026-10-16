import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/roadster-dance';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});
try{const page=await browser.newPage({viewport:{width:1400,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/roof-review',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:0}#stage{width:100vw;height:100vh}</style><div id="stage"></div>'}));await page.goto('http://127.0.0.1:5173/roof-review');
const results=await page.evaluate(async()=>{const {Experience}=await import('/src/engine/Experience.ts');const{initialState}=await import('/src/state.ts');const e=new Experience(document.getElementById('stage'),{...initialState,painting:'roadster'},{onTelemetry(){},onError(e){throw Error(e)}});try{
e.beginOfflineFilm(1400,950);await Promise.all(e.content.children.map(o=>o.userData.ready));e.triggerRoadster('dance');const view={eye:[-5,3.4,-6.5],target:[0,2,0]};e.renderOfflineFrame(0,0,view);
const shots=[{name:'roof-dance',png:e.renderer.domElement.toDataURL('image/png'),tri:e.renderer.info.render.triangles,calls:e.renderer.info.render.calls}];e.triggerRoadster('boost');e.renderOfflineFrame(0,1.1,{eye:[-6,5.5,-8],target:[0,3.6,0]});shots.push({name:'roof-jump',png:e.renderer.domElement.toDataURL('image/png'),tri:e.renderer.info.render.triangles,calls:e.renderer.info.render.calls});return shots;
}finally{e.dispose()}});for(const s of results)await writeFile(`${out}/${s.name}.png`,Buffer.from(s.png.split(',')[1],'base64'));console.log({errors,shots:results.map(({name,tri,calls})=>({name,tri,calls}))});if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close()}
