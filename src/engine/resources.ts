import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Conservative CPU/GPU buffer estimate used to bound retained, inactive scenes. */
export function estimateSceneBytes(object: THREE.Object3D): number {
  const arrays = new Set<ArrayBufferLike>();
  const textures = new Set<THREE.Texture>();
  let bytes = 0;
  object.traverse((child) => {
    if (!(
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.Points
    ))
      return;
    const attributes = [
      ...Object.values(child.geometry.attributes),
      ...Object.values(child.geometry.morphAttributes).flat(),
      child.geometry.index,
    ];
    if (child instanceof THREE.InstancedMesh)
      attributes.push(child.instanceMatrix, child.instanceColor);
    for (const attribute of attributes) {
      if (!attribute) continue;
      const array =
        attribute instanceof THREE.InterleavedBufferAttribute
          ? attribute.data.array
          : attribute.array;
      if (!arrays.has(array.buffer)) {
        arrays.add(array.buffer);
        bytes += array.buffer.byteLength * 2;
      }
    }
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      if (material instanceof THREE.ShaderMaterial)
        for (const uniform of Object.values(material.uniforms))
          if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
    }
  });
  for (const texture of textures) {
    const image = texture.image as { width?: number; height?: number } | undefined;
    bytes += (image?.width ?? 1) * (image?.height ?? 1) * 8;
  }
  return bytes;
}

/** Bake static architecture into a small number of material batches. */
export function batchStatic(group: THREE.Group): THREE.Group {
  group.updateMatrixWorld(true);
  const buckets = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >();
  group.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    const mat = object.material as THREE.MeshStandardMaterial;
    const key = `${mat.type}-${mat.color?.getHexString()}-${mat.emissive?.getHexString()}-${mat.side}-${mat.emissiveIntensity}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material: mat.clone(), geometries: [] };
      buckets.set(key, bucket);
    }
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.deleteAttribute('uv');
    // mergeGeometries requires consistent indexing. Index the few unindexed parts
    // instead of expanding every indexed roof, sphere and cylinder into triangles.
    if (!geometry.index) {
      const count = geometry.getAttribute('position').count;
      const indices = count > 65535 ? new Uint32Array(count) : new Uint16Array(count);
      for (let i = 0; i < count; i++) indices[i] = i;
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    bucket.geometries.push(geometry);
  });
  const result = new THREE.Group();
  for (const bucket of buckets.values()) {
    const merged = mergeGeometries(bucket.geometries);
    if (merged) result.add(new THREE.Mesh(merged, bucket.material));
    bucket.geometries.forEach((g) => g.dispose());
  }
  disposeObject(group);
  return result;
}
export function disposeObject(object: THREE.Object3D): void {
  const materials = new Set<THREE.Material>(),
    geometries = new Set<THREE.BufferGeometry>(),
    textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) child.dispose();
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.Points
    ) {
      geometries.add(child.geometry);
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => materials.add(mat));
    }
  });
  materials.forEach((mat) => {
    Object.values(mat).forEach((value) => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
    if (mat instanceof THREE.ShaderMaterial) {
      Object.values(mat.uniforms).forEach((uniform) => {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value);
      });
    }
    mat.dispose();
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  object.clear();
}
