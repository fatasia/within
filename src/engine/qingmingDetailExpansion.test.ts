import { it, expect } from 'vitest';
import * as THREE from 'three';
import { buildQingmingShopFront, QINGMING_SHOP_KINDS } from './qingmingCommerce';
import { buildQingmingDailyLife } from './qingmingDailyLife';
import { buildQingmingRiverCraft } from './qingmingRiverCraft';
import type { StreetMaterials } from './qingmingEpisodes';
import { featuredUpdate } from './featuredShared';
import { disposeObject } from './resources';
function materials() {
  return Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((k) => [
      k,
      new THREE.MeshStandardMaterial({ color: '#998877' }),
    ]),
  ) as unknown as StreetMaterials;
}
it('provides eight distinct furnished trades with bounded geometry and shared materials', () => {
  const m = materials(),
    sets = new Set<string>();
  for (let i = 0; i < 8; i++) {
    const g = buildQingmingShopFront(i, 6, 7, m);
    expect(g.userData.shopKind).toBe(QINGMING_SHOP_KINDS[i]);
    expect(g.userData.triangleCount).toBeLessThan(2200);
    expect(g.children.length).toBeLessThanOrEqual(8);
    expect(g.userData.features.length).toBeGreaterThanOrEqual(3);
    sets.add(JSON.stringify(g.userData.features.map((x: { name: string }) => x.name)));
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        expect(Object.values(m)).toContain(o.material);
        expect(o.geometry.attributes.position!.array.every(Number.isFinite)).toBe(true);
      }
    });
    const b = new THREE.Box3().setFromObject(g);
    expect(b.min.x).toBeGreaterThan(-3);
    expect(b.max.x).toBeLessThan(3);
    expect(b.min.z).toBeGreaterThan(2.1);
    expect(b.max.z).toBeLessThan(4.9);
    disposeObject(g);
  }
  expect(sets.size).toBe(8);
});
it('articulates a three-camel caravan and customer/work gestures in one skinned draw', () => {
  const g = buildQingmingDailyLife(materials());
  try {
    expect(g.children).toHaveLength(1);
    expect(g.children[0]).toBeInstanceOf(THREE.SkinnedMesh);
    const camel = g.getObjectByName('pack-camel-0')!;
    const start = camel.position.x;
    featuredUpdate(g)!(20, 0);
    expect(camel.position.x).toBeGreaterThan(start);
    expect(camel.position.y).toBeCloseTo(2.82);
    expect(g.userData.inventory.camels).toBe(3);
    expect(g.userData.inventory.customers).toBe(64);
    g.updateMatrixWorld(true);
    g.traverse((o) => expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true));
    const before = camel.position.clone();
    featuredUpdate(g)!(NaN, 0);
    expect(camel.position.equals(before)).toBe(true);
  } finally {
    disposeObject(g);
  }
});
it('fills working river margins and enclosed yards without duplicate water planes', () => {
  const g = buildQingmingRiverCraft(materials());
  try {
    expect(g.userData.inventory).toHaveLength(11);
    expect(g.getObjectByName('boatwright-rib-frame')).toBeDefined();
    let triangles = 0;
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        triangles += (o.geometry.index?.count ?? o.geometry.attributes.position!.count) / 3;
        expect(o.geometry.attributes.position!.array.every(Number.isFinite)).toBe(true);
      }
    });
    expect(triangles).toBeLessThan(15000);
  } finally {
    disposeObject(g);
  }
});
