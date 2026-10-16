import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildQingmingScrollDetails, QINGMING_SCROLL_FOCI } from './qingmingScroll';
import { getQingmingKeyframes } from './qingmingCinematography';
import type { StreetMaterials } from './qingmingEpisodes';
import { QINGMING } from '../data/qingming';
import { disposeObject } from './resources';
import { groundHeight } from './terrain';

const materials = (): StreetMaterials =>
  Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((key) => [
      key,
      new THREE.MeshStandardMaterial(),
    ]),
  ) as unknown as StreetMaterials;

describe('Qingming complete-scroll sequence', () => {
  it('replaces generic rural shops with thatched dwellings and outward-facing roof surfaces', () => {
    const group = buildQingmingScrollDetails(materials());
    try {
      const houses: THREE.Group[] = [];
      group.traverse((object) => {
        if (object.name === 'qingming-rural-thatched-house') houses.push(object as THREE.Group);
      });
      expect(houses).toHaveLength(4);
      for (const house of houses) {
        expect(house.position.y).toBe(2.8);
        const sheets = house.children.filter(
          (object) =>
            object instanceof THREE.Mesh && object.geometry.attributes.position!.count === 6,
        ) as THREE.Mesh[];
        expect(sheets).toHaveLength(2);
        for (const sheet of sheets)
          expect(sheet.geometry.getAttribute('normal').getY(0)).toBeGreaterThan(0);
      }
      expect(group.getObjectByName('qingming-quayside-cargo-handoff')).toBeDefined();
      expect(group.getObjectByName('qingming-city-end-courtyard')).toBeDefined();
      expect(group.userData.foci).toEqual(QINGMING_SCROLL_FOCI);
      let triangles = 0;
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        triangles +=
          (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3;
        expect(Array.from(object.geometry.attributes.position!.array).every(Number.isFinite)).toBe(
          true,
        );
      });
      expect(triangles).toBeLessThan(23000);
    } finally {
      disposeObject(group);
    }
  });

  it('reads from countryside to city-end without a final jump back to the bridge', () => {
    const frames = getQingmingKeyframes();
    expect(frames[0]!.progress).toBe(0);
    expect(frames.at(-1)!.progress).toBe(1);
    expect(frames[0]!.target[0]).toBeLessThan(-100);
    expect(frames.at(-1)!.target[0]).toBeGreaterThan(90);
    expect(frames.find((frame) => frame.progress === 0.27)!.target).toEqual(
      QINGMING_SCROLL_FOCI.landing,
    );
    expect(frames.find((frame) => frame.progress === 0.93)!.target).toEqual(
      QINGMING_SCROLL_FOCI.courtyard,
    );
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]!;
      if (i) expect(frame.progress).toBeGreaterThan(frames[i - 1]!.progress);
      expect(frame.eye[1]).toBeGreaterThan(
        groundHeight(QINGMING, frame.eye[0], frame.eye[2]) + 0.5,
      );
      expect(
        new THREE.Vector3(...frame.eye).distanceTo(new THREE.Vector3(...frame.target)),
      ).toBeGreaterThan(5);
    }
  });
});
