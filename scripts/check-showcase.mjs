import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const videoIds = [...readme.matchAll(/^https:\/\/github\.com\/user-attachments\/assets\/([\da-f-]+)\r?$/gm)].map(match => match[1]);
assert.deepEqual(videoIds, [
  'c491c230-71bc-4980-a466-2a5cca9b4891',
  '2d096181-0984-41db-a7f1-de93d850a728',
  '679f51de-3862-4c68-82e4-010332a3c0c1',
  '2715aa01-13d7-4217-88d4-210a8933f02a',
]);
assert.match(readme, /### 十二景精选[\s\S]*### Roadster[\s\S]*### 清明上河[\s\S]*### 桂雨东湖/);
assert.ok(!readme.includes('新版'));
assert.ok(!readme.includes('五章精选'));
assert.ok(!readme.includes('| 视频'));
const root = fileURLToPath(new URL('../', import.meta.url));
for (const file of ['README.md', 'docs/PROJECT.md', 'docs/SCENES.md', 'docs/ORIGINALS.md', 'docs/sakura-reference.md', 'docs/roadster-music.md', 'docs/video-directory.md']) {
  const content = await readFile(resolve(root, file), 'utf8');
  for (const [, target] of content.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#|<https?:)/.test(target)) continue;
    assert.ok(existsSync(resolve(root, dirname(file), target.split('#')[0])), `${file}: missing ${target}`);
  }
}
const html = await readFile(new URL('../public/showcase/index.html', import.meta.url), 'utf8');
assert.match(html, /<video[\s\S]*?controls[\s\S]*?playsinline/);
assert.match(html, /src="within-selected-36s.mp4\?v=20261019"/);
assert.equal((html.match(/<video\b/g) ?? []).length, 1);
const video = await stat(new URL('../public/showcase/within-selected-36s.mp4', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../public/showcase/manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.file, 'within-selected-36s.mp4');
assert.equal(manifest.updatedClip, 'qingming');
assert.equal(manifest.unchangedClips.length, 11);
assert.equal(manifest.frames, 1080);
assert.equal(manifest.width, 1920);
assert.equal(manifest.height, 1080);
assert.equal(manifest.fps, 30);
assert.equal(video.size, manifest.bytes);
const digest = createHash('sha256').update(await readFile(new URL('../public/showcase/within-selected-36s.mp4', import.meta.url))).digest('hex');
assert.equal(digest, manifest.sha256);
console.log('Four README video embeds, document links, standalone player and local MP4 verified.');
