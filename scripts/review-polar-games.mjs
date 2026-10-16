import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const directory='artifacts/polar-games';await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/polar-games',r=>r.fulfill({contentType:'text/html',body:'<style>html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>'}));await page.goto('http://127.0.0.1:5173/polar-games');
 const shots=await page.evaluate(async()=>{
  const {Experience}=await import('/src/engine/Experience.ts');const {initialState}=await import('/src/state.ts');const engine=new Experience(document.getElementById('stage'),{...initialState,painting:'arctic'},{onTelemetry(){},onError(m){throw Error(m)}});engine.beginOfflineFilm(1280,800);const result=[];
  try{
   const views={sports:{eye:[8,4.4,24],target:[6.5,1.2,13]},chase:{eye:[-3,6.5,31],target:[-13,1.5,15]}};
   for(const [name,times] of [['sports',[.5,1.9,2.8,4.5,10.6]],['chase',[27,30,34,38,43,47]]])for(const t of times){engine.renderOfflineFrame(.38,t,views[name]);result.push({name:`${name}-${t}`,image:engine.renderer.domElement.toDataURL('image/png'),calls:engine.renderer.info.render.calls,triangles:engine.renderer.info.render.triangles});}
   // A 12s WebM (sports 1x, chase 2x): first ball kick/throw, then the oval chase.
   const stream=engine.renderer.domElement.captureStream(24),chunks=[];
   const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000});const done=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=resolve});recorder.start();
   const start=performance.now();await new Promise(resolve=>{const draw=()=>{const elapsed=(performance.now()-start)/1000;if(elapsed>=12){resolve();return}engine.renderOfflineFrame(.38,elapsed<4?elapsed:27+(elapsed-4)*2,elapsed<4?views.sports:views.chase);requestAnimationFrame(draw)};draw()});recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
   const video=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}))});return {result,video};
  }finally{engine.dispose()}
 });
 for(const s of shots.result)await writeFile(`${directory}/${s.name}.png`,Buffer.from(s.image.split(',')[1],'base64'));
 await writeFile(`${directory}/penguin-games-and-chase.webm`,Buffer.from(shots.video.split(',')[1],'base64'));
 await writeFile(`${directory}/metrics.json`,JSON.stringify({errors,shots:shots.result.map(({image,...rest})=>rest)},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(`Saved ${shots.result.length} frames and 12 second video`);
}finally{await browser.close()}

