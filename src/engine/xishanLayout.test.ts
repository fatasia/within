import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getPainting } from '../data/paintings';
import { buildForest, buildVillage } from './props';
import { buildNearDetails } from './details';
import { groundHeight } from './terrain';
import { disposeObject } from './resources';
import {
  blendXishanGround,
  isXishanClearing,
  XISHAN_HOUSE,
  XISHAN_PATH,
  XISHAN_CARAVAN_FOCUS,
  XISHAN_EAVE_FOCUS,
  xishanPathCenter,
  xishanPathHeight,
} from './xishanLayout';

const painting = getPainting('xishan');
// The current Xishan terrain bounds/grid from buildTerrain, sampled with its actual two-triangle cells.
function renderedHeight(x: number, z: number): number {
  const sx = 280 / 320,
    sz = 195 / 220;
  const left = Math.floor((x + 140) / sx) * sx - 140;
  const top = Math.floor((z + 115) / sz) * sz - 115;
  const u = (x - left) / sx,
    v = (z - top) / sz;
  const a = groundHeight(painting, left, top),
    b = groundHeight(painting, left, top + sz);
  const c = groundHeight(painting, left + sx, top + sz),
    d = groundHeight(painting, left + sx, top);
  return u + v <= 1 ? a + u * (d - a) + v * (b - a) : c + (1 - u) * (b - c) + (1 - v) * (d - c);
}

describe('Xishan connected ground layout', () => {
  it('gives the entire caravan a narrow, gentle trail without changing the main mountain', () => {
    for (let x = XISHAN_PATH.start; x <= XISHAN_PATH.end; x += 0.2) {
      for (const side of [-0.65, 0, 0.65]) {
        const z = xishanPathCenter(x) + side;
        const actual = groundHeight(painting, x, z);
        expect(actual).toBeCloseTo(xishanPathHeight(x), 8);
        expect(Math.abs(renderedHeight(x, z) - actual)).toBeLessThan(0.025);
        const slope =
          (groundHeight(painting, x + 0.05, z) - groundHeight(painting, x - 0.05, z)) / 0.1;
        expect(Math.abs(slope)).toBeLessThan(0.04);
      }
    }
    for (const [x, z] of [
      [0, -48],
      [-40, 1],
      [57, 35],
      [0, 0],
    ]) {
      expect(blendXishanGround(x!, z!, 11.7)).toBe(11.7);
    }
  });

  it('grounds all four walls on the same small platform and seals their top to the curved roof', () => {
    const village = buildVillage(painting);
    const dwelling = village.getObjectByName('Xishan secluded woodland eave')!;
    expect(dwelling.position.y).toBe(XISHAN_HOUSE.height);
    const walls = dwelling.getObjectByName('Continuous ground-to-eave walls') as THREE.Mesh;
    const vertices = walls.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i),
        z = vertices.getZ(i);
      if (y < 0) {
        expect(groundHeight(painting, dwelling.position.x + x, dwelling.position.z + z)).toBe(
          XISHAN_HOUSE.height,
        );
        expect(
          Math.abs(
            renderedHeight(dwelling.position.x + x, dwelling.position.z + z) - XISHAN_HOUSE.height,
          ),
        ).toBeLessThan(0.025);
      } else {
        const t = Math.abs(z) / 1.625;
        const roof =
          1.65 + 0.84 * (1 - t) + t ** 4 * 0.84 * 0.37 + (Math.abs(x) / 2.025) ** 5 * 0.84 * 0.17;
        expect(y - roof).toBeCloseTo(0.01, 5);
      }
    }
    expect(dwelling.userData.focus).toEqual(XISHAN_EAVE_FOCUS);
    expect(village.getObjectByName('Xishan pack caravan')!.userData.focus).toEqual(
      XISHAN_CARAVAN_FOCUS,
    );
    disposeObject(village);
  });

  it('keeps the complete rock and pine geometry out of the route and house footprint', () => {
    for (const group of [buildForest(painting), buildNearDetails(painting)]) {
      const collisions: string[] = [];
      const matrix = new THREE.Matrix4(),
        position = new THREE.Vector3();
      group.traverse((object) => {
        if (!(object instanceof THREE.InstancedMesh)) return;
        const positions = object.geometry.getAttribute('position');
        for (let instance = 0; instance < object.count; instance++) {
          object.getMatrixAt(instance, matrix);
          for (let vertex = 0; vertex < positions.count; vertex++) {
            position.fromBufferAttribute(positions, vertex).applyMatrix4(matrix);
            if (isXishanClearing(position.x, position.z)) {
              collisions.push(`${object.name} ${instance}`);
              break;
            }
          }
        }
      });
      expect(collisions).toEqual([]);
      disposeObject(group);
    }
  });
});
