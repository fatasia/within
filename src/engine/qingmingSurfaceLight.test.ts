import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { installQingmingSurfaceLight } from './qingmingSurfaceLight';
import { qingmingLightDirection } from './qingmingEnvironment';
import { qingmingBackdropGeometry } from './qingmingBackdrop';

describe('Qingming surface atmosphere', () => {
  it('preserves material hooks and shares a bounded clock across material batches', () => {
    const root = new THREE.Group();
    const first = new THREE.MeshStandardMaterial();
    const second = new THREE.MeshStandardMaterial();
    const basic = new THREE.MeshBasicMaterial();
    const geometry = new THREE.BoxGeometry();
    const previous = vi.fn();
    first.onBeforeCompile = previous;
    first.customProgramCacheKey = () => 'window-light';
    root.add(new THREE.Mesh(geometry, [first, second, basic]), new THREE.Mesh(geometry, first));
    const update = installQingmingSurfaceLight(root);
    const compile = (material: THREE.MeshStandardMaterial) => {
      const shader = {
        uniforms: {},
        vertexShader: '#include <project_vertex>',
        fragmentShader: '#include <lights_fragment_end>',
      } as THREE.WebGLProgramParametersWithUniforms;
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      return shader;
    };
    try {
      const a = compile(first),
        b = compile(second);
      expect(previous).toHaveBeenCalledOnce();
      expect(a.uniforms.uQmTime).toBe(b.uniforms.uQmTime);
      expect(a.vertexShader).toContain('instanceMatrix*qmPosition');
      expect(a.vertexShader).toContain('vec4(transformed,1.)');
      expect(a.fragmentShader).toContain('reflectedLight.directDiffuse');
      expect(a.vertexShader).toContain('qmCloud(qmCloudPoint)');
      expect(a.fragmentShader).not.toContain('qmNoise');
      expect(first.customProgramCacheKey()).toBe('window-light:qingming-cloud-light-v1');
      expect(basic.userData.qingmingAtmosphere).toBeUndefined();
      update(24, 0.4);
      expect(a.uniforms.uQmTime!.value).toBe(24);
      expect(a.uniforms.uQmSun!.value.distanceTo(qingmingLightDirection(0.4))).toBe(0);
      update(25, 8);
      expect(a.uniforms.uQmNight!.value).toBe(1);
      update(NaN, 0);
      expect(a.uniforms.uQmTime!.value).toBe(25);
      const hook = first.onBeforeCompile;
      installQingmingSurfaceLight(root);
      expect(first.onBeforeCompile).toBe(hook);
    } finally {
      geometry.dispose();
      first.dispose();
      second.dispose();
      basic.dispose();
    }
  });

  it('builds deterministic finite flatland in one geometry within its triangle allowance', () => {
    const a = qingmingBackdropGeometry(),
      b = qingmingBackdropGeometry();
    try {
      const positions = a.getAttribute('position');
      expect(positions.count / 3).toBeLessThan(5000);
      expect(a.index).toBeNull();
      for (const attribute of ['position', 'normal', 'color']) {
        const values = Array.from(a.getAttribute(attribute).array);
        expect(values.every(Number.isFinite)).toBe(true);
        expect(values).toEqual(Array.from(b.getAttribute(attribute).array));
      }
      a.computeBoundingBox();
      expect(a.boundingBox!.min.y).toBeCloseTo(2.79, 4);
      expect(a.boundingBox!.max.y).toBeLessThan(18);
      expect(a.boundingBox!.min.x).toBe(-900);
      expect(a.boundingBox!.max.x).toBe(900);
    } finally {
      a.dispose();
      b.dispose();
    }
  });
});
