import { chromium } from '@playwright/test';
import { mkdir, writeFile, rename, stat } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const short = process.argv.includes('--short');
const directory = resolve(process.env.OUTPUT_DIR ?? (short ? 'artifacts/wuhan-short-film-2026-10-18' : 'artifacts/wuhan-full-film-2026-10-18'));
const audit = process.argv.includes('--audit');
const fps = short ? 60 : 30, duration = short ? 20 : 150, frameCount = fps * duration;
const hashes = new Set();
const output = join(directory, short ? '桂雨东湖-20s-60fps.mp4' : '桂雨东湖-完整游览-150s.mp4');
const temporary = join(directory, 'wuhan.rendering.mp4');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const execute = promisify(execFile);
const options = { windowsHide: true, maxBuffer: 8 * 1024 * 1024 };
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [] });
const errors = [];
let encoder, completion, log = '';
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/wuhan-full-film', r => r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>@font-face{font-family:"Landscape Serif";src:url(/fonts/landscape-serif.woff2)}html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="stage"></div>'}));
  await page.goto(`${process.env.PREVIEW_URL ?? 'http://127.0.0.1:5174'}/wuhan-full-film`);
  const chapters = await page.evaluate(async ({duration, short}) => {
    const { Experience } = await import('/src/engine/Experience.ts');
    const { initialState } = await import('/src/state.ts');
    const { getPainting } = await import('/src/data/paintings.ts');
    const { renderSoundtrack } = await import('/src/engine/audio.ts');
    const painting = getPainting('wuhan');
    const fonts = await document.fonts.load('400 40px "Landscape Serif"', painting.shortTitle + painting.chapters.map(c => c.title).join(''));
    if (!fonts.length) throw Error('Film font did not load');
    const e = new Experience(document.getElementById('stage'), {...initialState,painting:'wuhan',quality:'high',entered:true,playing:false,sound:false,mode:'scroll',time:'journey'}, {onTelemetry(){},onError(m){throw Error(m);}});
    e.beginOfflineFilm(1920,1080);
    const ready=[];e.scene.traverse(o=>{if(o.userData.ready)ready.push(o.userData.ready);});await Promise.all(ready);
    await e.renderer.compileAsync(e.scene,e.camera);
    window.wuhanFilm = {
      frame(t) {
        // Full 0–100% journey, normal motion clock, with two seconds to settle and four to finish.
        const shot = Math.min(4, Math.floor(t / 4));
        const sourceTime = short ? [8,34,65,99,129][shot] + (t - shot * 4) : t;
        const progress = Math.min(1,Math.max(0,(sourceTime-2)/(short ? 144 : duration-6)));
        return e.renderOfflineFrame(progress,t);
      },
      async audio() {
        const blob=await renderSoundtrack('wuhan',duration);
        return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
      },
      close(){e.dispose();}
    };
    return painting.chapters.map((c,i)=>({title:c.title,progress:c.progress,time:short ? i*4 : 2+c.progress*(duration-6)}));
  }, {duration, short});
  if (audit) {
    for (const [i,t] of (short ? [0,4.5,8.5,12.5,16.5,19.9] : [0,32.24,63.92,97.04,127.28,149]).entries()) {
      const data=await page.evaluate(t=>window.wuhanFilm.frame(t),t);
      await writeFile(join(directory,`audit-${i+1}.jpg`),Buffer.from(data.split(',')[1],'base64'));
    }
    if(errors.length)throw Error(errors.join('\n'));
    await writeFile(join(directory,'audit.json'),JSON.stringify({chapters,errors},null,2));
    console.log('Six full-journey audit frames ready');
  } else {
    const audio=await page.evaluate(()=>window.wuhanFilm.audio());
    const wav=join(directory,'wuhan-soundtrack.wav');
    await writeFile(wav,Buffer.from(audio.split(',')[1],'base64'));
    encoder=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-framerate',String(fps),'-f','image2pipe','-vcodec','mjpeg','-i','pipe:0','-i',wav,'-t',String(duration),'-c:v','libx264','-crf',short?'21':'18',...(short?['-maxrate','10M','-bufsize','20M']:[]),'-preset','fast','-pix_fmt','yuv420p','-af','volume=12dB','-c:a','aac','-b:a','192k','-movflags','+faststart',temporary],{windowsHide:true,stdio:['pipe','ignore','pipe']});
    encoder.stderr.on('data',d=>log+=d);encoder.stdin.on('error',()=>{});completion=once(encoder,'close');
    for(let f=0;f<frameCount;f++) {
      const data=await page.evaluate(t=>window.wuhanFilm.frame(t),f/fps);
      const bytes=Buffer.from(data.split(',')[1],'base64');
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
      if(f%450===225)await writeFile(join(directory,`sample-${Math.floor(f/450)+1}.jpg`),bytes);
      if(!encoder.stdin.write(bytes))await once(encoder.stdin,'drain');
      if(f%450===0)console.log(`East Lake ${f}/${frameCount}`);
      if(errors.length)throw Error(errors.join('\n'));
    }
    encoder.stdin.end();const [code]=await completion;if(code!==0)throw Error(log);
    const probe=JSON.parse((await execute(process.env.FFPROBE??'ffprobe',['-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,channels,sample_rate:format=duration','-of','json',temporary],options)).stdout);
    const video=probe.streams.find(s=>s.codec_type==='video'),audioStream=probe.streams.find(s=>s.codec_type==='audio');
    if(Number(video?.nb_read_frames)!==frameCount || video.width!==1920 || video.height!==1080 || video.avg_frame_rate!==`${fps}/1` || !audioStream || Math.abs(Number(probe.format.duration)-duration)>.05)throw Error('Film verification failed');
    await execute(ffmpeg,['-hide_banner','-v','error','-i',temporary,'-f','null','-'],options);
    if(hashes.size !== frameCount)throw Error('Duplicate rendered frames');
    await rename(temporary,output);
    await writeFile(join(directory,'delivery.json'),JSON.stringify({output,chapters,mode:short?'five-chapter-highlights':'full-journey',uniqueFrames:hashes.size,probe,errors,bytes:(await stat(output)).size},null,2));
    console.log(output);
  }
  await page.evaluate(()=>window.wuhanFilm.close());
} finally {
  if(encoder && encoder.exitCode===null)encoder.kill();
  await browser.close();
}
