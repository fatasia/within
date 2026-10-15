import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { QINGMING } from '../data/qingming';
import { buildQingming, qingmingBridgeHeight, qingmingRiver } from './qingming';
import { disposeObject } from './resources';

describe('Qingming city', () => {
  it('joins the pedestrian deck to both riverbanks', () => {
    const center = qingmingRiver(-20);
    expect(qingmingBridgeHeight(center - 22)).toBeCloseTo(2.8);
    expect(qingmingBridgeHeight(center + 22)).toBeCloseTo(2.8);
    expect(qingmingBridgeHeight(center)).toBeCloseTo(9.5);
  });

  it('keeps the batched model within the geometry budget', () => {
    const model = buildQingming(QINGMING);
    let triangles = 0,
      meshes = 0;
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      const position = object.geometry.attributes.position!;
      triangles += (object.geometry.index?.count ?? position.count) / 3;
      expect(position.array.every(Number.isFinite)).toBe(true);
    });
    expect(meshes).toBeLessThan(40);
    expect(triangles).toBeLessThan(450_000);
    expect(triangles).toBeGreaterThan(200_000);
    disposeObject(model);
  }, 20_000);
});
