import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getPainting } from '../data/paintings';
import { EMPIRE_PEAKS, EMPIRE_SITES, empirePeakHeight, getEmpireGround } from './empireLandform';
import { buildEmpire, buildForest } from './props';
import { batchStatic, disposeObject } from './resources';

describe('Shared Cole harbour composition', () => {
  it('opens the distant central sea between an asymmetric headland and lower western ridges', () => {
    for (let z = -25; z >= -115; z -= 5) expect(getEmpireGround(29, z)).toBeLessThan(0);
    expect(getEmpireGround(65, -80)).toBeGreaterThan(43);
    expect(getEmpireGround(-93, -89)).toBeLessThan(23);
    expect(getEmpireGround(11, -0.5)).toBeCloseTo(1.05);
    expect(getEmpireGround(-35, -0.6)).toBeCloseTo(1.05);
    const peak = EMPIRE_PEAKS[0]!;
    expect(empirePeakHeight(peak, peak.x - 15, peak.z)).toBeGreaterThan(
      empirePeakHeight(peak, peak.x + 15, peak.z),
    );
    for (let x = -140; x < 145; x += 3)
      for (let z = -130; z < 70; z += 3) {
        const height = getEmpireGround(x, z);
        expect(Number.isFinite(height)).toBe(true);
        expect(height).toBeGreaterThanOrEqual(-0.35);
        expect(Math.abs(height - getEmpireGround(x + 0.01, z))).toBeLessThan(0.2);
      }
  });

  it('levels every rotated building footprint and keeps the same sites in three civic periods', () => {
    for (const site of EMPIRE_SITES) {
      const halfWidth = ((site.kind === 1 ? 14 : 11) + 1.8) / 2;
      for (const x of [-halfWidth, 0, halfWidth])
        for (const z of [-5.25, 0, 5.25]) {
          const worldX = site.x + x * Math.cos(site.yaw) + z * Math.sin(site.yaw);
          const worldZ = site.z - x * Math.sin(site.yaw) + z * Math.cos(site.yaw);
          expect(getEmpireGround(worldX, worldZ)).toBeCloseTo(site.y, 5);
        }
    }
    for (const period of [2, 3, 4]) {
      const city = buildEmpire(period);
      const buildings = city.children.filter((object) => object.userData.site);
      expect(buildings).toHaveLength(period === 4 ? 5 : 8);
      for (const building of buildings) {
        const site = EMPIRE_SITES.find((site) => site.id === building.userData.site)!;
        expect(building.position.toArray()).toEqual([site.x, site.y - 1.09, site.z]);
        expect(building.rotation.y).toBe(site.yaw);
        // First foundation step meets the ground, unlike raised display plinths.
        const foundation = building.children[0] as THREE.Mesh;
        expect(building.position.y + foundation.position.y - 0.11).toBeCloseTo(site.y);
      }
      const batched = batchStatic(city);
      expect(batched.children.length).toBeLessThanOrEqual(3);
      let triangles = 0;
      batched.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          triangles +=
            (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3;
          expect(
            Array.from(object.geometry.attributes.position!.array).every(Number.isFinite),
          ).toBe(true);
        }
      });
      expect(triangles).toBeLessThan(80_000);
      disposeObject(batched);
    }
  });

  it('keeps civic foundations clear of trees and does not reuse flattened Chinese pine crowns', () => {
    const forest = buildForest(getPainting('empire'));
    const crowns = forest.getObjectByName('Harbour broadleaf crowns') as THREE.InstancedMesh;
    expect(crowns).toBeDefined();
    const trunks = forest.getObjectByName('Bent pine trunks') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(),
      point = new THREE.Vector3();
    for (let i = 0; i < trunks.count; i++) {
      trunks.getMatrixAt(i, matrix);
      point.setFromMatrixPosition(matrix);
      for (const site of EMPIRE_SITES)
        expect(Math.abs(point.x - site.x) >= 13 || Math.abs(point.z - site.z) >= 11).toBe(true);
    }
    disposeObject(forest);
  });
});
