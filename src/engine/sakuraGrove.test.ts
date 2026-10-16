import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { sakura } from './sakuraVendor/trees.js';
import { buildSakuraGrove } from './sakuraGrove';
import { disposeObject } from './resources';

describe('Sakura Fantasy tree integration', () => {
  it('keeps the original blossom sprays at both timber LODs', () => {
    for (const seed of [101, 202, 303]) {
      const near = sakura(seed), far = sakura(seed, true);
      try {
        expect(far.wood.index!.count).toBeLessThan(near.wood.index!.count * 0.4);
        expect(Array.from(far.leaf.attributes.position.array)).toEqual(Array.from(near.leaf.attributes.position.array));
        expect(near.leaf.attributes.aAux.count).toBe(near.leaf.attributes.position.count);
        expect(near.leaf.attributes.aCtr.count).toBe(near.leaf.attributes.position.count);
        expect(near.wood.boundingSphere!.radius).toBeGreaterThan(3);
        for (const g of [near.wood, near.leaf, far.wood, far.leaf]) {
          expect(Array.from(g.attributes.position.array).every(Number.isFinite)).toBe(true);
        }
      } finally { Object.values(near).forEach(g => g.dispose()); Object.values(far).forEach(g => g.dispose()); }
    }
  });

  it('chooses timber detail per camera without changing the canopy and disposes its atlas', async () => {
    const textures: THREE.Texture[] = [];
    const mock = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      const t = new THREE.Texture<HTMLImageElement>(); textures.push(t); queueMicrotask(() => onLoad?.(t)); return t;
    });
    const root = new THREE.Group();
    try {
      const grove = buildSakuraGrove(root, [0, 1, 2].map(i => ({ position: [i * 10, 0, 0] })));
      await grove.ready; root.updateMatrixWorld(true);
      const near = root.getObjectByName('sakura-fantasy-branches-101-near') as THREE.InstancedMesh;
      const far = root.getObjectByName('sakura-fantasy-branches-101-distant') as THREE.InstancedMesh;
      const camera = new THREE.PerspectiveCamera();
      const render = (mesh: THREE.InstancedMesh) => mesh.onBeforeRender({} as THREE.WebGLRenderer, new THREE.Scene(), camera, mesh.geometry, mesh.material as THREE.Material, null!);
      camera.position.set(0, 2, 10); camera.updateMatrixWorld(); render(near); render(far);
      expect([near.count, far.count]).toEqual([1, 0]);
      camera.position.set(0, 2, 100); camera.updateMatrixWorld(); render(near); render(far);
      expect([near.count, far.count]).toEqual([0, 1]);
      const oldVersion = far.instanceMatrix.version;
      render(far);
      expect(far.instanceMatrix.version).toBe(oldVersion);
      grove.setQuality('low');
      camera.position.set(0, 2, 10); camera.updateMatrixWorld(); render(near); render(far);
      expect([near.count, far.count]).toEqual([0, 1]);
      grove.setQuality('high'); render(near); render(far);
      expect([near.count, far.count]).toEqual([1, 0]);
      const flower = root.getObjectByName('sakura-fantasy-photo-blossoms-101') as THREE.InstancedMesh;
      const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <normal_fragment_maps>\n#include <lights_fragment_end>' };
      (flower.material as THREE.Material).onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
      expect(shader.fragmentShader).toContain('normal = normalize(vNormal)');
      expect(shader.fragmentShader).toContain('smoothstep(0.12, 0.42, facing)');
      grove.update(7);
      expect((shader.uniforms as Record<string, {value: number}>).uTime.value).toBe(7);
      const disposed = textures.map(t => vi.spyOn(t, 'dispose'));
      disposeObject(root);
      disposed.forEach(spy => expect(spy).toHaveBeenCalled());
    } finally { mock.mockRestore(); }
  });
});
