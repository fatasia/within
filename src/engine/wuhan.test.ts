import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WUHAN_PAINTING } from '../data/wuhan';
import { buildWuhan, updateWuhan } from './wuhan';
import { getWuhanGround, wuhanPath } from './wuhanLayout';
import { disposeObject } from './resources';
import { getCinematicKeyframes } from './cinematography';

describe('East Lake osmanthus garden', () => {
  it('keeps the continuous walking route above water and the lake bed submerged', () => {
    for (let x = -120; x <= 120; x += 2) {
      for (const offset of [-1.8, 0, 1.8]) {
        expect(getWuhanGround(x, wuhanPath(x) + offset)).toBeGreaterThan(1);
      }
      expect(getWuhanGround(x, -40)).toBeLessThan(0);
    }
    expect(getWuhanGround(-18, wuhanPath(-18))).toBeGreaterThan(1);
  });

  it('provides five concise chapters and clearly labels the scene as an interpretation', () => {
    expect(WUHAN_PAINTING.chapters).toHaveLength(5);
    expect(WUHAN_PAINTING.technique).toContain('实景意象');
    for (const chapter of WUHAN_PAINTING.chapters) {
      const count = chapter.description.match(/\p{Script=Han}/gu)?.length ?? 0;
      expect(count).toBeGreaterThanOrEqual(25);
      expect(count).toBeLessThanOrEqual(45);
    }
  });

  it('uses open leaf sprays rather than opaque crowns within 15 draws and 350,000 triangles', () => {
    const group = buildWuhan(WUHAN_PAINTING);
    try {
      let draws = 0,
        triangles = 0;
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) draws++;
        if (!(object instanceof THREE.Mesh)) return;
        const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
        triangles +=
          ((object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3) *
          instances;
        if (object instanceof THREE.InstancedMesh)
          expect(Array.from(object.instanceMatrix.array).every(Number.isFinite)).toBe(true);
      });
      expect(draws).toBeLessThanOrEqual(15);
      expect(triangles).toBeLessThanOrEqual(350000);
      expect(group.getObjectByName('Dense evergreen crown interiors')).toBeUndefined();
      expect(group.userData.flowerFocus).toHaveLength(3);
      expect(group.userData.flowerFocus.every(Number.isFinite)).toBe(true);
      const flowerShot = getCinematicKeyframes(WUHAN_PAINTING).find(
        (shot) => shot.progress === 0.21,
      )!;
      expect(
        new THREE.Vector3(...flowerShot.target).distanceTo(
          new THREE.Vector3(...group.userData.flowerFocus),
        ),
      ).toBeLessThan(0.01);
      expect(group.getObjectByName('Golden four-petal flower clusters')).toBeInstanceOf(
        THREE.InstancedMesh,
      );
      expect(group.getObjectByName('Opposite glossy osmanthus leaves')).toBeInstanceOf(
        THREE.InstancedMesh,
      );
    } finally {
      disposeObject(group);
    }
  });

  it('advances finite rain and ripple geometry and brightens the sheltered lantern at night', () => {
    const group = buildWuhan(WUHAN_PAINTING);
    try {
      const rain = group.getObjectByName('Fine autumn rain') as THREE.LineSegments;
      const ripples = group.getObjectByName('Expanding lake raindrop rings') as THREE.InstancedMesh;
      const before = Array.from(rain.geometry.attributes.position!.array.slice(0, 6));
      updateWuhan(group, 12, 1);
      expect(Array.from(rain.geometry.attributes.position!.array.slice(0, 6))).not.toEqual(before);
      expect(Array.from(ripples.instanceMatrix.array).every(Number.isFinite)).toBe(true);
      let lampIntensity = 0;
      group.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.material instanceof THREE.MeshStandardMaterial &&
          object.material.emissive.getHex() !== 0
        )
          lampIntensity = Math.max(lampIntensity, object.material.emissiveIntensity);
      });
      expect(lampIntensity).toBeGreaterThan(2);
      updateWuhan(group, Number.NaN, Number.NaN);
      expect(Array.from(rain.geometry.attributes.position!.array).every(Number.isFinite)).toBe(
        true,
      );
    } finally {
      disposeObject(group);
    }
  });
});
