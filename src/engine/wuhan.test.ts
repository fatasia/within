import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WUHAN_PAINTING } from '../data/wuhan';
import { buildWuhan, updateWuhan } from './wuhan';
import { getWuhanGround, wuhanPath, WUHAN_FLOWER_FOCUS, WUHAN_HILLS } from './wuhanLayout';
import { disposeObject } from './resources';
import { getCinematicKeyframes } from './cinematography';

describe('East Lake osmanthus garden', () => {
  it('encloses the near shore with rooted hillside woodland while preserving roots across tiers', () => {
    const low = buildWuhan(WUHAN_PAINTING, 'low'),
      high = buildWuhan(WUHAN_PAINTING, 'high');
    try {
      const lowGarden = low.getObjectByName('Osmanthus foliage and seasonal garden plants')!;
      const highGarden = high.getObjectByName('Osmanthus foliage and seasonal garden plants')!;
      expect(lowGarden.userData.treeBases).toEqual(highGarden.userData.treeBases);
      const lowBases = lowGarden.userData.hillsideTreeBases as [number, number, number][];
      const highBases = highGarden.userData.hillsideTreeBases as [number, number, number][];
      expect(highBases).toHaveLength(190);
      expect(lowBases).toEqual(highBases.slice(0, lowBases.length));
      for (const [x, y, z] of highBases) {
        expect(Math.abs(x)).toBeLessThan(150);
        expect(z).toBeGreaterThan(45);
        expect(y).toBeCloseTo(getWuhanGround(x, z), 6);
      }
      expect(highGarden.userData.mixedGardenTurningFraction).toBeLessThan(0.2);
    } finally {
      disposeObject(low);
      disposeObject(high);
    }
  });

  it('uses compact three-dimensional shoots instead of broad horizontal crown plates', () => {
    const group = buildWuhan(WUHAN_PAINTING, 'high');
    try {
      const woodland = group.getObjectByName(
        'Far shore layered evergreen foliage',
      ) as THREE.InstancedMesh;
      woodland.geometry.computeBoundingBox();
      const size = woodland.geometry.boundingBox!.getSize(new THREE.Vector3());
      expect(size.y / Math.max(size.x, size.z)).toBeGreaterThan(0.7);
      expect(woodland.geometry.attributes.position!.count / 3).toBe(32);
      expect((woodland.material as THREE.Material).transparent).toBe(false);
      const leaves = group.getObjectByName(
        'Opposite glossy osmanthus leaves',
      ) as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4(),
        p = new THREE.Vector3();
      let min = Infinity,
        max = -Infinity;
      for (let i = 0; i < leaves.count; i++) {
        leaves.getMatrixAt(i, matrix);
        p.setFromMatrixPosition(matrix);
        if (Math.abs(p.x + 18.5) > 3.5) continue;
        min = Math.min(min, p.y);
        max = Math.max(max, p.y);
      }
      expect(max - min).toBeGreaterThan(3);
    } finally {
      disposeObject(group);
    }
  });
  it('keeps wind-gathered fallen flowers on top of the wet path', () => {
    const group = buildWuhan(WUHAN_PAINTING, 'high');
    try {
      const flowers = group.getObjectByName(
        'Fallen golden flowers on wet stone',
      ) as THREE.InstancedMesh;
      expect(flowers.count).toBeGreaterThanOrEqual(720);
      const matrix = new THREE.Matrix4(),
        position = new THREE.Vector3();
      let nearDetail = 0;
      for (let i = 0; i < flowers.count; i++) {
        flowers.getMatrixAt(i, matrix);
        position.setFromMatrixPosition(matrix);
        expect(position.y).toBeGreaterThan(getWuhanGround(position.x, position.z) + 0.035);
        if (Math.abs(position.x + 18.5) < 2.2) nearDetail++;
      }
      expect(nearDetail).toBeGreaterThan(150);
    } finally {
      disposeObject(group);
    }
  });
  it('grounds a continuous low wooded far bank without mountain towers or submerged stems', () => {
    expect(Math.max(...WUHAN_HILLS.map((hill) => hill.height))).toBeLessThanOrEqual(9);
    const group = buildWuhan(WUHAN_PAINTING, 'high');
    try {
      const garden = group.getObjectByName('Osmanthus foliage and seasonal garden plants')!;
      const bases = garden.userData.farShoreTreeBases as [number, number, number][];
      expect(bases.length).toBeGreaterThan(250);
      for (const [x, y, z] of bases) {
        expect(y).toBeGreaterThan(0.35);
        expect(y).toBeCloseTo(getWuhanGround(x, z), 6);
      }
      for (let x = -150; x <= 150; x += 25)
        expect(bases.some(([bx]) => Math.abs(bx - x) < 15)).toBe(true);
      const foliage = group.getObjectByName(
        'Far shore layered evergreen foliage',
      ) as THREE.InstancedMesh;
      expect(foliage.count).toBeGreaterThan(1750);
      expect((foliage.material as THREE.Material).transparent).toBe(false);
    } finally {
      disposeObject(group);
    }
  });
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

  for (const [quality, budget, petalLimit] of [
    ['low', 180000, 60],
    ['balanced', 350000, 140],
    ['high', 450000, 220],
  ] as const) {
    it(`${quality}: preserves the hero flowers within the draw and geometry budgets`, () => {
      const group = buildWuhan(WUHAN_PAINTING, quality);
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
        expect(draws).toBeLessThan(25);
        expect(triangles).toBeLessThanOrEqual(budget);
        expect(group.getObjectByName('Dense evergreen crown interiors')).toBeUndefined();
        expect(group.userData.flowerFocus).toHaveLength(3);
        expect(group.userData.flowerFocus.every(Number.isFinite)).toBe(true);
        expect(group.userData.flowerFocus).toEqual([...WUHAN_FLOWER_FOCUS]);
        const flying = group.getObjectByName(
          'Sparse windborne osmanthus petals',
        ) as THREE.InstancedMesh;
        expect(flying.count).toBeLessThanOrEqual(petalLimit);
        const flowers = group.getObjectByName(
          'Golden four-petal flower clusters',
        ) as THREE.InstancedMesh;
        const matrix = new THREE.Matrix4(),
          point = new THREE.Vector3();
        let nearest = Infinity;
        for (let i = 0; i < flowers.count; i++) {
          flowers.getMatrixAt(i, matrix);
          point.setFromMatrixPosition(matrix);
          nearest = Math.min(nearest, point.distanceTo(new THREE.Vector3(...WUHAN_FLOWER_FOCUS)));
        }
        expect(nearest).toBeLessThan(0.00001);
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
  }

  it('keeps the detailed near-tree leaf positions identical across quality tiers', () => {
    const low = buildWuhan(WUHAN_PAINTING, 'low'),
      high = buildWuhan(WUHAN_PAINTING, 'high');
    try {
      const nearLow = low.getObjectByName(
        'Opposite glossy osmanthus leaves',
      ) as THREE.InstancedMesh;
      const nearHigh = high.getObjectByName(
        'Opposite glossy osmanthus leaves',
      ) as THREE.InstancedMesh;
      expect(nearLow.count).toBe(nearHigh.count);
      expect(Array.from(nearLow.instanceMatrix.array)).toEqual(
        Array.from(nearHigh.instanceMatrix.array),
      );
    } finally {
      disposeObject(low);
      disposeObject(high);
    }
  });

  it('animates sparse falling flowers deterministically and offsets rain ripple cycles', () => {
    const group = buildWuhan(WUHAN_PAINTING, 'balanced');
    try {
      const petals = group.getObjectByName(
        'Sparse windborne osmanthus petals',
      ) as THREE.InstancedMesh;
      const before = Array.from(petals.instanceMatrix.array.slice(0, 16));
      updateWuhan(group, 7.4, 0.2);
      const after = Array.from(petals.instanceMatrix.array);
      expect(after.slice(0, 16)).not.toEqual(before);
      updateWuhan(group, 7.4, 0.2);
      expect(Array.from(petals.instanceMatrix.array)).toEqual(after);
      const rings = group.getObjectByName('Expanding lake raindrop rings') as THREE.InstancedMesh;
      expect(new Set(Array.from(rings.geometry.attributes.cycleSpeed!.array)).size).toBeGreaterThan(
        60,
      );
      expect((rings.material as THREE.ShaderMaterial).uniforms.uTime!.value).toBe(7.4);
      updateWuhan(group, Number.NaN, Number.POSITIVE_INFINITY);
      expect(Array.from(petals.instanceMatrix.array).every(Number.isFinite)).toBe(true);
      expect(group.getObjectByName('Fallen golden flowers below osmanthus crowns')).toBeInstanceOf(
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
