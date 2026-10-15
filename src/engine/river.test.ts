import { describe, expect, it } from 'vitest';
import { Group, ShaderMaterial } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { getPainting } from '../data/paintings';
import { buildRiver } from './river';

describe('still river resources', () => {
  it('computes horizon absorption per fragment rather than from distant quad corners', () => {
    const river = buildRiver(getPainting('guilin'), 'balanced');
    const material = river.mesh.material as ShaderMaterial;
    expect(material.vertexShader).not.toContain('vDistance');
    expect(material.fragmentShader).toContain('float viewDistance = length(vView)');
    expect(material.fragmentShader).toContain('smoothstep(210.0, 650.0, viewDistance)');
    river.dispose();
  });
  it('uses bounded reflection targets for balanced and high quality', () => {
    for (const [quality, resolution] of [
      ['balanced', 512],
      ['high', 1024],
    ] as const) {
      const river = buildRiver(getPainting('qianli'), quality);
      expect(river.mesh).toBeInstanceOf(Reflector);
      const target = (river.mesh as Reflector).getRenderTarget();
      expect(target.width).toBe(resolution);
      expect(target.height).toBe(resolution);
      expect(target.samples).toBe(0);
      river.dispose();
    }
  });

  it('low quality has no reflection target and clamps invalid animation input', () => {
    const river = buildRiver(getPainting('fuchun'), 'low');
    expect(river.mesh).not.toBeInstanceOf(Reflector);
    const uniforms = (river.mesh.material as ShaderMaterial).uniforms;
    expect(uniforms.uHasReflection!.value).toBe(0);
    river.update(Number.NaN, 8);
    expect(uniforms.uTime!.value).toBe(0);
    expect(uniforms.uNight!.value).toBe(1);
    river.dispose();
  });

  it('detaches the mesh and releases owned GPU resources exactly once', () => {
    const river = buildRiver(getPainting('xishan'), 'balanced');
    const parent = new Group();
    parent.add(river.mesh);
    let geometries = 0,
      materials = 0,
      targets = 0;
    river.mesh.geometry.addEventListener('dispose', () => geometries++);
    (river.mesh.material as ShaderMaterial).addEventListener('dispose', () => materials++);
    (river.mesh as Reflector).getRenderTarget().addEventListener('dispose', () => targets++);
    river.dispose();
    river.dispose();
    expect(parent.children).toHaveLength(0);
    expect([geometries, materials, targets]).toEqual([1, 1, 1]);
  });
});
