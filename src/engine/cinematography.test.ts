import { describe, expect, it } from 'vitest';
import { PAINTINGS } from '../data/paintings';
import type { Vec3 } from '../types';
import { getCinematicKeyframes, getCinematicView } from './cinematography';
import { groundHeight } from './terrain';
import { wuhanShore } from './wuhanLayout';
import { PerspectiveCamera, Vector3 } from 'three';

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const paintings = PAINTINGS;

describe('cinematic landscape routes', () => {
  it('keeps contextual subjects without forcing every world into a macro shot', () => {
    expect(paintings).toHaveLength(18);
    for (const painting of paintings) {
      const frames = getCinematicKeyframes(painting);
      expect(frames.length, painting.id).toBeGreaterThanOrEqual(8);
      expect(frames[0]!.progress).toBe(0);
      expect(frames.at(-1)!.progress).toBe(1);
      const close = frames.filter((frame) => {
        const view = getCinematicView(painting, frame.progress);
        return frame.detail && distance(view.eye, view.target) < 65;
      });
      expect(close.length, painting.id).toBeGreaterThanOrEqual(1);
      // Previous tests required a <10m shot in every world. That requirement
      // pushed the tour inside bamboo, cypress and forest crowns.
      if (!['qingming','roadster'].includes(painting.id))
        for (const shot of frames) {
          const view = getCinematicView(painting, shot.progress);
          expect(
            distance(view.eye, view.target),
            `${painting.id}: ${shot.subject}`,
          ).toBeGreaterThan(10);
        }
      frames.forEach((frame, index) => {
        expect(frame.subject.trim()).not.toBe('');
        if (index) expect(frame.progress).toBeGreaterThan(frames[index - 1]!.progress);
      });
    }
  });

  it('keeps the bamboo and summit-pine chapters outside their foliage envelope', () => {
    const guilin = PAINTINGS.find((p) => p.id === 'guilin')!;
    for (const progress of [0.21, 0.32]) {
      const view = getCinematicView(guilin, progress);
      expect(view.eye[2]).toBeGreaterThan(40);
      expect(view.eye[1]).toBeGreaterThan(8);
      expect(distance(view.eye, view.target)).toBeGreaterThan(40);
    }
    const cliffs = PAINTINGS.find((p) => p.id === 'zhangjiajie')!;
    const view = getCinematicView(cliffs, 0.43);
    expect(distance(view.eye, view.target)).toBeGreaterThan(35);
  });

  it('observes the Wuhan garden from the open lake, rather than inside its wooded slope', () => {
    const painting = PAINTINGS.find((p) => p.id === 'wuhan')!;
    for (const shot of getCinematicKeyframes(painting)) {
      expect(shot.eye[2], shot.subject).toBeLessThan(wuhanShore(shot.eye[0]) - 1);
    }
  });

  it('keeps the principal mountain crown in frame when showing bridges, banks and stone forests', () => {
    const cases = [
      ['qianli', 0.4, 20],
      ['fuchun', 0.44, -55],
      ['zhangjiajie', 0.43, -49],
      ['guilin', 0.21, -41],
    ] as const;
    for (const [id, progress, peakX] of cases) {
      const painting = PAINTINGS.find((p) => p.id === id)!;
      const peak = painting.peaks.find((p) => p.x === peakX)!;
      const view = getCinematicView(painting, progress);
      const camera = new PerspectiveCamera(39, 1.6, 0.1, 1000);
      camera.position.set(...view.eye);
      camera.lookAt(new Vector3(...view.target));
      camera.updateMatrixWorld(true);
      const crown = new Vector3(peak.x, groundHeight(painting, peak.x, peak.z) + 3, peak.z).project(
        camera,
      );
      expect(Math.abs(crown.x), id).toBeLessThan(0.95);
      expect(Math.abs(crown.y), id).toBeLessThan(0.95);
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
