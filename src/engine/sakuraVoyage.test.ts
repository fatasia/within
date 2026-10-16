import { describe, expect, it } from 'vitest';
import { sampleSakuraVoyage, sampleSakuraPassengerView, SAKURA_VOYAGE_END_Z, SAKURA_VOYAGE_START_Z } from './sakuraVoyage';

const progressAt = (z: number) => (z - SAKURA_VOYAGE_START_Z) / (SAKURA_VOYAGE_END_Z - SAKURA_VOYAGE_START_Z);

describe('Sakura vessel-following camera', () => {
  it('travels downstream continuously through the bridge, town and lake gate', () => {
    let previous = Infinity;
    for (let i = 0; i <= 1000; i++) {
      const sample = sampleSakuraVoyage(i / 1000);
      expect(sample.boatPosition[2]).toBeLessThan(previous);
      previous = sample.boatPosition[2];
      expect(Math.abs(sample.boatPosition[0])).toBeLessThan(1.8);
      expect(Math.abs(sample.eye[0])).toBeLessThan(3.5);
    }
    for (const z of [-26, -42, -85]) expect(sampleSakuraVoyage(progressAt(z)).boatPosition[2]).toBeCloseTo(z);
  });

  it('holds its position when paused and seeks independently of wall time', () => {
    const a = sampleSakuraVoyage(0.4, 0), b = sampleSakuraVoyage(0.4, 400);
    expect(a.boatPosition[0]).toBe(b.boatPosition[0]);
    expect(a.boatPosition[2]).toBe(b.boatPosition[2]);
    expect(a.eye[0]).toBe(b.eye[0]); expect(a.eye[2]).toBe(b.eye[2]);
    expect(a.boatPosition[1]).not.toBe(b.boatPosition[1]);
    expect(sampleSakuraVoyage(0.8, 20)).toEqual(sampleSakuraVoyage(0.8, 20));
  });

  it('keeps the camera behind and outside the boat with a stable horizon', () => {
    for (let i = 0; i <= 100; i++) {
      const { boatPosition: boat, eye, target, boatRotation } = sampleSakuraVoyage(i / 100, i);
      expect(eye[2]).toBeGreaterThan(boat[2] + 13.8);
      expect(target[2]).toBeLessThan(boat[2] - 0.24);
      expect(Math.hypot(eye[0] - boat[0], eye[2] - boat[2])).toBeCloseTo(Math.hypot(14, 1.1));
      expect(eye[1]).toBeGreaterThan(3.04); expect(eye[1]).toBeLessThan(6.71);
      expect(boatRotation[1]).toBeGreaterThan(1.4); expect(boatRotation[1]).toBeLessThan(1.75);
    }
  });

  it('passes beneath the arched bridge without camera or hull touching the deck', () => {
    for (let i = 0; i <= 1000; i++) {
      const { boatPosition: boat, eye } = sampleSakuraVoyage(i / 1000, i / 30);
      for (const point of [boat, eye]) {
        if (Math.abs(point[2] + 26) > 1.8) continue;
        const underside = 0.4 + 4.9 * Math.sqrt(1 - (point[0] / 11) ** 2) - 0.54;
        expect(point[1] + (point === boat ? 2.2 : 0.3)).toBeLessThan(underside);
      }
    }
  });

  it('places passenger eyes forward of the canopy and allows bounded look directions', () => {
    for (const progress of [0, 0.4, 0.8, 1]) {
      const vessel = sampleSakuraVoyage(progress, 3);
      const view = sampleSakuraPassengerView(progress, 3);
      expect(view.eye[2]).toBeLessThan(vessel.boatPosition[2]);
      expect(view.eye[1]).toBeCloseTo(vessel.boatPosition[1] + 1.22);
      expect(view.target[2]).toBeLessThan(view.eye[2]);
      expect(sampleSakuraPassengerView(progress, 3, 0.4).target[0]).toBeGreaterThan(view.target[0]);
      expect(sampleSakuraPassengerView(progress, 3, 0, 0.3).target[1]).toBeGreaterThan(view.target[1]);
    }
  });

  it('clamps invalid input and endpoints instead of looping or teleporting', () => {
    expect(sampleSakuraVoyage(-1).boatPosition[2]).toBe(20);
    expect(sampleSakuraVoyage(2).boatPosition[2]).toBe(-94);
    for (const progress of [NaN, Infinity, -Infinity, 0, 1]) {
      expect(Object.values(sampleSakuraVoyage(progress, NaN)).flat().every(Number.isFinite)).toBe(true);
    }
  });
});
