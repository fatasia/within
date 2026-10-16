import * as THREE from 'three';

export interface PackedGeometry {
  attributes: Record<string, { array: THREE.TypedArray; itemSize: number; normalized: boolean }>;
  index: Uint16Array | Uint32Array | null;
}
export interface SakuraTreeGeometry { wood: THREE.BufferGeometry; leaf: THREE.BufferGeometry }
export type PackedTree = { wood: PackedGeometry; leaf: PackedGeometry };

export function packGeometry(geometry: THREE.BufferGeometry): PackedGeometry {
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, {
      array: value.array, itemSize: value.itemSize, normalized: value.normalized,
    }])),
    index: geometry.index?.array as Uint16Array | Uint32Array | null ?? null,
  };
}

export function unpackGeometry(data: PackedGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const [key, value] of Object.entries(data.attributes)) {
    geometry.setAttribute(key, new THREE.BufferAttribute(value.array, value.itemSize, value.normalized));
  }
  if (data.index) geometry.setIndex(new THREE.BufferAttribute(data.index, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export function geometryTransfers(tree: PackedTree): ArrayBuffer[] {
  return [...new Set(Object.values(tree).flatMap(geometry => [
    ...Object.values(geometry.attributes).map(attribute => attribute.array.buffer as ArrayBuffer),
    ...(geometry.index ? [geometry.index.buffer as ArrayBuffer] : []),
  ]))];
}
