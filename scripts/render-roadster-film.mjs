import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve,join} from 'node:path';
import {once} from 'node:events';
const directory=resolve('artifacts/roadster-film-2026-10-16'),audit=process.argv.includes('--audit');
const fps=30,beat=60/138,segment=16*beat,duration=128*beat,frames=Math.ceil(duration*fps);
await mkdir(directory,{recursive:true});
const execute=promisify(execFile),options={windowsHide:true,maxBuffer:16*1024*1024};
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});
const errors=[];let encoder,encoding,log='';
try{
const page=await browser.newPage({viewport:{width:1920,height:1080}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/roadster-film',r=>r.fulfill({contentType:'text/html',body:'<style>@font-face{font-family:Landscape;src:url(/fonts/landscape-serif.woff2)}html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>'}));
await page.goto('http://127.0.0.1:5173/roadster-film');
await page.evaluate(async({segment})=>{
const{Experience}=await import('/src/engine/Experience.ts');const{initialState}=await import('/src/state.ts');
const e=new Experience(document.getElementById('stage'),{...initialState,painting:'roadster',quality:'high',entered:true,playing:false},{onTelemetry(){},onError(m){throw Error(m)}});
e.beginOfflineFilm(1920,1080);await Promise.all(e.content.children.map(o=>o.userData.ready));await e.renderer.compileAsync(e.scene,e.camera);
const world=e.content.children.find(o=>o.userData.setDriveInput);if(!world)throw Error('Roadster driving interface missing');
const film=document.createElement('canvas');film.width=1920;film.height=1080;const ctx=film.getContext('2d');
let currentStage=-1,boosted=false,dancing=false;const records=[];
const labels=['THE REVEAL','PAINT / THREE FINISHES','DRIVE / RAIN-SOAKED STREETS','FROM THE DRIVER’S SEAT','GRIP / CORNERING','COLD-GAS / FANTASY DEMO','MUSK / ROOFTOP DANCE','NEON / AFTER HOURS'];
const paints=['#aeb4bc','#be162f','#174995'];
window.roadsterFilm={frame(t,draw=true){
const stage=Math.min(7,Math.floor(t/segment)),u=(t-stage*segment)/segment;
if(stage!==currentStage){
 if(stage===2)world.userData.setDriveInput({throttle:.3,steer:0,brake:0});
 if(stage===3)world.userData.setCockpitView(true);
 if(stage===4){world.userData.setCockpitView(false);world.userData.triggerGrip();}
 if(stage===5){world.userData.clearDriveInput();world.userData.resetVehicle();world.userData.setPaint('#aeb4bc');boosted=false;}
 if(stage===6&&!dancing){world.userData.triggerDance();dancing=true;}
 records.push({stage,time:t,drive:world.userData.getDriveState()});currentStage=stage;
}
if(stage===1)world.userData.setPaint(paints[Math.min(2,Math.floor(u*3))]);
if(stage===3)world.userData.setDriveInput({throttle:.15,steer:0,brake:0});
if(stage===4)world.userData.setDriveInput({throttle:.08,steer:.13,brake:u>.65?.18:0});
if(stage===5&&u>.16&&!boosted){world.userData.triggerBoost();boosted=true;}
world.userData.danceTime=t;world.userData.update(t,1);
if(!draw)return null;
const m=world.userData.getDriveState(),h=m.rotation[1],p=m.position,lift=world.userData.getVehicleLift();
const point=(x,y,z)=>[p[0]+x*Math.cos(h)+z*Math.sin(h),p[1]+y,p[2]-x*Math.sin(h)+z*Math.cos(h)];
let eye,target;
if(stage===0){const a=-.72+u*1.25;eye=point(Math.sin(a)*7.8,2.5,-Math.cos(a)*7.8);target=point(0,.66,0);}
if(stage===1){const a=.55+u*1.5;eye=point(Math.sin(a)*7.4,2.8,-Math.cos(a)*7.4);target=point(0,.65,0);}
if(stage===2){eye=point(-5.5,2.8,8);target=point(0,.8,-1.3);}
if(stage===3){eye=m.cockpitEye;target=m.cockpitTarget;}
if(stage===4){eye=point(-6.4,4.1,8.2);target=point(0,.65,-1);}
if(stage===5){eye=point(-6,3.2+lift*.3,-7);target=point(0,.8+lift*.7,0);}
if(stage===6){eye=point(-2.4+u*.8,3,-4.4);target=point(0,1.65,0);}
if(stage===7){eye=point(-3-u*2,4+u*8,9+u*11);target=point(0,1.4,-3*u);}
e.camera.fov=stage===3?64:39;e.camera.updateProjectionMatrix();
e.renderOfflineFrame(0,t,{eye,target});if(stage===3){world.userData.setCockpitView(true);e.renderer.render(e.scene,e.camera);}ctx.drawImage(e.renderer.domElement,0,0);
const gradient=ctx.createLinearGradient(0,880,0,1080);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,'rgba(0,0,0,.56)');ctx.fillStyle=gradient;ctx.fillRect(0,880,1920,200);
ctx.fillStyle='#f3f1ed';ctx.font='500 24px Arial';ctx.fillText('ROADSTER  /  '+labels[stage],62,996);
ctx.font='15px Arial';ctx.fillStyle='#cbd0d2';ctx.fillText('WITHIN   ·   REFERENCE-BUILT SCENE   ·   INTERACTIVE DEMONSTRATION',62,1030);
if(stage===5){ctx.textAlign='right';ctx.fillText('Fictional boost demonstration — not measured vehicle capability',1858,1030);ctx.textAlign='left';}
return film.toDataURL('image/jpeg',.93);
},close(){const result={records,finalDrive:world.userData.getDriveState()};e.dispose();return result}};
},{segment});
if(!audit){encoder=spawn(process.env.FFMPEG??'ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate',String(fps),'-f','image2pipe','-vcodec','mjpeg','-i','pipe:0','-stream_loop','-1','-i',resolve('public/audio/roadster-vadoka-chorus.mp3'),'-t',String(duration),'-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-af',`afade=t=out:st=${duration-.65}:d=0.65`,'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',join(directory,'roadster-full.mp4')],{windowsHide:true,stdio:['pipe','ignore','pipe']});encoder.stderr.on('data',d=>{log+=d;process.stderr.write(d)});encoding=once(encoder,'close');encoder.stdin.on('error',()=>{});}
const reviewFrames=new Map();for(let s=0;s<8;s++)reviewFrames.set(Math.round((s+.5)*segment*fps),`shot-${s+1}`);reviewFrames.set(Math.round((5*segment+2)*fps),'boost-peak');reviewFrames.set(0,'start');reviewFrames.set(frames-1,'end');
for(let frame=0;frame<frames;frame++){
 const save=reviewFrames.get(frame),draw=!audit||!!save;
 const data=await page.evaluate(({t,draw})=>window.roadsterFilm.frame(t,draw),{t:frame/fps,draw});
 if(data){const bytes=Buffer.from(data.split(',')[1],'base64');if(save)await writeFile(join(directory,`${save}.jpg`),bytes);if(!audit&&!encoder.stdin.write(bytes))await once(encoder.stdin,'drain');}
 if(frame%210===0)console.log(`${audit?'audit':'render'} ${frame}/${frames}`);
 if(errors.length)throw Error(errors.join('\n'));
}
const telemetry=await page.evaluate(()=>window.roadsterFilm.close());
if(!audit){encoder.stdin.end();const[code]=await encoding;if(code!==0)throw Error(log);const output=join(directory,'roadster-full.mp4');const probe=JSON.parse((await execute('ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration','-of','json',output],options)).stdout);await execute('ffmpeg',['-hide_banner','-v','error','-i',output,'-f','null','-'],options);await writeFile(join(directory,'delivery.json'),JSON.stringify({output,duration,fps,bpm:138,segments:8,errors,telemetry,probe},null,2));console.log(output);}
else await writeFile(join(directory,'audit.json'),JSON.stringify({duration,errors,telemetry},null,2));
}finally{if(encoder&&!encoder.stdin.destroyed)encoder.stdin.end();await browser.close()}
