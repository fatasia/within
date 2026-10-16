import { describe, expect, it } from 'vitest';
import { clamp, noise, seededRandom } from './math';
import { peakHeight, groundHeight } from './terrain';
import { PAINTINGS, chapterAt } from '../data/paintings';
import { restorePreferences, nextSpeed } from '../state';
describe('deterministic landscape generation', () => {
  it('reproduces the same random sequence', () => {
    const a = seededRandom(42),
      b = seededRandom(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it('clamps invalid and out-of-range inputs', () => {
    expect(clamp(NaN)).toBe(0);
    expect(clamp(-1)).toBe(0);
    expect(clamp(4)).toBe(1);
  });
  it('keeps noise bounded', () => {
    for (let i = -20; i < 20; i++) expect(noise(i * 0.34, i * 0.71, 4)).toBeGreaterThanOrEqual(0);
  });
  it('has finite terrain and submerged edges in all ten worlds', () => {
    // Featured worlds own their relief; their peak entries are inert data and
    // groundHeight answers the scene's own surface function instead.
    const featured = new Set(['arctic', 'dunhuang', 'huangshan', 'xihu', 'kanas', 'deepsea', 'sakura']);
    for (const p of PAINTINGS) {
      if (featured.has(p.id)) continue;
      for (const peak of p.peaks) {
        expect(Number.isFinite(peakHeight(peak, peak.x, peak.z))).toBe(true);
        expect(peakHeight(peak, peak.x + peak.radius * 2, peak.z)).toBe(-0.25);
        expect(groundHeight(p, peak.x, peak.z)).toBeGreaterThan(0);
      }
    }
  });
  it('keeps the summit continuous when approached from every direction', () => {
    // The previous angular ridge function was nonzero at radius zero, producing
    // a different summit height on either side of atan2's discontinuity.
    for (const painting of PAINTINGS) {
      for (const peak of painting.peaks) {
        const centre = peakHeight(peak, peak.x, peak.z);
        const epsilon = peak.radius * 0.00001;
        const samples = Array.from({ length: 16 }, (_, index) => {
          const angle = (index / 16) * Math.PI * 2;
          return peakHeight(
            peak,
            peak.x + Math.cos(angle) * epsilon,
            peak.z + Math.sin(angle) * epsilon,
          );
        });
        for (const sample of samples) {
          expect(Number.isFinite(sample)).toBe(true);
          expect(Math.abs(sample - centre)).toBeLessThan(peak.height * 0.0005);
        }
      }
    }
  });
});
describe('experience state', () => {
  it('has ordered reachable chapters and valid routes', () => {
    expect(new Set(PAINTINGS.map((p) => p.id)).size).toBe(18);
    for (const p of PAINTINGS) {
      expect(p.route.length).toBeGreaterThan(3);
      expect(p.chapters).toHaveLength(5);
      expect(chapterAt(p, 0)).toBe(0);
      expect(chapterAt(p, 1)).toBe(4);
      for (let i = 1; i < p.chapters.length; i++)
        expect(p.chapters[i]!.progress).toBeGreaterThan(p.chapters[i - 1]!.progress);
    }
  });
  it('ignores corrupt or untrusted preferences', () => {
    expect(restorePreferences('{oops').painting).toBe('qianli');
    expect(
      restorePreferences('{"painting":"unknown","period":900,"quality":"ultra"}'),
    ).toMatchObject({ painting: 'qianli', period: 4, quality: 'high' });
  });
  it('defaults sound on without starting movement', () => {
    expect(
      restorePreferences('{"painting":"starry","sound":true,"playing":true,"quality":"high"}'),
    ).toMatchObject({ painting: 'starry', sound: false, playing: false, quality: 'high' });
    expect(restorePreferences(null).sound).toBe(false);
    expect(restorePreferences('{"sound":false}').sound).toBe(false);
    expect(restorePreferences('{"painting":"winter"}').painting).toBe('winter');
  });
  it('opens at high quality even after a previous manually reduced session', () => {
    for (const quality of ['high', 'balanced', 'low'])
      expect(restorePreferences(JSON.stringify({ quality })).quality).toBe('high');
    expect(restorePreferences(null).quality).toBe('high');
  });
  it('cycles the three playback speeds', () =>
    expect([nextSpeed(0.5), nextSpeed(1), nextSpeed(2)]).toEqual([1, 2, 0.5]));
});
