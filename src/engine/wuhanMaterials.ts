import * as THREE from 'three';

/** World-space paving detail adds joints and wet patches without another mesh or texture. */
export function addWetStoneDetail(material: THREE.MeshPhysicalMaterial): void {
  material.customProgramCacheKey = () => 'within-wet-paving-v1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStoneWorld;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvStoneWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vStoneWorld;
float stoneHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float stoneNoise(vec2 p) {
  vec2 cell = floor(p), t = fract(p); t = t * t * (3.0 - 2.0 * t);
  return mix(mix(stoneHash(cell), stoneHash(cell + vec2(1.0, 0.0)), t.x),
    mix(stoneHash(cell + vec2(0.0, 1.0)), stoneHash(cell + vec2(1.0)), t.x), t.y);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
vec2 paving = vStoneWorld.xz * vec2(0.95, 1.6);
paving.x += mod(floor(paving.y), 2.0) * 0.5;
vec2 pavingCell = floor(paving), pavingUv = fract(paving);
vec2 edge = min(pavingUv, 1.0 - pavingUv);
float edgeWidth = max(fwidth(paving.x), fwidth(paving.y));
float joint = smoothstep(0.012, 0.022 + edgeWidth, min(edge.x, edge.y));
float grain = stoneNoise(vStoneWorld.xz * 45.0);
float wetPatch = smoothstep(0.25, 0.72, stoneNoise(vStoneWorld.xz * 0.47));
float stoneShade = 0.83 + stoneHash(pavingCell) * 0.22 + (grain - 0.5) * 0.12;
diffuseColor.rgb *= mix(0.46, stoneShade, joint) * mix(1.0, 0.78, wetPatch);
`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.72, 0.22, wetPatch) * mix(1.0, 0.9, joint);
`,
      );
  };
  material.needsUpdate = true;
}
