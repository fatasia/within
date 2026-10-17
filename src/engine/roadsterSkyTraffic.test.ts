import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRoadsterSkyTraffic, sampleSkyCar, SKY_CAR_COUNT } from './roadsterSkyTraffic';
import { disposeObject } from './resources';
describe('background sky traffic', () => {
  it('keeps opposing lanes above the main vehicle with finite continuous poses', () => {
    for (let i = 0; i < SKY_CAR_COUNT; i++)
      for (let t = 0; t < 50; t += 0.2) {
        const p = sampleSkyCar(i, t);
        expect(Object.values(p).every(Number.isFinite)).toBe(true);
        expect(p.y).toBeGreaterThan(6.9);
      }
    expect(sampleSkyCar(0, 2).z).toBeLessThan(sampleSkyCar(0, 1).z);
    expect(sampleSkyCar(1, 2).z).toBeGreaterThan(sampleSkyCar(1, 1).z);
  });
  it('uses five draws, quality caps and animated steam without adding objects', () => {
    const traffic = buildRoadsterSkyTraffic();
    expect(traffic.group.children).toHaveLength(5);
    const hull = traffic.group.children[0] as THREE.InstancedMesh;
    const steam = traffic.group.children[4] as THREE.Points;
    const before = Array.from(hull.instanceMatrix.array);
    const smoke = Array.from(steam.geometry.attributes.position!.array);
    traffic.update(2);
    expect(Array.from(hull.instanceMatrix.array)).not.toEqual(before);
    expect(Array.from(steam.geometry.attributes.position!.array)).not.toEqual(smoke);
    traffic.setQuality('low');
    expect(hull.count).toBe(3);
    expect(steam.geometry.drawRange.count).toBe(168);
    traffic.setQuality('balanced');
    expect(hull.count).toBe(5);
    traffic.setQuality('high');
    expect(hull.count).toBe(8);
    traffic.update(10);
    expect(traffic.group.children).toHaveLength(5);
    expect((steam.material as THREE.Material).depthWrite).toBe(false);
    disposeObject(traffic.group);
  });
});
