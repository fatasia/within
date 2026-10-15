import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PAINTINGS, getPainting } from '../data/paintings';
import { pineCrownGeometry } from './modelGeometry';
import { buildForest } from './props';
import { disposeObject } from './resources';

const triangles = (geometry: THREE.BufferGeometry) =>
  (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;

describe('painted pine geometry', () => {
  it('keeps the shared crown bounds while replacing one disc with five jagged sprays', () => {
    const crown = pineCrownGeometry();
    expect(triangles(crown)).toBe(160);
    const positions = crown.getAttribute('position');
    expect([...positions.array].every(Number.isFinite)).toBe(true);
    expect([...crown.getAttribute('normal').array].every(Number.isFinite)).toBe(true);
    const bounds = crown.boundingBox!;
    expect(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x))).toBeLessThan(1.1);
    expect(Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z))).toBeLessThan(1.1);
    expect(Math.max(Math.abs(bounds.min.y), Math.abs(bounds.max.y))).toBeLessThan(0.32);
    // Every spray has two poles, two seven-point broken rings, then four needle tips.
    expect(positions.count).toBe(5 * (2 + 14 + 12));
    const points = new THREE.Vector3();
    for (let spray = 0; spray < 5; spray++) {
      const pole = new THREE.Vector3().fromBufferAttribute(positions, spray * 28);
      const radii: number[] = [];
      for (let vertex = 2; vertex < 9; vertex++) {
        points.fromBufferAttribute(positions, spray * 28 + vertex);
        radii.push(Math.hypot(points.x - pole.x, points.z - pole.z));
      }
      expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThan(1.3);
    }
    crown.dispose();
  });

  it('retains three instanced draws and stays below twice the previous triangle budget', () => {
    for (const painting of PAINTINGS.filter((p) => !['winter', 'starry'].includes(p.id))) {
      const forest = buildForest(painting);
      expect(forest.children, painting.id).toHaveLength(3);
      const meshes = forest.children as THREE.InstancedMesh[];
      expect(meshes.every((mesh) => mesh.isInstancedMesh)).toBe(true);
      const originalBudget = meshes[0]!.count * (24 + 6 * 20 + 6 * 88);
      const currentBudget = meshes.reduce(
        (sum, mesh) => sum + triangles(mesh.geometry) * mesh.count,
        0,
      );
      expect(currentBudget, painting.id).toBeLessThanOrEqual(originalBudget * 2);
      for (const mesh of meshes) {
        expect([...mesh.instanceMatrix.array].every(Number.isFinite), painting.id).toBe(true);
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          expect(matrix.determinant(), painting.id).toBeGreaterThan(0);
        }
      }
      disposeObject(forest);
    }
  });

  it('uses fewer, lighter crowns for Fuchun and a denser dark canopy for Xishan', () => {
    const sparse = buildForest(getPainting('fuchun'));
    const dense = buildForest(getPainting('xishan'));
    const sparseTrees = sparse.children[0] as THREE.InstancedMesh;
    const sparseCrowns = sparse.children[2] as THREE.InstancedMesh;
    const denseTrees = dense.children[0] as THREE.InstancedMesh;
    const denseCrowns = dense.children[2] as THREE.InstancedMesh;
    expect(sparseCrowns.count / sparseTrees.count).toBeLessThan(4.2);
    expect(denseCrowns.count / denseTrees.count).toBeGreaterThan(5.8);
    const average = (mesh: THREE.InstancedMesh) => {
      const color = new THREE.Color();
      let total = 0;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getColorAt(i, color);
        total += color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
      }
      return total / mesh.count;
    };
    expect(average(sparseCrowns)).toBeGreaterThan(average(denseCrowns));
    expect((sparseCrowns.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xffffff);
    disposeObject(sparse);
    disposeObject(dense);
  });

  it('is deterministic, with a genuinely bent trunk rather than a tilted straight cylinder', () => {
    const first = buildForest(getPainting('qianli'));
    const second = buildForest(getPainting('qianli'));
    first.children.forEach((object, index) => {
      expect([...(object as THREE.InstancedMesh).instanceMatrix.array]).toEqual([
        ...(second.children[index] as THREE.InstancedMesh).instanceMatrix.array,
      ]);
    });
    const trunk = first.children[0] as THREE.InstancedMesh;
    const positions = trunk.geometry.getAttribute('position');
    const centers = new Map<number, number[]>();
    // Cylinder torso rings, excluding its cap vertices and closing-seam duplicates.
    for (let ring = 0; ring < 4; ring++) {
      const xs = Array.from({ length: 6 }, (_, side) => positions.getX(ring * 7 + side));
      centers.set(ring, xs);
    }
    const center = (ring: number) => centers.get(ring)!.reduce((a, b) => a + b) / 6;
    expect(Math.abs(center(1) - ((center(0) * 2) / 3 + center(3) / 3))).toBeGreaterThan(0.04);
    disposeObject(first);
    disposeObject(second);
  });
});
