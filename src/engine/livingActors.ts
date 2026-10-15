import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Painting } from '../types';
import { clamp } from './math';
import { disposeObject } from './resources';

export interface LivingActors {
  group: THREE.Group;
  update(time: number): void;
  dispose(): void;
}

/** Preserve the original stopped cart, rather than inventing a walk through the gate crowd. */
export function prepareLivingTransport(source: THREE.Group): THREE.Mesh {
  source.updateMatrixWorld(true);
  const inverse = source.matrixWorld.clone().invert();
  const parts: THREE.BufferGeometry[] = [];
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
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
  });
  const geometry = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!geometry) throw new Error('Unable to preserve the cart animation geometry');
  geometry.morphTargetsRelative = true;
  // Normal morphs keep the subtle bends consistent in the lit and shadow passes.
  const base = geometry.getAttribute('position'),
    normals = geometry.getAttribute('normal');
  geometry.morphAttributes.normal = geometry.morphAttributes.position!.map((delta) => {
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
    return new THREE.BufferAttribute(differences, 3);
  });
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
  return actor;
}

/** Bind existing actors only. Quiet paintings do not acquire extra crowds or vehicles. */
export function buildLivingActors(painting: Painting, content?: THREE.Object3D): LivingActors {
  const group = new THREE.Group();
  group.name = 'Living details';
  const candidate =
    painting.id === 'qingming' ? content?.getObjectByName('gate-donkey-cart') : null;
  let actor =
    candidate instanceof THREE.Mesh && candidate.userData.livingTransport ? candidate : null;
  const initial = actor?.morphTargetInfluences?.slice();
  return {
    group,
    update(time) {
      if (!actor || !Number.isFinite(time)) return;
      const weights = actor.morphTargetInfluences!;
      // Continuous local cycles: planted hooves, shoes and wheels never move or slide.
      weights[0] = 0.5 + 0.5 * Math.sin((time * Math.PI) / 4);
      weights[1] = Math.sin((time * Math.PI) / 7) ** 3;
      weights[2] = 0.5 - 0.5 * Math.cos((time * Math.PI) / 9);
      weights[3] = 0.5 - 0.5 * Math.cos((time * Math.PI) / 9);
    },
    dispose() {
      if (actor && initial) actor.morphTargetInfluences!.splice(0, initial.length, ...initial);
      actor = null;
      // Geometry belongs to content, not this binding; content disposal releases it once.
      group.clear();
    },
  };
}
