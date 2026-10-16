import { describe, expect, it } from 'vitest';
import { PAINTINGS } from '../data/paintings';
import { getFilmShot } from './filmTimeline';
import { groundHeight } from './terrain';

describe('ten-second delivery edit', () => {
  it('retains all worlds and finite grounded cameras at every scheduled frame', () => {
    for (const painting of PAINTINGS)
      for (let frame = 0; frame < 300; frame++) {
        const shot = getFilmShot(painting, frame / 30, 10);
        expect([...shot.view.eye, ...shot.view.target].every(Number.isFinite), painting.id).toBe(
          true,
        );
        expect(shot.view.eye[1]).toBeGreaterThanOrEqual(
          groundHeight(painting, shot.view.eye[0], shot.view.eye[2]) + 0.55 - 1e-8,
        );
      }
  });
  it('cuts deliberately without speeding through an entire world', () => {
    for (const painting of PAINTINGS.filter((p) => p.id !== 'empire')) {
      expect([0, 3, 6].map((t) => getFilmShot(painting, t, 10).shot)).toEqual([0, 1, 2]);
      const a = getFilmShot(painting, 0, 10).view.eye;
      const b = getFilmShot(painting, 2.99, 10).view.eye;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThanOrEqual(1.81);
    }
    const empire = PAINTINGS.find((p) => p.id === 'empire')!;
    expect([0, 2, 4, 6, 8].map((t) => Math.floor(getFilmShot(empire, t, 10).progress * 5))).toEqual(
      [0, 1, 2, 3, 4],
    );
  });
  it('ends botanical and cliff-landscape edits with breathing room, not a second macro', () => {
    for (const painting of PAINTINGS.filter((p) =>
      ['wuhan', 'guilin', 'zhangjiajie'].includes(p.id),
    )) {
      const { eye, target } = getFilmShot(painting, 7, 10).view;
      expect(
        Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]),
        painting.id,
      ).toBeGreaterThan(75);
    }
  });
});
