import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getPainting } from '../data/paintings';
import { buildEmpireDetails } from './empireDetails';
import { disposeObject } from './resources';

describe('Empire foreground episodes', () => {
  it('keeps the wilderness free of civic objects and desolation free of people', () => {
    const wild = buildEmpireDetails(getPainting('empire'), 0);
    const end = buildEmpireDetails(getPainting('empire'), 4);
    expect(wild.children).toHaveLength(0);
    expect(end.userData.hasPeople).toBe(false);
    expect(new THREE.Box3().setFromObject(end).max.y).toBeGreaterThan(10);
    disposeObject(wild);
    disposeObject(end);
  });
  it('batches each stage within six draws and a bounded triangle budget', () => {
    for (let stage = 0; stage < 5; stage++) {
      const group = buildEmpireDetails(getPainting('empire'), stage);
      expect(group.children.length).toBeLessThanOrEqual(6);
      let triangles = 0;
      for (const object of group.children) {
        expect(object).toBeInstanceOf(THREE.Mesh);
        const mesh = object as THREE.Mesh;
        const positions = mesh.geometry.getAttribute('position');
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        triangles += (mesh.geometry.index?.count ?? positions.count) / 3;
      }
      expect(triangles).toBeLessThan(24000);
      disposeObject(group);
    }
  });
  it('rebuilds the same composition when revisiting a period', () => {
    const a = buildEmpireDetails(getPainting('empire'), 1);
    const b = buildEmpireDetails(getPainting('empire'), 1);
    expect((a.children[0] as THREE.Mesh).geometry.getAttribute('position').array).toEqual(
      (b.children[0] as THREE.Mesh).geometry.getAttribute('position').array,
    );
    disposeObject(a);
    disposeObject(b);
  });
});
