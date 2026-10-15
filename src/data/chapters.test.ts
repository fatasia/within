import { describe, expect, it } from 'vitest';
import { PAINTINGS, chapterAt, getPainting } from './paintings';

describe('chapter introductions', () => {
  it('puts the four featured scenes first while preserving the remaining order', () => {
    expect(PAINTINGS.map((painting) => painting.id)).toEqual([
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
    ]);
  });
  it('gives all 50 chapters a unique, short introduction', () => {
    expect(PAINTINGS).toHaveLength(10);
    const chapters = PAINTINGS.flatMap((painting) => painting.chapters);
    expect(chapters).toHaveLength(50);
    expect(new Set(chapters.map((chapter) => chapter.description)).size).toBe(50);
    for (const painting of PAINTINGS) {
      expect(painting.chapters).toHaveLength(5);
      for (const chapter of painting.chapters) {
        const label = `${painting.title} / ${chapter.title}`;
        const characterCount = [...chapter.description.matchAll(/\p{Script=Han}/gu)].length;
        expect(characterCount, label).toBeGreaterThanOrEqual(25);
        expect(characterCount, label).toBeLessThanOrEqual(45);
        expect(chapter.description, label).not.toMatch(/[\n\r<>]|待补充|TODO/);
        expect(chapter.description, label).toMatch(/。$/);
        expect(chapter.title.trim(), label).not.toBe('');
        expect(chapter.subtitle, label).toMatch(/^[A-Z ]+$/);
      }
    }
  });

  it('keeps each introduction reachable at its chapter waypoint', () => {
    for (const painting of PAINTINGS) {
      expect(painting.chapters[0]!.progress).toBe(0);
      painting.chapters.forEach((chapter, index) => {
        expect(chapterAt(painting, chapter.progress)).toBe(index);
        expect(chapter.progress).toBeLessThan(1);
        if (index > 0)
          expect(chapter.progress).toBeGreaterThan(painting.chapters[index - 1]!.progress);
      });
    }
  });

  it('does not describe absent models or animation as visible details', () => {
    const copy = (id: Parameters<typeof getPainting>[0]) =>
      getPainting(id)
        .chapters.map((chapter) => `${chapter.title}${chapter.description}`)
        .join('');
    // The current bridge has people/stalls, not horses or an animated cargo route.
    expect(copy('qingming')).not.toMatch(/车马|漕船缓缓通过/);
    // Cliff pines have trunks and crowns, but no exposed-root mesh.
    expect(copy('zhangjiajie')).not.toContain('根系');
    // Pastoral geometry is a small hamlet, without modeled agriculture.
    expect(copy('empire')).not.toMatch(/耕作|农田/);
    // The woodland structure is a pavilion, not a modeled temple compound.
    expect(copy('xishan')).not.toContain('寺');
    expect(copy('winter')).not.toMatch(/极光|灯火通明|飘落的雪/);
  });
});
