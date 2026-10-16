import * as THREE from 'three';
import { disposeObject } from './resources';

/** Incremental material merge: no multi-hundred-thousand-vertex synchronous final merge. */
export function* batchQingmingSteps(source: THREE.Group): Generator<void, THREE.Group> {
  const result = new THREE.Group();
  const buckets = new Map<string, { material: THREE.Material; parts: THREE.BufferGeometry[] }>();
  const stack: THREE.Object3D[] = [source];
  let completed = false;
  let pending: THREE.BufferGeometry | undefined;
  try {
    let work = 0;
    while (stack.length) {
      const object = stack.pop()!;
      object.updateMatrix();
      if (object.parent)
        object.matrixWorld.multiplyMatrices(object.parent.matrixWorld, object.matrix);
      else object.matrixWorld.copy(object.matrix);
      stack.push(...object.children);
      if (object instanceof THREE.Mesh && !Array.isArray(object.material)) {
        const mat = object.material as THREE.MeshStandardMaterial;
        const key = `${mat.type}-${mat.color?.getHexString()}-${mat.emissive?.getHexString()}-${mat.side}-${mat.emissiveIntensity}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { material: mat.clone(), parts: [] };
          buckets.set(key, bucket);
        }
        const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
        geometry.deleteAttribute('uv');
        bucket.parts.push(geometry);
      }
      if (++work % 48 === 0) yield;
    }
    for (const { material, parts } of buckets.values()) {
      let vertices = 0,
        indices = 0;
      for (const part of parts) {
        vertices += part.getAttribute('position').count;
        indices += part.index?.count ?? part.getAttribute('position').count;
      }
      pending = new THREE.BufferGeometry();
      const names = Object.keys(parts[0]!.attributes);
      for (const name of names) {
        const attribute = parts[0]!.getAttribute(name);
        pending.setAttribute(
          name,
          new THREE.BufferAttribute(
            new Float32Array(vertices * attribute.itemSize),
            attribute.itemSize,
          ),
        );
      }
      const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
      let vertexOffset = 0,
        indexOffset = 0;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]!;
        for (const name of names) {
          const attribute = part.getAttribute(name);
          (pending.getAttribute(name).array as Float32Array).set(
            attribute.array,
            vertexOffset * attribute.itemSize,
          );
        }
        const count = part.index?.count ?? part.getAttribute('position').count;
        for (let j = 0; j < count; j++)
          index[indexOffset + j] = vertexOffset + (part.index?.getX(j) ?? j);
        indexOffset += count;
        vertexOffset += part.getAttribute('position').count;
        if (i % 48 === 47) yield;
      }
      pending.setIndex(new THREE.BufferAttribute(index, 1));
      result.add(new THREE.Mesh(pending, material));
      pending = undefined;
      yield;
    }
    // Normal completion releases source resources in small blocks too.
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    source.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        materials.add(material);
    });
    let count = 0;
    for (const geometry of geometries) {
      geometry.dispose();
      if (++count % 96 === 0) yield;
    }
    for (const material of materials) {
      material.dispose();
      if (++count % 96 === 0) yield;
    }
    for (const bucket of buckets.values()) {
      for (const part of bucket.parts) {
        part.dispose();
        if (++count % 96 === 0) yield;
      }
      bucket.parts.length = 0;
    }
    source.clear();
    completed = true;
    return result;
  } finally {
    pending?.dispose();
    for (const bucket of buckets.values()) {
      bucket.parts.forEach((part) => part.dispose());
      if (!completed) bucket.material.dispose();
    }
    if (!completed) {
      disposeObject(result);
      disposeObject(source);
    }
  }
}
