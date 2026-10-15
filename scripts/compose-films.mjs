import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const folder = resolve(
  process.env.OUTPUT_DIR ?? fileURLToPath(new URL('../artifacts/delivery', import.meta.url)),
);
const ids = [
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
const starts = { winter: 3, qingming: 3, empire: 4 };
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const ffprobe = process.env.FFPROBE ?? 'ffprobe';
const options = { windowsHide: true, maxBuffer: 10 * 1024 * 1024 };
const run = (args) =>
  execute(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], options);
const inspect = async (file) =>
  JSON.parse(
    (
      await execute(
        ffprobe,
        [
          '-v',
          'error',
          '-count_frames',
          '-show_entries',
          'format=duration:stream=codec_type,codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames,duration,channels,sample_rate',
          '-of',
          'json',
          file,
        ],
        options,
      )
    ).stdout,
  );
const clips = join(folder, 'clips');
await mkdir(clips, { recursive: true });
const edit = [];
for (const [index, id] of ids.entries()) {
  const source = join(folder, `${id}.mp4`);
  const manifest = JSON.parse(await readFile(join(folder, `${id}.probe.json`), 'utf8'));
  if (
    manifest.frames !== 300 ||
    manifest.width !== 1920 ||
    manifest.height !== 1080 ||
    Math.abs(manifest.durationSeconds - 10) > 0.034
  )
    throw new Error(`${id}: expected a verified 10-second 1080p/30 source`);
  const start = starts[id] ?? 0;
  const clip = join(clips, `${String(index + 1).padStart(2, '0')}-${id}.mp4`);
  await run([
    '-i',
    source,
    '-ss',
    String(start),
    '-t',
    '3',
    '-map',
    '0:v:0',
    '-map',
    '0:a:0',
    '-vf',
    'setpts=PTS-STARTPTS',
    '-af',
    'asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.1,afade=t=out:st=2.9:d=0.1',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-r',
    '30',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    clip,
  ]);
  const probe = await inspect(clip);
  if (Number(probe.streams.find((s) => s.codec_type === 'video')?.nb_read_frames) !== 90)
    throw new Error(`${id}: excerpt is not exactly 90 frames`);
  edit.push({
    painting: id,
    source,
    sourceStart: start,
    duration: 3,
    timelineStart: index * 3,
    clip,
  });
}
const list = join(clips, 'concat.txt');
await writeFile(
  list,
  edit
    .map(({ clip }) => `file '${clip.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`)
    .join('\n'),
);
const temporary = join(folder, 'within-all-worlds-30s.rendering.mp4');
await run([
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  list,
  '-vf',
  'setpts=N/(30*TB)',
  '-af',
  'aresample=async=1:first_pts=0',
  '-frames:v',
  '900',
  '-t',
  '30',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '18',
  '-pix_fmt',
  'yuv420p',
  '-r',
  '30',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-ar',
  '48000',
  '-ac',
  '2',
  '-movflags',
  '+faststart',
  temporary,
]);
const probe = await inspect(temporary);
const video = probe.streams.find((s) => s.codec_type === 'video');
const audio = probe.streams.find((s) => s.codec_type === 'audio');
if (
  Number(video?.nb_read_frames) !== 900 ||
  video.avg_frame_rate !== '30/1' ||
  video.width !== 1920 ||
  video.height !== 1080 ||
  Math.abs(Number(probe.format.duration) - 30) > 0.034 ||
  !audio ||
  Math.abs(Number(audio.duration) - 30) > 0.05
)
  throw new Error(`Compilation failed verification: ${JSON.stringify(probe)}`);
const destination = join(folder, 'within-all-worlds-30s.mp4');
await rename(temporary, destination);
await run([
  '-i',
  destination,
  '-vf',
  'fps=1/3,scale=480:-2,tile=5x2',
  '-frames:v',
  '1',
  '-q:v',
  '2',
  join(folder, 'within-all-worlds-contact.jpg'),
]);
await writeFile(
  join(folder, 'within-all-worlds-30s.probe.json'),
  JSON.stringify(
    { output: destination, probe, edit, verifiedAt: new Date().toISOString() },
    null,
    2,
  ),
);
console.log(`Verified 10 excerpts, 900 frames, 30 seconds: ${destination}`);
