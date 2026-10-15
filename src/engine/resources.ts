import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      bucket.geometries.push(flat);
    } else bucket.geometries.push(geometry);
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
