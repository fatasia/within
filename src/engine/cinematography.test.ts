import { describe, expect, it } from 'vitest';
import { PAINTINGS } from '../data/paintings';
import type { Vec3 } from '../types';
import { getCinematicKeyframes, getCinematicView } from './cinematography';
import { groundHeight } from './terrain';

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const paintings = PAINTINGS;

describe('cinematic detail routes', () => {
  it('authors eight ordered shots and at least two real close views in each world', () => {
    expect(paintings).toHaveLength(10);
    for (const painting of paintings) {
      const frames = getCinematicKeyframes(painting);
      expect(frames, painting.id).toHaveLength(8);
      expect(frames[0]!.progress).toBe(0);
      expect(frames.at(-1)!.progress).toBe(1);
      const close = frames.filter((frame) => {
        const view = getCinematicView(painting, frame.progress);
        return frame.detail && distance(view.eye, view.target) < 25;
      });
      expect(close.length, painting.id).toBeGreaterThanOrEqual(2);
      expect(
        close.some((frame) => {
          const view = getCinematicView(painting, frame.progress);
          return distance(view.eye, view.target) < 10;
        }),
        painting.id,
      ).toBe(true);
      frames.forEach((frame, index) => {
        expect(frame.subject.trim()).not.toBe('');
        if (index) expect(frame.progress).toBeGreaterThan(frames[index - 1]!.progress);
      });
    }
  });

  it('keeps every sampled eye above terrain and every target separate and finite', () => {
    for (const painting of PAINTINGS) {
      for (let step = 0; step <= 200; step++) {
        const view = getCinematicView(painting, step / 200);
        const label = `${painting.id} at ${step / 200}`;
        expect([...view.eye, ...view.target].every(Number.isFinite), label).toBe(true);
        expect(distance(view.eye, view.target), label).toBeGreaterThan(0.1);
        expect(view.eye[1], label).toBeGreaterThanOrEqual(
          groundHeight(painting, view.eye[0], view.eye[2]) + 0.55 - 1e-8,
        );
      }
    }
  });

  it('does not cut the camera or target at a keyframe', () => {
    for (const painting of paintings) {
      for (const frame of getCinematicKeyframes(painting).slice(1, -1)) {
        const before = getCinematicView(painting, frame.progress - 0.00001);
        const after = getCinematicView(painting, frame.progress + 0.00001);
        expect(distance(before.eye, after.eye), `${painting.id} / ${frame.subject}`).toBeLessThan(
          0.01,
        );
        expect(distance(before.target, after.target)).toBeLessThan(0.01);
      }
    }
  });

  it('clamps invalid progress without poisoning the camera', () => {
    for (const painting of PAINTINGS) {
      const start = getCinematicView(painting, 0);
      for (const progress of [NaN, Infinity, -Infinity, -10]) {
        expect(getCinematicView(painting, progress)).toEqual(start);
      }
      expect(getCinematicView(painting, 10)).toEqual(getCinematicView(painting, 1));
    }
  });
});
