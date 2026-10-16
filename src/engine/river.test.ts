import { describe, expect, it, vi } from 'vitest';
import { Group, ShaderMaterial, PerspectiveCamera, Scene, Vector3, type WebGLRenderer } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { getPainting } from '../data/paintings';
import { buildRiver } from './river';
import { createLandscapeSky } from './atmosphere';

describe('still river resources', () => {
  it('moves the hull waterline mask with the Sakura boat on every quality tier', () => {
    for (const quality of ['low', 'balanced', 'high'] as const) {
      const river = buildRiver(getPainting('sakura'), quality);
      try {
        river.setSakuraHull([3, .06, -20], [0, Math.PI / 2, 0]);
        const material = river.mesh.material as ShaderMaterial;
        expect(material.uniforms.uSakuraHullActive.value).toBe(1);
        const local = new Vector3(3, .06, -22).applyMatrix4(material.uniforms.uSakuraHullInverse.value);
        expect(local.x).toBeCloseTo(2);
        expect(local.z).toBeCloseTo(0);
        expect(material.fragmentShader).toContain('if (abs(hull.z) < halfWidth) discard');
        river.setSakuraHull([-10, .08, -60], [0, 0, .02]);
        expect(new Vector3(-10, .08, -60).applyMatrix4(material.uniforms.uSakuraHullInverse.value).length()).toBeLessThan(1e-10);
      } finally { river.dispose(); }
    }
    const other = buildRiver(getPainting('qianli'), 'low');
    other.setSakuraHull([0, 0, 0], [0, 0, 0]);
    expect((other.mesh.material as ShaderMaterial).uniforms.uSakuraHullActive.value).toBe(0);
    other.dispose();
  });
  it('uses one sun direction for the Sakura sky and water, without changing other rivers', () => {
    const sakura = getPainting('sakura');
    const river = buildRiver(sakura, 'balanced');
    const sky = createLandscapeSky(sakura);
    const other = buildRiver(getPainting('qianli'), 'low');
    const water = (river.mesh.material as ShaderMaterial).uniforms;
    const atmosphere = (sky.material as ShaderMaterial).uniforms;
    expect(water.uSunDirection.value.equals(atmosphere.uSunDirection.value)).toBe(true);
    expect(water.uSakura.value).toBe(1);
    expect((other.mesh.material as ShaderMaterial).uniforms.uSakura.value).toBe(0);
    river.dispose(); other.dispose(); sky.geometry.dispose(); (sky.material as ShaderMaterial).dispose();
  });
  it('refreshes moving or zoomed views immediately while throttling only stationary captures', () => {
    const river = buildRiver(getPainting('wuhan'), 'high');
    const scene = new Scene(),
      camera = new PerspectiveCamera(39, 1.6, 0.1, 1600);
    scene.add(river.mesh);
    camera.position.set(-12, 5, -4);
    camera.lookAt(0, 3, -140);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    const render = vi.fn();
    const renderer = {
      xr: { enabled: false },
      shadowMap: { autoUpdate: false },
      getRenderTarget: () => null,
      setRenderTarget: vi.fn(),
      autoClear: true,
      state: { buffers: { depth: { setMask: vi.fn() } } },
      render,
    } as unknown as WebGLRenderer;
    const frame = (time: number) => {
      river.update(time, 0);
      river.mesh.onBeforeRender(
        renderer,
        scene,
        camera,
        river.mesh.geometry,
        river.mesh.material as ShaderMaterial,
        null!,
      );
    };
    try {
      frame(0);
      frame(1 / 60);
      expect(render).toHaveBeenCalledTimes(1);
      camera.position.x += 0.01;
      camera.updateMatrixWorld();
      frame(1 / 60);
      expect(render).toHaveBeenCalledTimes(2);
      camera.zoom = 1.1;
      camera.updateProjectionMatrix();
      frame(1 / 60);
      expect(render).toHaveBeenCalledTimes(3);
      frame(1 / 60 + 1 / 30 - 1e-12);
      expect(render).toHaveBeenCalledTimes(4);
      frame(0);
      expect(render).toHaveBeenCalledTimes(5);
    } finally {
      river.dispose();
    }
  });
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
