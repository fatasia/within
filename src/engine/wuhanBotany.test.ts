import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WUHAN_PAINTING } from '../data/wuhan';
import { buildWuhanBotany } from './wuhanBotany';
import { getWuhanGround, wuhanPath, WUHAN_FLOWER_FOCUS } from './wuhanLayout';
import { disposeObject } from './resources';

describe('flowering-season garden canopy', () => {
  it('varies actual osmanthus instance colors while keeping the blades evergreen', () => {
    const { group } = buildWuhanBotany(WUHAN_PAINTING, 'high');
    try {
      for (const name of ['Opposite glossy osmanthus leaves', 'Distant osmanthus leaf sprays']) {
        const leaves = group.getObjectByName(name) as THREE.InstancedMesh;
        expect(leaves.instanceColor?.count).toBe(leaves.count);
        const colors = leaves.instanceColor!.array;
        expect(Array.from(colors).every(Number.isFinite)).toBe(true);
        const greens: number[] = [];
        const blade = leaves.geometry.getAttribute('color');
        for (let i = 0; i < colors.length; i += 3) {
          greens.push(colors[i + 1]!);
          for (let v = 0; v < blade.count; v++) {
            const red = colors[i]! * blade.getX(v);
            const green = colors[i + 1]! * blade.getY(v);
            const blue = colors[i + 2]! * blade.getZ(v);
            expect(green).toBeGreaterThan(red);
            expect(green).toBeGreaterThan(blue);
          }
        }
        expect(Math.max(...greens) - Math.min(...greens)).toBeGreaterThan(0.5);
      }
    } finally {
      disposeObject(group);
    }
  });

  it('encloses the pavilion with grounded mixed trees without blocking the promenade', () => {
    const { group } = buildWuhanBotany(WUHAN_PAINTING, 'high');
    try {
      const bases = group.userData.mixedGardenTreeBases as {
        x: number;
        y: number;
        z: number;
        species: string;
      }[];
      expect(bases).toHaveLength(36);
      expect(
        bases.filter((base) => base.species === 'camphor').length / bases.length,
      ).toBeGreaterThan(0.75);
      expect(bases.filter(({ x }) => x > 5 && x < 45).length).toBeGreaterThanOrEqual(9);
      for (const { x, y, z } of bases) {
        expect(y).toBeCloseTo(getWuhanGround(x, z), 8);
        expect(z - wuhanPath(x)).toBeGreaterThanOrEqual(13);
        expect(y).toBeGreaterThan(1);
        expect(Math.hypot(x - 23, z - (wuhanPath(23) + 1.6))).toBeGreaterThan(10);
      }
      expect(group.userData.mixedGardenTurningFraction).toBeGreaterThan(0.04);
      expect(group.userData.mixedGardenTurningFraction).toBeLessThan(0.15);
      const canopy = group.getObjectByName(
        'Far shore layered evergreen foliage',
      ) as THREE.InstancedMesh;
      expect(canopy.instanceColor?.count).toBe(canopy.count);
      expect((canopy.material as THREE.Material).transparent).toBe(false);
      // The grove shares the folded-leaf batch, not an opaque sphere or an additional draw.
      expect(canopy.geometry.attributes.position!.count / 3).toBe(32);
      expect(group.children).toHaveLength(11);
    } finally {
      disposeObject(group);
    }
  });

  it('preserves the hero focus, original tree bases and close leaf colors across quality tiers', () => {
    const low = buildWuhanBotany(WUHAN_PAINTING, 'low');
    const high = buildWuhanBotany(WUHAN_PAINTING, 'high');
    try {
      expect(low.group.userData.treeBases).toEqual(high.group.userData.treeBases);
      expect(low.group.userData.flowerFocus).toEqual([...WUHAN_FLOWER_FOCUS]);
      expect(high.group.userData.flowerFocus).toEqual([...WUHAN_FLOWER_FOCUS]);
      const a = low.group.getObjectByName(
        'Opposite glossy osmanthus leaves',
      ) as THREE.InstancedMesh;
      const b = high.group.getObjectByName(
        'Opposite glossy osmanthus leaves',
      ) as THREE.InstancedMesh;
      expect(Array.from(a.instanceMatrix.array)).toEqual(Array.from(b.instanceMatrix.array));
      expect(Array.from(a.instanceColor!.array)).toEqual(Array.from(b.instanceColor!.array));
      expect(low.group.userData.mixedGardenTreeBases).toEqual(
        high.group.userData.mixedGardenTreeBases.slice(0, 20),
      );
    } finally {
      disposeObject(low.group);
      disposeObject(high.group);
    }
  });
});
