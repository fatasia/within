import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { getPainting } from '../data/paintings';
import { buildVillage } from './props';
import { batchStatic, disposeObject } from './resources';

describe('Starry night painted foreground', () => {
  it('keeps seven bounded cypress lobes with varied dark green vertical pigment', () => {
    const village = buildVillage(getPainting('starry'));
    const trees = village.children.filter(
      (object) => object.name === 'Broken-brush cypress flame',
    ) as THREE.Mesh[];
    expect(trees).toHaveLength(7);
    for (const tree of trees) {
      const color = tree.geometry.getAttribute('color');
      expect(color.count).toBe(tree.geometry.getAttribute('position').count);
      expect(new Set(Array.from(color.array).map((v) => v.toFixed(4))).size).toBeGreaterThan(50);
      tree.geometry.computeBoundingBox();
      expect(tree.geometry.boundingBox!.max.y).toBeLessThanOrEqual(45.01);
      expect(tree.geometry.boundingBox!.min.y).toBeGreaterThanOrEqual(0);
      expect(Array.from(tree.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(
        true,
      );
    }
    disposeObject(village);
  });

  it('faces slate tile courses upwards and keeps every wall/slate vertex color through batching', () => {
    const village = buildVillage(getPainting('starry'));
    let roofs = 0,
      walls = 0;
    village.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name === 'Individual blue slate courses') {
        roofs++;
        const normal = object.geometry.getAttribute('normal');
        for (let i = 0; i < normal.count; i++) expect(normal.getY(i)).toBeGreaterThan(0.5);
      }
      if (object.name === 'Broken blue plaster brushwork') walls++;
    });
    expect(roofs).toBeGreaterThan(20);
    expect(walls).toBe(roofs);
    const errors = vi.spyOn(console, 'error');
    const batch = batchStatic(village);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
    let triangles = 0;
    batch.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      triangles +=
        (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      if ((object.material as THREE.MeshStandardMaterial).vertexColors)
        expect(object.geometry.getAttribute('color').count).toBe(
          object.geometry.getAttribute('position').count,
        );
    });
    expect(batch.children.length).toBeLessThan(20);
    expect(triangles).toBeLessThan(150_000);
    disposeObject(batch);
  });
});
