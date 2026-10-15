/* global window */
import { chromium } from '@playwright/test';
import process from 'node:process';
import console from 'node:console';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { join, resolve } from 'node:path';

const execute = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));
const collection = [
  'starry',
  'winter',
  'qingming',
  'wuhan',
  'qianli',
  'fuchun',
  'xishan',
  'empire',
  'zhangjiajie',
  'guilin',
];
const paintings = process.env.PAINTINGS
  ? [
      ...new Set(
        process.env.PAINTINGS.split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ]
  : collection;
if (!paintings.length || paintings.some((id) => !collection.includes(id))) {
  throw new Error(`PAINTINGS must contain comma-separated IDs: ${collection.join(', ')}`);
}
const quality = process.env.QUALITY ?? 'high';
if (!['low', 'balanced', 'high'].includes(quality)) throw new Error('Invalid QUALITY');
const fps = Number(process.env.FPS ?? 30);
const duration = Number(process.env.DURATION ?? 10);
if (!Number.isInteger(fps) || fps < 12 || fps > 60)
  throw new Error('FPS must be an integer from 12 to 60');
if (!Number.isFinite(duration) || duration < 1 || duration > 120)
  throw new Error('DURATION must be from 1 to 120 seconds');
const frameCount = Math.round(duration * fps);
if (Math.abs(frameCount / fps - duration) > 0.000001) {
  throw new Error('DURATION multiplied by FPS must produce a whole number of frames');
}
const portraitValue = (process.env.PORTRAIT ?? '0').toLowerCase();
if (!['0', '1', 'false', 'true'].includes(portraitValue)) throw new Error('Invalid PORTRAIT');
const portrait = ['1', 'true'].includes(portraitValue);
const width = portrait ? 1080 : 1920,
  height = portrait ? 1920 : 1080;
const output = process.env.OUTPUT_DIR
  ? resolve(process.env.OUTPUT_DIR)
  : join(repository, 'artifacts/videos');
const previewUrl = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173';
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE ?? 'ffprobe';
const processOptions = { windowsHide: true, maxBuffer: 10 * 1024 * 1024 };
await execute(ffmpeg, ['-version'], processOptions);
await execute(ffprobe, ['-version'], processOptions);

// A separate Vite-served page creates exactly one engine. It never mounts React
// or the normal gallery, so no second animation loop competes for the GPU.
const fixture = join(repository, 'artifacts/render.html');
await mkdir(join(repository, 'artifacts'), { recursive: true });
await mkdir(output, { recursive: true });
await writeFile(
  fixture,
  `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>Offline film renderer</title>
<style>
@font-face{font-family:'Landscape Serif';src:url('/fonts/landscape-serif.woff2') format('woff2');font-weight:200 900;font-display:block}
html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden;background:#18282d}
canvas{display:block}
</style></head><body><div id="stage"></div><script type="module">
import { Experience } from '/src/engine/Experience.ts';
import { initialState } from '/src/state.ts';
import { renderSoundtrack } from '/src/engine/audio.ts';
import { getFilmShot } from '/src/engine/filmTimeline.ts';
import { getPainting } from '/src/data/paintings.ts';
let experience = null;
let currentPainting = null;
window.offlineFilm = {
  async start(options) {
    if (experience) { experience.dispose(); experience = null; }
    const fonts = await document.fonts.load('400 40px "Landscape Serif"', '千里江山富春溪山行旅星月夜帝国山中冬夜清明上河桂林漓江张家界武汉桂雨东湖');
    if (!fonts.length) throw new Error('Landscape Serif did not load');
    await document.fonts.ready;
    experience = new Experience(document.getElementById('stage'), {
      ...initialState, painting:options.painting, quality:options.quality,
      entered:true, playing:false, sound:false, mode:'scroll', time:'journey'
    }, { onTelemetry() {}, onError(message) { throw new Error(message); } });
    for (const method of ['beginOfflineFilm','renderOfflineFrame','endOfflineFilm']) {
      if (typeof experience[method] !== 'function') throw new Error('Missing offline renderer API: ' + method);
    }
    experience.beginOfflineFilm(options.width, options.height);
    currentPainting = getPainting(options.painting);
  },
  frame(time, duration) {
    const shot = getFilmShot(currentPainting, time, duration);
    return experience.renderOfflineFrame(shot.progress, time, shot.view);
  },
  async soundtrack(painting, duration) {
    const blob = await renderSoundtrack(painting, duration);
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read the soundtrack'));
      reader.readAsDataURL(blob);
    });
  },
  stop() {
    if (experience) { experience.endOfflineFilm(); experience.dispose(); experience = null; }
  }
};
</script></body></html>`,
);

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
const probe = async (path) => {
  const { stdout } = await execute(
    ffprobe,
    [
      '-v',
      'error',
      '-count_frames',
      '-show_entries',
      'format=duration:stream=codec_type,codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames,channels,sample_rate,duration,bit_rate',
      '-of',
      'json',
      path,
    ],
    processOptions,
  );
  return JSON.parse(stdout);
};
const results = [];
try {
  await page.goto(new URL('/artifacts/render.html', previewUrl).href);
  await page.waitForFunction(() => Boolean(window.offlineFilm), undefined, { timeout: 30000 });
  for (const painting of paintings) {
    const stem = `${painting}${portrait ? '-portrait' : ''}`;
    const startedAt = new Date();
    const frameDirectory = join(output, 'frames', `${stem}-${startedAt.getTime()}`);
    const frameHashes = new Set();
    await mkdir(frameDirectory, { recursive: true });
    await page.evaluate(
      async (options) => {
        await window.offlineFilm.start(options);
      },
      { painting, quality, width, height },
    );
    console.log(`Rendering ${stem}: ${frameCount} scheduled frames, ${fps} fps, ${duration} s`);
    for (let frame = 0; frame < frameCount; frame++) {
      const data = await page.evaluate(
        ({ time, duration }) => window.offlineFilm.frame(time, duration),
        {
          time: frame / fps,
          duration,
        },
      );
      if (errors.length) throw new Error(`${stem}: browser errors:\n${errors.join('\n')}`);
      if (typeof data !== 'string' || !data.startsWith('data:image/jpeg;base64,')) {
        throw new Error(`${stem} frame ${frame}: API did not return a JPEG data URL`);
      }
      const bytes = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
      if (bytes.length < 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
        throw new Error(`${stem} frame ${frame}: invalid or empty JPEG`);
      }
      frameHashes.add(createHash('sha256').update(bytes).digest('hex'));
      await writeFile(join(frameDirectory, `frame-${String(frame).padStart(6, '0')}.jpg`), bytes);
      if ((frame + 1) % (fps * 2) === 0 || frame === frameCount - 1) {
        console.log(
          `${stem}: ${frame + 1}/${frameCount} frames (${((Date.now() - startedAt.getTime()) / 1000).toFixed(1)} s elapsed)`,
        );
      }
    }
    if (frameHashes.size < 2) throw new Error(`${stem}: all rendered frames are identical`);
    await page.evaluate(() => window.offlineFilm.stop());
    const soundtrackData = await page.evaluate(
      ({ painting, duration }) => window.offlineFilm.soundtrack(painting, duration),
      { painting, duration },
    );
    if (errors.length) throw new Error(`${stem}: browser errors:\n${errors.join('\n')}`);
    if (
      typeof soundtrackData !== 'string' ||
      !soundtrackData.startsWith('data:audio/wav;base64,')
    ) {
      throw new Error(`${stem}: soundtrack API did not return a WAV data URL`);
    }
    const soundtrackBytes = Buffer.from(
      soundtrackData.slice(soundtrackData.indexOf(',') + 1),
      'base64',
    );
    const expectedSamples = Math.ceil(duration * 48000) * 2;
    if (
      soundtrackBytes.length !== 44 + expectedSamples * 2 ||
      soundtrackBytes.toString('ascii', 0, 4) !== 'RIFF' ||
      soundtrackBytes.toString('ascii', 8, 12) !== 'WAVE' ||
      soundtrackBytes.readUInt16LE(20) !== 1 ||
      soundtrackBytes.readUInt16LE(22) !== 2 ||
      soundtrackBytes.readUInt32LE(24) !== 48000 ||
      soundtrackBytes.readUInt16LE(34) !== 16
    ) {
      throw new Error(`${stem}: invalid stereo 48 kHz PCM soundtrack`);
    }
    let squaredAmplitude = 0;
    let peakAmplitude = 0;
    for (let offset = 44; offset < soundtrackBytes.length; offset += 2) {
      const value = soundtrackBytes.readInt16LE(offset) / 32768;
      squaredAmplitude += value * value;
      peakAmplitude = Math.max(peakAmplitude, Math.abs(value));
    }
    const rmsAmplitude = Math.sqrt(squaredAmplitude / expectedSamples);
    if (rmsAmplitude < 0.00001 || peakAmplitude >= 1) {
      throw new Error(
        `${stem}: soundtrack is silent or clipped (RMS ${rmsAmplitude}, peak ${peakAmplitude})`,
      );
    }
    const soundtrackPath = join(output, `${stem}.wav`);
    await writeFile(soundtrackPath, soundtrackBytes);
    const destination = join(output, `${stem}.mp4`);
    const temporary = join(output, `${stem}.rendering.mp4`);
    await execute(
      ffmpeg,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-framerate',
        String(fps),
        '-start_number',
        '0',
        '-i',
        join(frameDirectory, 'frame-%06d.jpg'),
        '-i',
        soundtrackPath,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-frames:v',
        String(frameCount),
        '-vf',
        'scale=in_range=auto:out_range=tv,format=yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '18',
        '-color_range',
        'tv',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ac',
        '2',
        '-ar',
        '48000',
        '-t',
        String(duration),
        '-movflags',
        '+faststart',
        temporary,
      ],
      processOptions,
    );
    const metadata = await probe(temporary);
    const stream = metadata.streams.find((item) => item.codec_type === 'video');
    const audioStream = metadata.streams.find((item) => item.codec_type === 'audio');
    if (
      !stream ||
      stream.codec_name !== 'h264' ||
      stream.pix_fmt !== 'yuv420p' ||
      stream.width !== width ||
      stream.height !== height ||
      stream.avg_frame_rate !== `${fps}/1` ||
      Number(stream.nb_read_frames) !== frameCount ||
      Math.abs(Number(metadata.format.duration) - duration) > 1 / fps
    ) {
      throw new Error(`${stem}: encoded video verification failed: ${JSON.stringify(metadata)}`);
    }
    if (
      !audioStream ||
      audioStream.codec_name !== 'aac' ||
      audioStream.channels !== 2 ||
      Number(audioStream.sample_rate) !== 48000 ||
      !Number.isFinite(Number(audioStream.duration)) ||
      Math.abs(Number(audioStream.duration) - duration) > 0.05 ||
      Number(audioStream.nb_read_frames) < 1
    ) {
      throw new Error(
        `${stem}: encoded soundtrack verification failed: ${JSON.stringify(metadata)}`,
      );
    }
    // Write the validated output; keep every source JPEG for repeatable encoding.
    await rename(temporary, destination);
    const samples = [0.08, 0.24, 0.4, 0.56, 0.75, 0.94].map((fraction) =>
      Math.floor(fraction * (frameCount - 1)),
    );
    const select = samples.map((frame) => `eq(n\\,${frame})`).join('+');
    const contactSheet = join(output, `${stem}-contact.jpg`);
    await execute(
      ffmpeg,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        destination,
        '-vf',
        `select=${select},scale=480:-2,tile=3x2`,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        contactSheet,
      ],
      processOptions,
    );
    const manifest = {
      painting,
      portrait,
      quality,
      method: 'deterministic-offline-frames',
      width,
      height,
      sourceFrames: frameCount,
      uniqueSourceFrames: frameHashes.size,
      sourceAverageFramesPerSecond: fps,
      durationSeconds: Number(metadata.format.duration),
      frameRate: stream.avg_frame_rate,
      codec: stream.codec_name,
      pixelFormat: stream.pix_fmt,
      frames: Number(stream.nb_read_frames),
      audio: {
        codec: audioStream.codec_name,
        channels: audioStream.channels,
        sampleRate: Number(audioStream.sample_rate),
        targetBitrate: 192000,
        encodedBitrate: Number(audioStream.bit_rate),
        durationSeconds: Number(audioStream.duration),
        sourceRms: rmsAmplitude,
        sourcePeak: peakAmplitude,
        source: soundtrackPath,
      },
      bytes: (await stat(destination)).size,
      output: destination,
      frameDirectory,
      contactSheet,
      startedAt: startedAt.toISOString(),
      verifiedAt: new Date().toISOString(),
    };
    await writeFile(join(output, `${stem}.probe.json`), JSON.stringify(manifest, null, 2));
    results.push(manifest);
    console.log(`Verified ${stem}: ${duration} s, ${frameCount} frames → ${destination}`);
  }
} finally {
  await page.evaluate(() => window.offlineFilm?.stop()).catch(() => {});
  await browser.close();
}
console.table(
  results.map(({ painting, durationSeconds, frames, frameRate, bytes }) => ({
    painting,
    durationSeconds,
    frames,
    frameRate,
    MiB: (bytes / 1048576).toFixed(2),
  })),
);
