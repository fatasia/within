import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, join } from 'node:path';

// Audit first, select shots in selection.json, then render exactly 90 frames per scene.
// No old recordings or interpolated still images are used.
const audit = process.argv.includes('--audit');
const clipsOnly = process.argv.includes('--clips-only');
const assembleOnly = process.argv.includes('--assemble-only');
const directory = resolve(process.env.OUTPUT_DIR ?? 'artifacts/showreel-2026-10-16');
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173';
const execute = promisify(execFile);
const options = { windowsHide: true, maxBuffer: 8 * 1024 * 1024 };
const run = args => execute(process.env.FFMPEG ?? 'ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], options);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/showreel-render', route => route.fulfill({ contentType: 'text/html', body: '<style>@font-face{font-family:"Landscape Serif";src:url("/fonts/landscape-serif.woff2")}html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>' }));
  await page.goto(`${base}/showreel-render`);
  const catalog = await page.evaluate(async () => {
    const { PAINTINGS } = await import('/src/data/paintings.ts');
    return PAINTINGS.map(p => ({ id: p.id, title: p.shortTitle }));
  });
  const requested = process.env.PAINTINGS?.split(',');
  const defaults = {
    starry: .12, winter: .18, qingming: .12, wuhan: .1,
    qianli: .1, fuchun: .1, xishan: .1, empire: .48,
    zhangjiajie: .1, guilin: .1, arctic: .38, sakura: .15,
    dunhuang: .24, xihu: .38, kanas: 0, huangshan: .1, deepsea: .1, roadster: .1,
  };
  const manifestPath = join(directory, 'selection.json');
  let existing = [];
  try { existing = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const shots = audit
    ? catalog.filter(p => !requested || requested.includes(p.id)).map(p => existing.find(s => s.id === p.id) ?? ({ ...p, progress: defaults[p.id] ?? 0, selected: false, reason: '待目视筛选' }))
    : JSON.parse(await readFile(manifestPath, 'utf8')).filter(p => p.selected && (!requested || requested.includes(p.id)));
  if (!shots.length) throw new Error('No selected shots. Review selection.json first.');
  if (shots.some(s => s.timeMode && !['journey', 'day', 'sunset', 'night'].includes(s.timeMode)))
    throw new Error('Invalid timeMode in selection.json');
  const clips = [];
  for (const shot of shots) {
    if (assembleOnly) { clips.push(join(directory, `${shot.id}-3s.mp4`)); continue; }
    await page.evaluate(async shot => {
      const { Experience } = await import('/src/engine/Experience.ts');
      const { initialState } = await import('/src/state.ts');
      const { getPainting } = await import('/src/data/paintings.ts');
      const { getCinematicView } = await import('/src/engine/cinematography.ts');
      const { sampleSakuraVoyage } = await import('/src/engine/sakuraVoyage.ts');
      const { renderSoundtrack } = await import('/src/engine/audio.ts');
      await document.fonts.load('400 40px "Landscape Serif"', shot.title);
      const engine = new Experience(document.getElementById('stage'), { ...initialState, painting: shot.id, quality: 'high', entered: true }, { onTelemetry() {}, onError(m) { throw Error(m); } });
      await engine.ready;
      engine.beginOfflineFilm(1920, 1080);
      const ready = [];
      engine.scene.traverse(o => { if (o.userData.ready) ready.push(o.userData.ready); if (o.userData.sakuraAssetsReady) ready.push(o.userData.sakuraAssetsReady); });
      await Promise.all(ready);
      if (shot.action) engine.triggerRoadster(shot.action);
      const painting = getPainting(shot.id);
      const view = shot.view ?? (shot.overview ? painting.overview : getCinematicView(painting, shot.progress));
      const selectedTime = shot.time ?? (shot.id === 'arctic' ? 9 : 8);
      window.showreel = {
        frame(seconds, raw = false) {
          if (shot.timeMode) engine.state.time = shot.timeMode;
          const p = shot.id === 'sakura' ? shot.progress + seconds / 150 : shot.progress;
          const time = selectedTime + seconds;
          const shotView = shot.id === 'sakura' ? sampleSakuraVoyage(p, time) : {
            eye: [view.eye[0] + seconds * .25, view.eye[1], view.eye[2]], target: view.target,
          };
          if (shot.eyeOffset) shotView.eye = shotView.eye.map((v, i) => v + shot.eyeOffset[i]);
          if (shot.targetOffset) shotView.target = shotView.target.map((v, i) => v + shot.targetOffset[i]);
          const encoded = engine.renderOfflineFrame(p, time, shotView);
          return raw ? engine.renderer.domElement.toDataURL('image/jpeg', .92) : encoded;
        },
        async audio() { const blob = await renderSoundtrack(shot.id, 3); return Array.from(new Uint8Array(await blob.arrayBuffer())); },
        close() { engine.dispose(); },
      };
    }, shot);
    for (const [suffix, t] of [['start', 0], ['review', 1.5], ['end', 89/30]]) {
      const still = await page.evaluate(t => window.showreel.frame(t, true), t);
      await writeFile(join(directory, `${shot.id}-${suffix}.jpg`), Buffer.from(still.split(',')[1], 'base64'));
    }
    if (!audit) {
      const frames = join(directory, 'frames', shot.id); await mkdir(frames, { recursive: true });
      for (let f = 0; f < 90; f++) {
        const data = await page.evaluate(t => window.showreel.frame(t), f / 30);
        await writeFile(join(frames, `${String(f).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
      }
      const wav = shot.audio ? resolve(shot.audio) : join(directory, `${shot.id}.wav`);
      if (!shot.audio) await writeFile(wav, Buffer.from(await page.evaluate(() => window.showreel.audio())));
      const clip = join(directory, `${shot.id}-3s.mp4`);
      await run(['-framerate', '30', '-i', join(frames, '%04d.jpg'), '-ss', String(shot.audioStart ?? 0), '-i', wav, '-frames:v', '90', '-t', '3', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-af', 'afade=t=in:st=0:d=0.08,afade=t=out:st=2.85:d=0.15', '-c:a', 'aac', '-ar','48000','-ac','2','-b:a', '192k', '-movflags', '+faststart', clip]);
      clips.push(clip);
    }
    await page.evaluate(() => window.showreel.close());
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`${audit ? 'Review' : 'Rendered 3s'}: ${shot.id}`);
  }
  if (audit) {
    const merged = catalog.map(p => shots.find(s => s.id === p.id) ?? existing.find(s => s.id === p.id)).filter(Boolean);
    await writeFile(manifestPath, JSON.stringify(merged, null, 2));
    await writeFile(join(directory, 'review.html'), `<meta charset="utf-8"><style>body{margin:20px;background:#182126;color:white;font:16px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0}img{width:100%}figcaption{padding:8px}</style>${merged.map(s => `<figure><img src="${s.id}-review.jpg"><figcaption>${s.title} · ${s.id}</figcaption></figure>`).join('')}`);
  } else if (!clipsOnly) {
    const required = ['roadster','qingming','wuhan','starry','winter','arctic','xihu','deepsea','sakura'];
    if (required.some(id => !shots.some(s => s.id === id))) throw Error('Final delivery requires all nine mandatory scenes');
    if (new Set(shots.map(s => s.id)).size !== shots.length || shots.some(s => !catalog.some(p => p.id === s.id))) throw Error('Final delivery contains duplicate or unknown scenes');
    for (const clip of clips) {
      const info = JSON.parse((await execute(process.env.FFPROBE ?? 'ffprobe', ['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames:format=duration','-of','json',clip], options)).stdout);
      if (Number(info.streams[0]?.nb_read_frames) !== 90 || Math.abs(Number(info.format.duration)-3) > .1) throw Error(`Invalid 3-second clip: ${clip}`);
    }
    const list = join(directory, 'concat.txt');
    await writeFile(list, clips.map(p => `file '${p.replaceAll('\\', '/')}'`).join('\n'));
    const output = join(directory, `within-selected-${shots.length * 3}s.mp4`);
    await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);
    const probe = JSON.parse((await execute(process.env.FFPROBE ?? 'ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration', '-of', 'json', output], options)).stdout);
    const video = probe.streams.find(s => s.codec_type === 'video');
    if (Number(video.nb_read_frames) !== shots.length * 90 || Math.abs(Number(probe.format.duration) - shots.length * 3) > .15) throw new Error('Frame/duration verification failed');
    await writeFile(join(directory, 'delivery.json'), JSON.stringify({ output, duration: shots.length * 3, clips: shots.map((s, i) => ({ ...s, start: i * 3, duration: 3 })), probe, errors }, null, 2));
    console.log(output);
  }
} finally { await browser.close(); }
