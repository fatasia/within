import * as THREE from 'three';

type MotionKind = 'crown' | 'leaf' | 'rooted';
const eligible = new Map<string, MotionKind>([
  ['Broken needle sprays', 'crown'],
  ['Open cliff pine foliage sprays', 'crown'],
  ['Open broadleaf riverbank foliage', 'crown'],
  ['Far shore layered evergreen foliage', 'crown'],
  ['Opposite glossy osmanthus leaves', 'leaf'],
  ['Distant osmanthus leaf sprays', 'leaf'],
  ['Folded lanceolate bamboo leaves', 'leaf'],
  ['Curved streamside sedges', 'rooted'],
  ['Rondane fir silhouettes', 'rooted'],
  ['Rondane bare tree branches', 'rooted'],
]);

export interface VegetationMotion {
  readonly meshCount: number;
  /** Absolute seconds, shared by live playback and deterministic offline capture. */
  update(seconds: number): void;
  /** Restore source materials before removing or rebuilding the scene. Idempotent. */
  dispose(): void;
}

type Binding = {
  mesh: THREE.Mesh;
  source: THREE.MeshStandardMaterial;
  animated: THREE.MeshStandardMaterial;
  onDispose: () => void;
};
const attached = new WeakMap<THREE.Object3D, VegetationMotion>();
const declarations = `
uniform float uVegetationTime;
uniform float uVegetationAmplitude;
// x: crown/leaf/rooted mode, y: base height, z: reciprocal height, w: reciprocal reach.
uniform vec4 uVegetationAnchor;
`;
const displacement = `
// World coordinates provide a coherent breeze across separately instanced sprays.
mat3 vegetationBasis = mat3(modelMatrix);
vec4 vegetationWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  vegetationWorld = instanceMatrix * vegetationWorld;
  vegetationBasis = vegetationBasis * mat3(instanceMatrix);
#endif
vegetationWorld = modelMatrix * vegetationWorld;
float vegetationWeight;
if (uVegetationAnchor.x < 0.5) {
  vegetationWeight = smoothstep(0.0, 1.0, length(position.xz) * uVegetationAnchor.w);
} else if (uVegetationAnchor.x < 1.5) {
  vegetationWeight = smoothstep(0.0, 1.0, max(0.0, position.z) * uVegetationAnchor.w);
} else {
  vegetationWeight = smoothstep(0.0, 1.0, (position.y - uVegetationAnchor.y) * uVegetationAnchor.z);
  vegetationWeight *= vegetationWeight;
}
float vegetationPhase = vegetationWorld.x * 0.11 + vegetationWorld.z * 0.085;
float vegetationWave = sin(uVegetationTime * 0.68 + vegetationPhase) * 0.72
  + sin(uVegetationTime * 1.13 + vegetationPhase * 1.7) * 0.28;
vec3 vegetationOffset = vec3(vegetationWave, 0.0,
  sin(uVegetationTime * 0.51 + vegetationPhase + 0.9) * 0.37)
  * uVegetationAmplitude * vegetationWeight;
// Undo rotation and nonuniform scale without a per-vertex matrix inverse.
// Scene foliage transforms have orthogonal axes; displacement stays in world metres.
transformed += vec3(
  dot(vegetationOffset, vegetationBasis[0]) / max(dot(vegetationBasis[0], vegetationBasis[0]), 0.000001),
  dot(vegetationOffset, vegetationBasis[1]) / max(dot(vegetationBasis[1], vegetationBasis[1]), 0.000001),
  dot(vegetationOffset, vegetationBasis[2]) / max(dot(vegetationBasis[2], vegetationBasis[2]), 0.000001)
);
`;

/** Only independently identifiable vegetation is animated; material batches stay rigid. */
export function attachVegetationMotion(content: THREE.Object3D): VegetationMotion {
  const existing = attached.get(content);
  if (existing) return existing;
  const time = { value: 0 };
  const bindings = new Set<Binding>();
  const uses = new Map<THREE.Material, number>();
  const targets: { mesh: THREE.Mesh; kind: MotionKind; source: THREE.MeshStandardMaterial }[] = [];
  content.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) uses.set(material, (uses.get(material) ?? 0) + 1);
    const kind = eligible.get(object.name);
    if (
      kind &&
      object.userData.vegetationMotion !== false &&
      object.material instanceof THREE.MeshStandardMaterial
    )
      targets.push({ mesh: object, kind, source: object.material });
  });
  const remaining = new Map<THREE.Material, number>();
  for (const { source } of targets) remaining.set(source, (remaining.get(source) ?? 0) + 1);
  const detachedSources = new Set(
    [...remaining.keys()].filter((source) => uses.get(source) === remaining.get(source)),
  );
  let disposed = false;
  for (const { mesh, kind, source } of targets) {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox!;
    const reach =
      kind === 'leaf'
        ? bounds.max.z
        : Math.hypot(
            Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
            Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)),
          );
    const anchor = new THREE.Vector4(
      kind === 'crown' ? 0 : kind === 'leaf' ? 1 : 2,
      bounds.min.y,
      1 / Math.max(0.001, bounds.max.y - bounds.min.y),
      1 / Math.max(0.001, reach),
    );
    // Never patch a shared source: bark, roofs or people may use the same material.
    const animated = source.clone();
    const priorCompile = source.onBeforeCompile;
    const priorKey = source.customProgramCacheKey();
    animated.customProgramCacheKey = () => `${priorKey}|within-vegetation-v1`;
    animated.onBeforeCompile = (shader, renderer) => {
      priorCompile.call(animated, shader, renderer);
      shader.uniforms.uVegetationTime = time;
      shader.uniforms.uVegetationAmplitude = {
        value: kind === 'leaf' ? 0.018 : kind === 'crown' ? 0.045 : 0.055,
      };
      shader.uniforms.uVegetationAnchor = { value: anchor };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${declarations}`)
        .replace('#include <project_vertex>', `${displacement}\n#include <project_vertex>`);
    };
    mesh.material = animated;
    const binding: Binding = { mesh, source, animated, onDispose: () => {} };
    binding.onDispose = () => {
      animated.removeEventListener('dispose', binding.onDispose);
      bindings.delete(binding);
      const count = (remaining.get(source) ?? 1) - 1;
      remaining.set(source, count);
      // disposeObject can be called without controller cleanup: detached originals
      // must still be released, but sources used by unrelated meshes remain theirs.
      if (!disposed && count === 0 && detachedSources.has(source)) source.dispose();
      if (!disposed && bindings.size === 0) {
        disposed = true;
        remaining.clear();
        detachedSources.clear();
        attached.delete(content);
      }
    };
    animated.addEventListener('dispose', binding.onDispose);
    bindings.add(binding);
  }
  const controller: VegetationMotion = {
    meshCount: targets.length,
    update(seconds) {
      if (!disposed && Number.isFinite(seconds)) time.value = Math.max(0, seconds);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const binding of [...bindings]) {
        if (binding.mesh.material === binding.animated) binding.mesh.material = binding.source;
        binding.animated.dispose();
      }
      bindings.clear();
      remaining.clear();
      detachedSources.clear();
      attached.delete(content);
    },
  };
  attached.set(content, controller);
  return controller;
}
