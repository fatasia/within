import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const rows = readme
  .split('\n')
  .filter((line) => /^\| \[(十二景|Roadster|清明上河|桂雨东湖)/.test(line));
assert.equal(rows.length, 4);
assert.match(rows[0], /十二景精选合集.*\/showcase\/index.html/);
assert.match(rows[1], /Roadster/);
assert.ok(!readme.includes('五章精选'));
const html = await readFile(new URL('../public/showcase/index.html', import.meta.url), 'utf8');
assert.match(html, /<video[\s\S]*?controls[\s\S]*?playsinline/);
assert.match(html, /src="within-selected-36s.mp4"/);
assert.equal((html.match(/<video\b/g) ?? []).length, 1);
const video = await stat(new URL('../public/showcase/within-selected-36s.mp4', import.meta.url));
assert.equal(video.size, 36_178_565);
console.log('README order, four entries, single inline player and local MP4 verified.');
