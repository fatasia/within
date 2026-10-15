import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { attachVegetationMotion } from './vegetationMotion';
import { disposeObject } from './resources';
import { buildForest } from './props';
import { getPainting } from '../data/paintings';

function mesh(name: string, material = new THREE.MeshStandardMaterial()) {
  const result = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 2, 1), material, 2);
  result.name = name;
  const transform = new THREE.Matrix4().makeTranslation(2, 3, 4);
  result.setMatrixAt(0, transform);
  result.setMatrixAt(1, transform.makeTranslation(7, 5, 8));
  return result;
}
function compile(material: THREE.MeshStandardMaterial) {
  const shader = {
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    uniforms: {} as Record<string, THREE.IUniform>,
  };
  material.onBeforeCompile(
    shader as Parameters<typeof material.onBeforeCompile>[0],
    {} as THREE.WebGLRenderer,
  );
  return shader;
}

describe('low-frequency vegetation motion', () => {
  it('recognizes real independent foliage and never animates roots, houses or anonymous batches', () => {
    const content = buildForest(getPainting('qianli'));
    const roots = content.getObjectByName('Bent pine trunks') as THREE.Mesh;
    const branches = content.getObjectByName('Irregular pine branches') as THREE.Mesh;
    const rootsMaterial = roots.material,
      branchMaterial = branches.material;
    content.add(mesh('Temple roof'), mesh(''), mesh('Pine-green traveler robe'));
    const controller = attachVegetationMotion(content);
    expect(controller.meshCount).toBe(1);
    expect(roots.material).toBe(rootsMaterial);
    expect(branches.material).toBe(branchMaterial);
    controller.dispose();
    disposeObject(content);
  });

  it('shares absolute capture time, computes spatial phase and pins the correct botanical bases', () => {
    const content = new THREE.Group();
    const leaves = mesh('Folded lanceolate bamboo leaves');
    const firs = mesh('Rondane fir silhouettes');
    content.add(leaves, firs);
    const matrices = [...leaves.instanceMatrix.array];
    const vertices = [...leaves.geometry.getAttribute('position').array];
    const controller = attachVegetationMotion(content);
    const leafShader = compile(leaves.material),
      firShader = compile(firs.material);
    expect(leafShader.uniforms.uVegetationTime).toBe(firShader.uniforms.uVegetationTime);
    expect(leafShader.uniforms.uVegetationAnchor!.value.x).toBe(1);
    expect(firShader.uniforms.uVegetationAnchor!.value.x).toBe(2);
    expect(leafShader.vertexShader).toContain('instanceMatrix * vegetationWorld');
    expect(leafShader.vertexShader).toContain(
      'vegetationWorld.x * 0.11 + vegetationWorld.z * 0.085',
    );
    expect(leafShader.vertexShader).toContain('max(0.0, position.z)');
    expect(firShader.vertexShader).toContain('position.y - uVegetationAnchor.y');
    expect(leafShader.uniforms.uVegetationAmplitude!.value).toBeLessThan(0.02);
    controller.update(123.4);
    expect(leafShader.uniforms.uVegetationTime!.value).toBe(123.4);
    controller.update(Number.NaN);
    expect(leafShader.uniforms.uVegetationTime!.value).toBe(123.4);
    controller.update(8);
    expect(firShader.uniforms.uVegetationTime!.value).toBe(8);
    expect([...leaves.instanceMatrix.array]).toEqual(matrices);
    expect([...leaves.geometry.getAttribute('position').array]).toEqual(vertices);
    expect(content.children).toHaveLength(2);
    controller.dispose();
    controller.update(40);
    expect(leafShader.uniforms.uVegetationTime!.value).toBe(8);
    disposeObject(content);
  });

  it('isolates shared materials and preserves existing compile hooks and program keys', () => {
    const source = new THREE.MeshStandardMaterial();
    source.customProgramCacheKey = () => 'existing-surface-v2';
    source.onBeforeCompile = (shader) => {
      shader.uniforms.existing = { value: 7 };
    };
    const content = new THREE.Group(),
      foliage = mesh('Broken needle sprays', source);
    const house = mesh('House', source);
    content.add(foliage, house);
    const controller = attachVegetationMotion(content);
    expect(house.material).toBe(source);
    expect(foliage.material).not.toBe(source);
    expect(compile(foliage.material).uniforms.existing!.value).toBe(7);
    expect(foliage.material.customProgramCacheKey()).toBe(
      'existing-surface-v2|within-vegetation-v1',
    );
    expect(compile(source).uniforms.uVegetationTime).toBeUndefined();
    const disposed = vi.fn();
    foliage.material.addEventListener('dispose', disposed);
    expect(attachVegetationMotion(content)).toBe(controller);
    controller.dispose();
    controller.dispose();
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(foliage.material).toBe(source);
    disposeObject(content);
  });

  it('releases detached source materials even if the caller disposes the scene directly', () => {
    const content = new THREE.Group(),
      source = new THREE.MeshStandardMaterial();
    const disposed = vi.fn();
    source.addEventListener('dispose', disposed);
    content.add(
      mesh('Broken needle sprays', source),
      mesh('Open cliff pine foliage sprays', source),
    );
    const controller = attachVegetationMotion(content);
    disposeObject(content);
    expect(disposed).toHaveBeenCalledTimes(1);
    controller.dispose();
    expect(disposed).toHaveBeenCalledTimes(1);
    content.add(mesh('Broken needle sprays'));
    const refreshed = attachVegetationMotion(content);
    expect(refreshed).not.toBe(controller);
    expect(refreshed.meshCount).toBe(1);
    refreshed.dispose();
    disposeObject(content);
  });
});
