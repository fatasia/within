import { QINGMING_TRIANGLE_BUDGET } from './qingmingBudget';
import { qingmingMainStreet, qingmingRiver, cityGround } from './cityLayout';
import * as THREE from 'three';
import { it, expect } from 'vitest';
import { buildQingming } from './qingming';
import { buildQingmingScrollDetails } from './qingmingScroll';
import type { StreetMaterials } from './qingmingEpisodes';
import { QINGMING } from '../data/qingming';
import { disposeObject } from './resources';

it('keeps the extended full-scroll city inside its existing draw and geometry budgets', () => {
  const group = buildQingming(QINGMING);
  try {
    let triangles = 0,
      meshes = 0;
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      triangles +=
        (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
    });
    console.log('Qingming current budget', { triangles, meshes });
    expect(triangles).toBeLessThan(QINGMING_TRIANGLE_BUDGET);
    expect(meshes).toBeLessThan(40);
    expect(group.userData.layoutRevision.cityCourts).toBe(10);
    expect(
      group.userData.layoutRevision.mooredBoats.filter(([x]: [number, number]) => x < 0),
    ).toHaveLength(5);
  } finally {
    disposeObject(group);
  }
});

it('connects countryside, working banks and city back lanes without new material batches', () => {
  const materials = Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((key) => [
      key,
      new THREE.MeshStandardMaterial(),
    ]),
  ) as unknown as StreetMaterials;
  const group = buildQingmingScrollDetails(materials);
  try {
    const names = [
      'qingming-rural-approach-and-grove',
      'qingming-country-plank-crossing',
      'qingming-roadside-refreshment-shelter',
      'qingming-working-riverbank',
      'qingming-city-back-lanes',
    ];
    for (const name of names) expect(group.getObjectByName(name)).toBeDefined();
    let trees = 0,
      triangles = 0;
    const allowed = new Set(Object.values(materials));
    group.traverse((object) => {
      if (object.name === 'qingming-sparse-spring-branches') trees++;
      if (!(object instanceof THREE.Mesh)) return;
      expect(allowed.has(object.material)).toBe(true);
      expect(
        Array.from(object.geometry.getAttribute('position').array).every(Number.isFinite),
      ).toBe(true);
      triangles +=
        (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
    });
    expect(trees).toBe(13);
    expect(triangles).toBeLessThan(23000);
    const lanes = group.getObjectByName('qingming-city-back-lanes')!;
    const ribbons = lanes.children.filter((object) => object instanceof THREE.Mesh) as THREE.Mesh[];
    expect(ribbons).toHaveLength(3);
    for (const ribbon of ribbons) {
      const normals = ribbon.geometry.getAttribute('normal');
      expect(normals.getY(0)).toBeGreaterThan(0.99);
      expect(ribbon.geometry.getAttribute('position').getY(0)).toBeCloseTo(2.855, 3);
    }
  } finally {
    disposeObject(group);
  }
});

it('links the bridgehead to the gate while the city-end river leaves the market quarter', () => {
  expect(qingmingMainStreet(-20)).toBe(-19);
  expect(qingmingMainStreet(45)).toBe(-45);
  expect(qingmingMainStreet(110)).toBe(-45);
  expect(qingmingRiver(130)).toBeGreaterThan(60);
  for (let x = -14; x < 130; x += 2) expect(cityGround(x, qingmingMainStreet(x))).toBeCloseTo(2.8);
  // Original bridge reach is unchanged, so its supports and animated passage boat remain aligned.
  expect(qingmingRiver(-20)).toBeCloseTo(5 + Math.sin(-20 * 0.012) * 7);
});
