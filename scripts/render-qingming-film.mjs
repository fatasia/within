import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { resolve, join } from 'node:path';
const directory = resolve(process.env.OUTPUT_DIR ?? 'artifacts/qingming-film-2026-10-16');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const execute = promisify(execFile);
const shots = [
  { title: '郊野 · 修船与农圃', eye: [-106, 11, 5], target: [-113, 4, -16] },
  { title: '汴河 · 舟运与货场', eye: [-90, 20, 26], target: [-73, 2, -1] },
  { title: '虹桥 · 临水街市', eye: [-42, 45, 32], target: [8, 3, -30] },
  { title: '城门 · 往来车马', eye: [34, 19, -29], target: [55, 11, -45] },
  { title: '驮队 · 行过长街', eye: [83, 6.6, -42.4], target: [75, 4.7, -46.2] },
  { title: '茶食 · 临街铺面', eye: [110, 6.5, -42], target: [109.6, 4.3, -52] },
  { title: '市井 · 街巷与院落', eye: [124, 46, 20], target: [95, 4, -42] },
];
if(process.env.DAY_NIGHT === '1') {
  shots[0]={title:'郊野 · 茅舍与行旅',eye:[-103,8,-20],target:[-110,4.8,-33]};
  shots[1]={title:'汴河 · 船工与货舟',eye:[-111,7,18],target:[-101,1.3,3]};
  shots[2]={title:'虹桥 · 桥市与舟运',eye:[-12,19,18],target:[-20,7,0]};
  shots[5].night=true;shots[5].title='茶食 · 夜市灯火';
  shots[6]={title:'茅檐 · 灯火人家',eye:[-103,8,-20],target:[-110,4.8,-33],night:true};
}
const duration = shots.length * 3,
  output = join(directory, process.env.OUTPUT_FILE ?? 'qingming-details-21s.mp4');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
});
const errors = [];
let encoder,
  completion,
  log = '';
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.route('**/qingming-film', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<style>@font-face{font-family:Landscape;src:url(/fonts/landscape-serif.woff2)}html,body,#stage{margin:0;width:100%;height:100%}</style><div id="stage"></div>',
    }),
  );
  await page.goto(`${process.env.PREVIEW_URL ?? 'http://127.0.0.1:5174'}/qingming-film`);
  await page.evaluate(
    async ({ shots, duration }) => {
      const { Experience } = await import('/src/engine/Experience.ts');
      const { initialState } = await import('/src/state.ts');
      const { renderSoundtrack } = await import('/src/engine/audio.ts');
      await document.fonts.load('400 32px Landscape', shots.map((s) => s.title).join(''));
      const e = new Experience(
        document.getElementById('stage'),
        { ...initialState, painting: 'qingming', quality: 'high' },
        {
          onTelemetry() {},
          onError(m) {
            throw Error(m);
          },
        },
      );
      e.beginOfflineFilm(1920, 1080);
      const ready = [];
      e.scene.traverse((o) => {
        if (o.userData.ready) ready.push(o.userData.ready);
      });
      await Promise.all(ready);
      await e.renderer.compileAsync(e.scene, e.camera);
      const film = document.createElement('canvas');
      film.width = 1920;
      film.height = 1080;
      const c = film.getContext('2d');
      window.qingmingFilm = {
        frame(t) {
          const i = Math.min(shots.length - 1, Math.floor(t / 3)),
            u = t - i * 3,
            shot = shots[i];
          // Dusk interpretation is explicitly authored per shot, not random journey lighting.
          e.state.time=shot.night?'night':'day';
          e.renderOfflineFrame(0.25, 8 + u, {
            eye: [shot.eye[0] + u * 0.2, shot.eye[1], shot.eye[2]],
            target: shot.target,
          });
          c.drawImage(e.renderer.domElement, 0, 0);
          const g = c.createLinearGradient(0, 900, 0, 1080);
          g.addColorStop(0, 'rgba(20,18,14,0)');
          g.addColorStop(1, 'rgba(20,18,14,.7)');
          c.fillStyle = g;
          c.fillRect(0, 900, 1920, 180);
          c.fillStyle = '#f2eddf';
          c.font = '32px Landscape';
          c.fillText(shot.title, 64, 1004);
          c.font = '15px Arial';
          c.fillStyle = '#d1c8b3';
          c.fillText('WITHIN  /  QINGMING  /  THREE-DIMENSIONAL INTERPRETATION', 64, 1040);
          return film.toDataURL('image/jpeg', 0.93);
        },
        async audio() {
          const b = await renderSoundtrack('qingming', duration);
          return Array.from(new Uint8Array(await b.arrayBuffer()));
        },
        close() {
          e.dispose();
        },
      };
    },
    { shots, duration },
  );
  const wav = join(directory, 'qingming.wav');
  await writeFile(wav, Buffer.from(await page.evaluate(() => window.qingmingFilm.audio())));
  encoder = spawn(
    ffmpeg,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-framerate',
      '30',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      '-i',
      'pipe:0',
      '-i',
      wav,
      '-t',
      String(duration),
      '-c:v',
      'libx264',
      '-crf',
      '18',
      '-preset',
      'fast',
      '-pix_fmt',
      'yuv420p',
      '-af',
      `afade=t=in:d=0.2,afade=t=out:st=${duration - 0.6}:d=0.6`,
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      output,
    ],
    { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] },
  );
  encoder.stderr.on('data', (d) => (log += d));
  encoder.stdin.on('error', () => {});
  completion = once(encoder, 'close');
  for (let f = 0; f < duration * 30; f++) {
    const data = await page.evaluate((t) => window.qingmingFilm.frame(t), f / 30);
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    if (f % 90 === 45)
      await writeFile(join(directory, `shot-${Math.floor(f / 90) + 1}.jpg`), bytes);
    if (!encoder.stdin.write(bytes)) await once(encoder.stdin, 'drain');
    if (f % 90 === 0) console.log(`Qingming ${f}/${duration * 30}`);
    if (errors.length) throw Error(errors.join('\n'));
  }
  await page.evaluate(() => window.qingmingFilm.close());
  encoder.stdin.end();
  const [code] = await completion;
  if (code !== 0) throw Error(log);
  const opts = { windowsHide: true, maxBuffer: 8 * 1024 * 1024 };
  const probe = JSON.parse(
    (
      await execute(
        process.env.FFPROBE ?? 'ffprobe',
        [
          '-v',
          'error',
          '-count_frames',
          '-show_entries',
          'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration',
          '-of',
          'json',
          output,
        ],
        opts,
      )
    ).stdout,
  );
  await execute(ffmpeg, ['-hide_banner', '-v', 'error', '-i', output, '-f', 'null', '-'], opts);
  if (Number(probe.streams.find((s) => s.codec_type === 'video')?.nb_read_frames) !== duration * 30)
    throw Error('Incomplete film');
  await writeFile(
    join(directory, 'delivery.json'),
    JSON.stringify({ output, shots, probe, errors }, null, 2),
  );
  console.log(output);
} finally {
  if (encoder && !encoder.stdin.destroyed) encoder.stdin.end();
  await browser.close();
}
