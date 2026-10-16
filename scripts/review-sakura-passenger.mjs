import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const dir='artifacts/sakura-passenger'; await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});
try {const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/sakura-review',r=>r.fulfill({contentType:'text/html',body:'<style>html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>'}));
await page.goto('http://127.0.0.1:5173/sakura-review');
const data=await page.evaluate(async()=>{
const {sampleSakuraVoyage,sampleSakuraPassengerView}=await import('/src/engine/sakuraVoyage.ts');const {Experience}=await import('/src/engine/Experience.ts');const {initialState}=await import('/src/state.ts');const {getPainting}=await import('/src/data/paintings.ts');
const engine=new Experience(document.getElementById('stage'),{...initialState,painting:'sakura'},{onTelemetry(){},onError(m){throw Error(m);}});
try{engine.beginOfflineFilm(1600,1000);engine.scene.traverse(o=>o.userData.prepareAssets?.(engine.renderer));const ready=[];engine.scene.traverse(o=>{if(o.userData.sakuraAssetsReady)ready.push(o.userData.sakuraAssetsReady)});await Promise.all(ready);
const views=[['passenger-forward',sampleSakuraPassengerView(.25,3),.25,3,true],['passenger-right',sampleSakuraPassengerView(.25,3,.8),.25,3,true],['passenger-down',sampleSakuraPassengerView(.25,3,0,-.5),.25,3,true],['boatman-stroke-0',{eye:[6,3,-1],target:[0,1,-5]},.25,0,false],['boatman-stroke-1',{eye:[6,3,-1],target:[0,1,-5]},.25,1,false]];
const shots = views.map(([name,view,p,t,passenger])=>{engine.scene.traverse(o=>o.userData.setVoyageProgress?.(p));engine.renderOfflineFrame(p,t,view);engine.scene.traverse(o=>o.userData.setPassengerView?.(!!passenger));engine.renderer.render(engine.scene,engine.camera);return{name,image:engine.renderer.domElement.toDataURL('image/png'),render:{...engine.renderer.info.render},memory:{...engine.renderer.info.memory}}});
engine.renderOfflineFrame(.2,0,views[1][1]);
const times=[];const gl=engine.renderer.getContext();const pixel=new Uint8Array(4);
for(let i=0;i<70;i++){const started=performance.now();engine.featured?.(i/30,0);engine.renderer.info.reset();engine.renderer.render(engine.scene,engine.camera);gl.readPixels(800,500,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);if(i>=10)times.push(performance.now()-started);}
times.sort((a,b)=>a-b);
const extension=gl.getExtension('WEBGL_debug_renderer_info');
return {shots,performance:{width:1600,height:1000,samples:times.length,medianMs:times[30],p95Ms:times[57],gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable',note:'CPU render submission plus forced one-pixel GPU readback; includes reflector, excludes JPEG encoding and rAF wait.'}};
}finally{engine.dispose();}});
for(const s of data.shots)await writeFile(`${dir}/${s.name}.png`,Buffer.from(s.image.split(',')[1],'base64'));await writeFile(`${dir}/performance.json`,JSON.stringify(data.performance,null,2));await writeFile(`${dir}/metrics.json`,JSON.stringify(data.shots.map(({image,...s})=>s),null,2));await writeFile(`${dir}/errors.json`,JSON.stringify(errors,null,2));console.log(JSON.stringify({performance:data.performance,metrics:data.shots.map(({image,...s})=>s),errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();}
