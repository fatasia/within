import { describe, expect, it } from 'vitest';
import { ORIGINALS } from './originals';

const assets = import.meta.glob('/public/originals/*.webp', { query: '?url', import: 'default' });

describe('original artwork references', () => {
  it('covers seven paintings without assigning an invented original to real landscapes', () => {
    expect(Object.keys(ORIGINALS).sort()).toEqual([
      'empire',
      'fuchun',
      'qianli',
      'qingming',
      'starry',
      'winter',
      'xishan',
    ]);
    for (const id of ['wuhan', 'guilin', 'zhangjiajie'] as const)
      expect(ORIGINALS[id]).toBeUndefined();
  });
  it('resolves every public-relative image and preserves source credits', () => {
    const paths = new Set<string>();
    for (const artwork of Object.values(ORIGINALS)) {
      expect(artwork.sourceUrl).toMatch(/^https:\/\//);
      expect(artwork.credit.length).toBeGreaterThan(15);
      expect(artwork.images.length).toBeGreaterThan(0);
      for (const image of artwork.images) {
        expect(image.src).toMatch(/^originals\/[a-z0-9-]+\.webp$/);
        expect(assets[`/public/${image.src}`]).toBeDefined();
        expect(image.alt.length).toBeGreaterThan(10);
        expect(image.caption.length).toBeGreaterThan(5);
        paths.add(image.src);
      }
    }
    expect(paths.size).toBe(11);
  });
  it('labels partial scroll reproductions as details, not complete originals', () => {
    for (const id of ['qianli', 'fuchun', 'qingming'] as const) {
      expect(ORIGINALS[id]!.images.every((image) => image.scope === 'detail')).toBe(true);
      expect(ORIGINALS[id]!.images[0]!.caption).toContain('不是');
    }
    expect(ORIGINALS.winter!.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
  });
  it('provides all five empire paintings in chronological order', () => {
    expect(ORIGINALS.empire!.images.map((image) => image.period)).toEqual([0, 1, 2, 3, 4]);
    expect(ORIGINALS.empire!.images.every((image) => image.scope === 'complete')).toBe(true);
  });
});
