import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PAINTINGS } from '../data/paintings';
import { createWaterfall, updateWaterfall } from './waterfall';
import { groundHeight } from './terrain';
import { disposeObject } from './resources';

describe('Xishan fine flowing waterfall', () => {
  it('retains the existing narrow cliff path within one draw and 1200 triangles', () => {
    const painting = PAINTINGS.find((p) => p.id === 'xishan')!;
    const mesh = createWaterfall(painting);
    try {
      expect(mesh.geometry.parameters.radius).toBe(0.25);
      expect(mesh.geometry.index!.count / 3).toBe(1200);
      expect(mesh.children).toHaveLength(0);
      expect(mesh.material.depthWrite).toBe(false);
      const points = (mesh.geometry.parameters.path as THREE.CatmullRomCurve3).points;
      expect(points).toHaveLength(71);
      for (const { x, y, z } of points) {
        expect(y).toBeCloseTo(groundHeight(painting, x, z) + 0.28, 8);
        expect(x).toBeGreaterThan(13);
        expect(x).toBeLessThan(15);
      }
      expect(Array.from(mesh.geometry.attributes.position!.array).every(Number.isFinite)).toBe(
        true,
      );
    } finally {
      disposeObject(mesh);
    }
  });

  it('advances reproducible downward-flow uniforms without reallocating geometry', () => {
    const painting = PAINTINGS.find((p) => p.id === 'xishan')!;
    const mesh = createWaterfall(painting);
    try {
      const geometry = mesh.geometry;
      const uniforms = mesh.material.uniforms;
      updateWaterfall(mesh, 2.5, 0.35);
      expect(uniforms.uTime!.value).toBe(2.5);
      expect(uniforms.uNight!.value).toBe(0.35);
      updateWaterfall(mesh, 3.5, 2);
      expect(uniforms.uTime!.value).toBe(3.5);
      expect(uniforms.uNight!.value).toBe(1);
      expect(mesh.geometry).toBe(geometry);
      expect(mesh.material.fragmentShader).toContain('vHeight * 3.2 + uTime * 3.8');
      expect(mesh.material.fragmentShader).toContain('fog_fragment');
      updateWaterfall(mesh, Number.NaN, Number.POSITIVE_INFINITY);
      expect(uniforms.uTime!.value).toBe(0);
      expect(uniforms.uNight!.value).toBe(0);
    } finally {
      disposeObject(mesh);
    }
  });
});
