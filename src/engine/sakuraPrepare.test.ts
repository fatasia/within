import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { compileSakuraPrograms } from './sakuraPrepare';

describe('Sakura program preparation', () => {
  it('prepares canvas and reflection variants without retaining a render target across awaits', async () => {
    const scene = new THREE.Scene(), object = new THREE.Group(), camera = new THREE.PerspectiveCamera();
    const reflection = new THREE.WebGLRenderTarget(8, 8);
    scene.add(Object.assign(new THREE.Object3D(), { isReflector: true, getRenderTarget: () => reflection }));
    let current: THREE.WebGLRenderTarget | null = null;
    const passes: (THREE.WebGLRenderTarget | null)[] = [];
    const renderer = {
      info: { programs: [] },
      getRenderTarget: () => current,
      setRenderTarget: (target: THREE.WebGLRenderTarget | null) => { current = target; },
      compileAsync: vi.fn(async () => { passes.push(current); await Promise.resolve(); expect(current).toBeNull(); return object; }),
    } as unknown as THREE.WebGLRenderer;
    await compileSakuraPrograms(renderer, object, scene, camera);
    expect(passes).toEqual([null, reflection]); expect(current).toBeNull(); reflection.dispose();
  });
  it('awaits in-flight first-use work when independent builders share a program', async () => {
    const program = { program: {}, usedTimes: 1, isReady: () => true, getUniforms: vi.fn(), getAttributes: vi.fn() };
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
    const renderer = { info: { programs: [program] }, compileAsync: async () => scene } as unknown as THREE.WebGLRenderer;
    await Promise.all([compileSakuraPrograms(renderer, scene, scene, camera), compileSakuraPrograms(renderer, scene, scene, camera)]);
    expect(program.getUniforms).toHaveBeenCalledTimes(1);
    expect(program.getAttributes).toHaveBeenCalledTimes(1);
  });

});
