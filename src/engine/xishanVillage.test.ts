import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getPainting } from '../data/paintings';
import { buildVillage } from './props';
import { groundHeight } from './terrain';
import { disposeObject } from './resources';

describe('Xishan woodland and caravan', () => {
  it('replaces the generic nine buildings and seven cone travelers with one eave and a small caravan', () => {
    const painting = getPainting('xishan');
    const village = buildVillage(painting);
    expect(village.children).toHaveLength(2);
    const caravan = village.getObjectByName('Xishan pack caravan')!;
    const dwelling = village.getObjectByName('Xishan secluded woodland eave')!;
    expect(
      caravan.children.filter((object) => object.userData.role === 'pack-animal'),
    ).toHaveLength(3);
    expect(
      caravan.children.filter((object) => object.userData.role === 'adult-traveler'),
    ).toHaveLength(2);
    expect(
      caravan.children.filter((object) => object.name === 'Slack caravan lead rope'),
    ).toHaveLength(3);
    for (const object of caravan.children.filter((object) => object instanceof THREE.Group)) {
      expect(object.position.x).toBeGreaterThan(40);
      expect(object.position.y).toBeCloseTo(
        groundHeight(painting, object.position.x, object.position.z),
      );
    }
    expect(caravan.userData.focus.every(Number.isFinite)).toBe(true);
    expect(dwelling.userData.focus.every(Number.isFinite)).toBe(true);
    console.log(
      'Xishan camera anchors',
      JSON.stringify({ caravan: caravan.userData.focus, eave: dwelling.userData.focus }),
    );
    disposeObject(village);
  });

  it('has finite nondegenerate model geometry and no lit ornament', () => {
    const village = buildVillage(getPainting('xishan'));
    let triangles = 0;
    village.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const geometry = object.geometry;
      expect([...geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);
      expect([...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true);
      expect(object.scale.x * object.scale.y * object.scale.z).toBeGreaterThan(0);
      triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
      expect((object.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0);
    });
    expect(triangles).toBeGreaterThan(1000);
    expect(triangles).toBeLessThan(30000);
    const adults = village
      .getObjectByName('Xishan pack caravan')!
      .children.filter((object) => object.userData.role === 'adult-traveler');
    for (const adult of adults) {
      const bounds = new THREE.Box3().setFromObject(adult);
      expect(bounds.max.y - adult.position.y).toBeCloseTo(1.68, 2);
    }
    disposeObject(village);
  });

  it('keeps the other two Chinese village templates unchanged in count and position', () => {
    for (const id of ['qianli', 'fuchun'] as const) {
      const village = buildVillage(getPainting(id));
      expect(village.children).toHaveLength(16);
      expect(village.children[8]!.position.x).toBe(22);
      expect(village.children[8]!.position.z).toBe(-13);
      expect(village.getObjectByName('Xishan pack caravan')).toBeUndefined();
      disposeObject(village);
    }
  });
});
