import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { batchStatic, disposeObject, estimateSceneBytes } from './resources';

function expandedPositions(geometry: THREE.BufferGeometry): number[] {
  const position = geometry.getAttribute('position');
  return Array.from({ length: geometry.index?.count ?? position.count }, (_, index) => {
    const vertex = geometry.index?.getX(index) ?? index;
    return [position.getX(vertex), position.getY(vertex), position.getZ(vertex)];
  }).flat();
}

describe('indexed static material batches', () => {
  it('estimates retained buffers once per shared allocation, including instances and morphs', () => {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    group.add(new THREE.Mesh(geometry, material));
    const once = estimateSceneBytes(group);
    group.add(new THREE.Mesh(geometry, material));
    expect(estimateSceneBytes(group)).toBe(once);
    geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(new Float32Array(72), 3)];
    const instances = new THREE.InstancedMesh(geometry, material, 3);
    group.add(instances);
    expect(estimateSceneBytes(group)).toBe(once + (72 * 4 + 3 * 16 * 4) * 2);
    disposeObject(group);
  });
  it('preserves every transformed triangle while mixing indexed and unindexed parts', () => {
    const root = new THREE.Group();
    root.position.set(4, -2, 8);
    root.rotation.y = 0.37;
    root.scale.set(1.3, 0.8, 1.1);
    const material = new THREE.MeshStandardMaterial({ color: '#756a51', roughness: 0.9 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1), material);
    box.position.set(-2, 1, 0);
    box.rotation.z = -0.2;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).toNonIndexed(), material);
    plane.position.set(3, 0.4, -1);
    root.add(box, plane);
    root.updateMatrixWorld(true);
    const expected: number[] = [];
    for (const object of [box, plane]) {
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      expected.push(...expandedPositions(geometry));
      geometry.dispose();
    }
    const result = batchStatic(root);
    expect(result.children).toHaveLength(1);
    const batch = result.children[0] as THREE.Mesh;
    expect(batch.geometry.index).not.toBeNull();
    const actual = expandedPositions(batch.geometry);
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 5));
    expect(batch.geometry.getAttribute('uv')).toBeUndefined();
    expect(root.children).toHaveLength(0);
    disposeObject(result);
  });

  it('keeps the retained material visual properties without changing the grouping contract', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: '#667253',
      emissive: '#252010',
      emissiveIntensity: 0.35,
      roughness: 0.83,
      metalness: 0.04,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      flatShading: true,
    });
    root.add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), material));
    const result = batchStatic(root);
    const clone = (result.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    expect(clone).not.toBe(material);
    expect(clone.color.equals(material.color)).toBe(true);
    expect(clone.emissive.equals(material.emissive)).toBe(true);
    for (const property of [
      'emissiveIntensity',
      'roughness',
      'metalness',
      'transparent',
      'opacity',
      'side',
      'depthWrite',
      'flatShading',
    ] as const)
      expect(clone[property]).toBe(material[property]);
    disposeObject(result);
  });

  it('reduces uploaded vertex bytes while retaining triangle and draw counts', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: '#899177' });
    let oldVertices = 0,
      expectedVertices = 0,
      triangles = 0;
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.SphereGeometry(1, 16, 10);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = i * 3;
      oldVertices += geometry.index!.count;
      expectedVertices += geometry.getAttribute('position').count;
      triangles += geometry.index!.count / 3;
      root.add(mesh);
    }
    const result = batchStatic(root);
    expect(result.children).toHaveLength(1);
    const geometry = (result.children[0] as THREE.Mesh).geometry;
    expect(geometry.index!.count / 3).toBe(triangles);
    expect(geometry.getAttribute('position').count).toBe(expectedVertices);
    // Previous batches uploaded position + normal for every expanded triangle vertex.
    const beforeBytes = oldVertices * 6 * Float32Array.BYTES_PER_ELEMENT;
    const afterBytes =
      geometry.getAttribute('position').array.byteLength +
      geometry.getAttribute('normal').array.byteLength +
      geometry.index!.array.byteLength;
    expect(afterBytes).toBeLessThan(beforeBytes * 0.5);
    disposeObject(result);
  });

  it('chooses 32-bit indices for a large unindexed input', () => {
    const root = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(66000 * 3), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(66000 * 3), 3));
    root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
    const result = batchStatic(root);
    const index = (result.children[0] as THREE.Mesh).geometry.index!;
    expect(index.array).toBeInstanceOf(Uint32Array);
    expect(index.getX(65999)).toBe(65999);
    disposeObject(result);
  });

  it('keeps disposal deduplicated for shared geometry, material and textures', () => {
    const root = new THREE.Group();
    const geometry = new THREE.BoxGeometry(),
      texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const counts = { geometry: 0, material: 0, texture: 0, instance: 0 };
    geometry.addEventListener('dispose', () => counts.geometry++);
    material.addEventListener('dispose', () => counts.material++);
    texture.addEventListener('dispose', () => counts.texture++);
    const instances = new THREE.InstancedMesh(geometry, material, 2);
    instances.addEventListener('dispose', () => counts.instance++);
    root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material), instances);
    disposeObject(root);
    expect(counts).toEqual({ geometry: 1, material: 1, texture: 1, instance: 1 });
    expect(root.children).toHaveLength(0);
  });
});
