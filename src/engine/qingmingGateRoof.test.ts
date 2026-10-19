import * as THREE from 'three';
import { expect, it } from 'vitest';
import { buildQingmingGateRoof, gateRoofHeight } from './qingmingGateRoof';
import { disposeObject } from './resources';
it('closes the gate tower with four roof slopes and an attached soffit', () => {
  expect(gateRoofHeight(0, 0)).toBeCloseTo(17.8);
  expect(gateRoofHeight(4, 0)).toBeCloseTo(17.8);
  expect(gateRoofHeight(7.5, 0)).toBeLessThan(14.6);
  expect(gateRoofHeight(0, 5)).toBeLessThan(14.6);
  const roof = buildQingmingGateRoof(
    new THREE.MeshStandardMaterial(),
    new THREE.MeshStandardMaterial(),
  );
  try {
    const bounds = new THREE.Box3().setFromObject(roof);
    expect(bounds.min.y).toBeLessThan(14.3);
    expect(bounds.max.y).toBeLessThan(18);
    roof.traverse((o) => {
      if (o instanceof THREE.Mesh)
        expect(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(
          true,
        );
    });
  } finally {
    disposeObject(roof);
  }
});
