import { it, expect, vi, afterAll } from 'vitest';
import * as THREE from 'three';
import { buildDunhuang } from './featuredDunhuang';
import { buildKanas, kanasRiverCenter, kanasGroundY } from './featuredKanas';
import { disposeObject } from './resources';
// Geometry tests use a no-op 2D canvas; screenshots separately check actual textures.
vi.stubGlobal('document', { createElement: () => {
  const canvas = { width: 0, height: 0, getContext: () => context };
  const context = new Proxy({canvas}, { get: (target, key) => key === 'canvas' ? target.canvas : key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  return canvas;
} });

afterAll(()=>vi.unstubAllGlobals());
for (const [name, build] of [
  ['mogao', buildDunhuang],
  ['kanas', buildKanas],
] as const)
  it(`${name} stays finite and instanced`, () => {
    const g = build();
    try {
      let tri = 0,
        draw = 0;
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          draw++;
          tri +=
            ((o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3) *
            (o instanceof THREE.InstancedMesh ? o.count : 1);
          expect(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(
            true,
          );
        }
      });
      console.log(name, { tri, draw });
      expect(draw).toBeLessThan(100);
      expect(tri).toBeLessThan(250000);
      if (name === 'mogao')
        expect((g.getObjectByName('mogao-nine-cliff-eaves') as THREE.InstancedMesh).count).toBe(9);
    } finally {
      disposeObject(g);
    }
  });
it('keeps an S river open with land at the cabin and walking start', () => {
  expect(kanasRiverCenter(-40)).toBeLessThan(-45);
  expect(kanasRiverCenter(40)).toBeGreaterThan(-20);
  for (const x of [-80, -40, 40, 80]) expect(kanasGroundY(x, kanasRiverCenter(x))).toBeLessThan(0);
  for (const [x, z] of [
    [-57, 13],
    [-12.2, -5.4],
    [-10.4, -11.7],
  ])
    expect(kanasGroundY(x!, z!)).toBeGreaterThan(0.35);
});

it('keeps the Kanas foreground low and submerges its finite edges', () => {
  for (let x = -100; x <= 100; x += 5) {
    for (const z of [10, 16, 22, 28]) {
      expect(kanasGroundY(x, z)).toBeGreaterThan(0.2);
      expect(kanasGroundY(x, z)).toBeLessThan(4);
    }
    expect(kanasGroundY(x, 50)).toBeLessThan(0);
  }
  for (let z = -100; z <= 50; z += 5) {
    expect(kanasGroundY(-120, z)).toBeLessThan(0);
    expect(kanasGroundY(120, z)).toBeLessThan(0);
  }
});

it('matches the rendered Kanas shore vertices to the prop and walking surface', () => {
  const group = buildKanas();
  try {
    const land = group.getObjectByName('kanas-continuous-shore') as THREE.Mesh;
    group.updateMatrixWorld(true);
    const points = land.geometry.getAttribute('position');
    const point = new THREE.Vector3();
    for (let i = 0; i < points.count; i += 23) {
      point.fromBufferAttribute(points, i).applyMatrix4(land.matrixWorld);
      expect(point.y).toBeCloseTo(kanasGroundY(point.x, point.z), 4);
    }
  } finally { disposeObject(group); }
});
