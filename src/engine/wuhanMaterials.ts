import * as THREE from 'three';

/** World-space paving detail adds joints and wet patches without another mesh or texture. */
export function addWetStoneDetail(material: THREE.MeshPhysicalMaterial): void {
  material.customProgramCacheKey = () => 'within-wet-paving-v2';
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
vec2 paving = vStoneWorld.xz * vec2(0.78, 1.28);
// Separate stagger offsets per course and lightly chipped joints avoid a black graph-paper grid.
paving.x += stoneHash(vec2(floor(paving.y), 9.0)) * 0.75;
paving += (vec2(stoneNoise(vStoneWorld.xz * 5.1), stoneNoise(vStoneWorld.zx * 5.7)) - 0.5) * 0.013;
vec2 pavingCell = floor(paving), pavingUv = fract(paving);
vec2 edge = min(pavingUv, 1.0 - pavingUv);
float edgeWidth = max(fwidth(paving.x), fwidth(paving.y));
float joint = smoothstep(0.002, 0.006 + edgeWidth * 0.65, min(edge.x, edge.y));
float grain = stoneNoise(vStoneWorld.xz * 45.0);
float wetPatch = smoothstep(0.30, 0.66, stoneNoise(vStoneWorld.xz * 0.47) * 0.7 + stoneNoise(vStoneWorld.xz * 1.7) * 0.3);
float stoneShade = 0.88 + stoneHash(pavingCell) * 0.16 + (grain - 0.5) * 0.07;
diffuseColor.rgb *= mix(0.75, stoneShade, joint) * mix(1.0, 0.83, wetPatch);
`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.57, 0.085, wetPatch) * mix(1.05, 1.0, joint);
`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
// Derivative bump follows the camera-space tangent plane. Damp stone retains small worn relief.
float stoneRelief = grain * mix(0.0025, 0.0007, wetPatch) + joint * 0.004;
vec3 stoneDx = dFdx(-vViewPosition), stoneDy = dFdy(-vViewPosition);
vec3 stoneR1 = cross(stoneDy, normal), stoneR2 = cross(normal, stoneDx);
float stoneDet = dot(stoneDx, stoneR1);
normal = normalize(abs(stoneDet) * normal - sign(stoneDet) *
  (dFdx(stoneRelief) * stoneR1 + dFdy(stoneRelief) * stoneR2));
`,
      );
  };
  material.needsUpdate = true;
}
