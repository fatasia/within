import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getPainting } from '../data/paintings';
import { buildTerrain, buildTerrainSteps, groundHeight } from './terrain';
import { disposeObject } from './resources';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => ({
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        bezierCurveTo() {},
      }),
    }),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cooperative terrain construction', () => {
  it.each(['wuhan', 'fuchun', 'qingming'] as const)(
    '%s preserves complete geometry across yields',
    (id) => {
      const painting = getPainting(id);
      const sync = buildTerrain(painting);
      const steps = buildTerrainSteps(painting);
      let step = steps.next(),
        yields = 0;
      while (!step.done) {
        yields++;
        step = steps.next();
      }
      const staged = step.value;
      expect(yields).toBeGreaterThan(50);
      expect(staged.group.children.length).toBe(sync.group.children.length);
      staged.group.children.forEach((child, index) => {
        const geometry = (child as THREE.Mesh).geometry;
        const expected = (sync.group.children[index] as THREE.Mesh).geometry;
        for (const name of Object.keys(geometry.attributes))
          expect(geometry.getAttribute(name).array).toEqual(expected.getAttribute(name).array);
        expect(geometry.index?.array).toEqual(expected.index?.array);
      });
      if (id !== 'qingming') {
        const positions = (staged.group.children[0] as THREE.Mesh).geometry.getAttribute(
          'position',
        );
        for (let i = 0; i < positions.count; i += 199)
          expect(positions.getY(i)).toBeCloseTo(
            groundHeight(painting, positions.getX(i), positions.getZ(i)),
            4,
          );
      }
      disposeObject(sync.group);
      disposeObject(staged.group);
    },
    30_000,
  );

  it('disposes unsubmitted terrain when a scene request is superseded', () => {
    const geometry = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const material = vi.spyOn(THREE.Material.prototype, 'dispose');
    const texture = vi.spyOn(THREE.Texture.prototype, 'dispose');
    const steps = buildTerrainSteps(getPainting('wuhan'));
    // 23 paper batches, completed texture, then allocated geometry.
    for (let i = 0; i < 26; i++) expect(steps.next().done).toBe(false);
    steps.return(undefined as never);
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
    expect(texture).toHaveBeenCalledTimes(1);
  });

  it('can cancel paper generation before any GPU resource is allocated', () => {
    const texture = vi.spyOn(THREE.Texture.prototype, 'dispose');
    const steps = buildTerrainSteps(getPainting('xishan'));
    steps.next();
    steps.return(undefined as never);
    expect(texture).not.toHaveBeenCalled();
    expect(steps.next().done).toBe(true);
  });
});
