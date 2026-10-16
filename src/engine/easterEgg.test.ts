import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Painting, PaintingId } from '../types';
import { PAINTINGS } from '../data/paintings';
import {
  buildEasterEgg,
  EASTER_EGG_PROFILES,
  ENCOUNTER_TEXT,
  findEasterEggPlacement,
} from './easterEgg';
import { groundHeight } from './terrain';
import { disposeObject } from './resources';

describe('quiet visitors', () => {
  it('gives every scene distinct restrained clothing colors and original warm dialogue', () => {
    expect(Object.keys(EASTER_EGG_PROFILES)).toHaveLength(18);
    expect(new Set(Object.values(EASTER_EGG_PROFILES).map((profile) => profile.color)).size).toBe(
      18,
    );
    expect(Object.keys(ENCOUNTER_TEXT).sort()).toEqual(Object.keys(EASTER_EGG_PROFILES).sort());
    for (const text of Object.values(ENCOUNTER_TEXT)) {
      const length = [...text.text.matchAll(/\p{Script=Han}/gu)].length;
      expect(length).toBeGreaterThanOrEqual(50);
      expect(length).toBeLessThanOrEqual(90);
      expect(text.title).not.toMatch(/彩蛋|发现|奖励/);
      expect(text.text).not.toMatch(/名言|原话|引自/);
    }
  });

  it('anchors each completed landscape visitor on finite dry ground', () => {
    for (const painting of PAINTINGS.filter((p) => String(p.id) !== 'wuhan')) {
      const placement = findEasterEggPlacement(painting);
      expect(placement, painting.id).not.toBeNull();
      expect(
        [placement!.x, placement!.y, placement!.z, placement!.yaw].every(Number.isFinite),
      ).toBe(true);
      expect(groundHeight(painting, placement!.x, placement!.z), painting.id).toBeGreaterThan(0.35);
      expect(placement!.y - groundHeight(painting, placement!.x, placement!.z)).toBeCloseTo(0.012);
      expect(
        Math.hypot(
          placement!.x - EASTER_EGG_PROFILES[painting.id].x,
          placement!.z - EASTER_EGG_PROFILES[painting.id].z,
        ),
      ).toBeLessThan(2.7);
    }
  });

  it('builds one adult back-facing figure with valid geometry and a narrow invisible hit target', () => {
    for (const painting of PAINTINGS.filter((p) => String(p.id) !== 'wuhan')) {
      const group = buildEasterEgg(painting);
      expect(group.name).toBe('Quiet visitor');
      expect(group.visible, painting.id).toBe(true);
      expect(group.userData).toMatchObject({
        isEncounter: true,
        adult: true,
        authoredAddition: true,
        facing: 'away',
        placementPending: false,
      });
      const bounds = new THREE.Box3();
      let visibleMeshes = 0;
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const positions = object.geometry.getAttribute('position');
        expect([...positions.array].every(Number.isFinite), painting.id).toBe(true);
        if (object.userData.isHitbox) {
          expect((object.material as THREE.MeshBasicMaterial).colorWrite).toBe(false);
          expect(object.castShadow).toBe(false);
          object.geometry.computeBoundingBox();
          expect(object.geometry.boundingBox!.getSize(new THREE.Vector3()).x).toBeLessThan(0.65);
        } else {
          visibleMeshes++;
          object.geometry.computeBoundingBox();
          bounds.union(object.geometry.boundingBox!);
        }
      });
      expect(visibleMeshes).toBeLessThanOrEqual(5);
      expect(bounds.max.y).toBeGreaterThan(1.6);
      expect(bounds.max.y).toBeLessThan(1.75);
      expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(0.65);
      disposeObject(group);
    }
  });

  it('keeps Wuhan hidden until the actual scene supplies its ground placement', () => {
    const painting: Painting = { ...PAINTINGS[0]!, id: 'wuhan' as PaintingId, peaks: [] };
    const pending = buildEasterEgg(painting);
    expect(pending.visible).toBe(false);
    expect(pending.userData.placementPending).toBe(true);
    disposeObject(pending);
    const figure = buildEasterEgg(painting, { x: 3, y: 1.2, z: 8, yaw: 0.2 });
    expect(figure.visible).toBe(true);
    expect(figure.position.toArray()).toEqual([3, 1.2, 8]);
    expect(figure.userData.discoveryPosition).toEqual([3, 2.3, 8]);
    disposeObject(figure);
    expect(() => buildEasterEgg(painting, { x: NaN, y: 0, z: 0, yaw: 0 })).toThrow(RangeError);
  });
});
