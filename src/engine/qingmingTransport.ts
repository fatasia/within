import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from './math';
import { disposeObject } from './resources';

/** Same four stopped-cart channels as prepareLivingTransport, yielding per part and normal target. */
export function* prepareQingmingTransportSteps(source: THREE.Group): Generator<void, THREE.Mesh> {
  source.updateMatrixWorld(true);
  const inverse = source.matrixWorld.clone().invert();
  const parts: THREE.BufferGeometry[] = [];
  let merged: THREE.BufferGeometry | null = null;
  let completed = false;
  const meshes: THREE.Mesh[] = [];
  source.traverse((object) => {
    if (object instanceof THREE.Mesh && !Array.isArray(object.material)) meshes.push(object);
  });
  try {
    for (const object of meshes) {
      let part: THREE.Object3D | null = object;
      while (part && part !== source && !part.userData.livingPart) part = part.parent;
      const role: unknown = part?.userData.livingPart;
      const geometry = object.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      geometry.deleteAttribute('uv');
      const position = geometry.getAttribute('position');
      if (!geometry.index) geometry.setIndex(Array.from({ length: position.count }, (_, i) => i));
      const pigment = (object.material as THREE.MeshStandardMaterial).color;
      const colors = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) pigment.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.morphTargetsRelative = true;
      geometry.morphAttributes.position = Array.from({ length: 4 }, (_, channel) => {
        const delta = new Float32Array(position.count * 3);
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i),
            y = position.getY(i),
            z = position.getZ(i);
          if (channel === 0 && role === 'ear') delta[i * 3] = Math.max(0, y - 2) * 0.15;
          if (channel === 0 && object.name === 'donkey-body') {
            delta[i * 3 + 1] = (y - 1.2) * 0.018;
            delta[i * 3 + 2] = z * 0.015;
          }
          if (channel === 1 && role === 'tail') delta[i * 3 + 2] = clamp((1.27 - y) / 0.7) * 0.12;
          if (channel === 2 && role === 'handler') delta[i * 3] = clamp((y - 0.4) / 1) * 0.035;
          if (channel === 2 && role === 'lead')
            delta[i * 3] = clamp((x - 5.08) / 0.95) * clamp((y - 0.4) / 1) * 0.035;
          if (channel === 3 && role === 'load')
            delta[i * 3 + 1] = -0.018 * Math.max(0, 1 - Math.abs(y - 1.32) / 0.3);
        }
        return new THREE.BufferAttribute(delta, 3);
      });
      parts.push(geometry);
      yield;
    }
    const geometry = (merged = mergeGeometries(parts));
    yield;
    parts.forEach((part) => part.dispose());
    if (!geometry) throw new Error('Unable to preserve the cart animation geometry');
    geometry.morphTargetsRelative = true;
    // Normal morphs keep the subtle bends consistent in the lit and shadow passes.
    const base = geometry.getAttribute('position'),
      normals = geometry.getAttribute('normal');
    geometry.morphAttributes.normal = [];
    for (const delta of geometry.morphAttributes.position!) {
      const shape = new THREE.BufferGeometry();
      const positions = new Float32Array(base.count * 3);
      for (let i = 0; i < base.count; i++) {
        positions[i * 3] = base.getX(i) + delta.getX(i);
        positions[i * 3 + 1] = base.getY(i) + delta.getY(i);
        positions[i * 3 + 2] = base.getZ(i) + delta.getZ(i);
      }
      shape.setIndex(geometry.index!.clone());
      shape.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      shape.computeVertexNormals();
      const n = shape.getAttribute('normal'),
        differences = new Float32Array(base.count * 3);
      for (let i = 0; i < base.count; i++) {
        differences[i * 3] = n.getX(i) - normals.getX(i);
        differences[i * 3 + 1] = n.getY(i) - normals.getY(i);
        differences[i * 3 + 2] = n.getZ(i) - normals.getZ(i);
      }
      shape.dispose();
      geometry.morphAttributes.normal.push(new THREE.BufferAttribute(differences, 3));
      yield;
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const actor = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.95,
      }),
    );
    actor.name = 'gate-donkey-cart';
    actor.position.copy(source.position);
    actor.quaternion.copy(source.quaternion);
    actor.scale.copy(source.scale);
    actor.castShadow = actor.receiveShadow = true;
    actor.userData.livingTransport = true;
    actor.userData.motion = 'stopped-loading';
    actor.userData.interpretation = '局部停靠动作是动态演绎；不代表原作逐帧动作。';
    disposeObject(source);
    completed = true;
    return actor;
  } finally {
    parts.forEach((part) => part.dispose());
    if (!completed) {
      merged?.dispose();
      disposeObject(source);
    }
  }
}
