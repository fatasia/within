import * as THREE from 'three';
import type { Peak } from '../types';
import { noise } from './math';

/** Distinct limestone towers and sandstone pillars, sharing the existing valley footprint. */
export function rockLandformHeight(peak: Peak, x: number, z: number): number | undefined {
  if (peak.profile !== 'guilin' && peak.profile !== 'zhangjiajie') return undefined;
  const dx = (x - peak.x) / peak.radius;
  const dz = (z - peak.z) / (peak.radius * (peak.stretch ?? 0.8));
  const angle = Math.atan2(dz, dx);
  const distance = Math.hypot(dx, dz);
  if (distance >= 1) return -0.25;
  // Keep a low, gently graded talus skirt. The elevated body is narrower, so
  // neighboring footprints do not join into a cliff spanning the entire river.
  const skirt = peak.height * 0.055 * Math.pow(1 - distance, 1.4);
  const flute = Math.sin(angle * 5 + peak.seed) * 0.028 + Math.cos(angle * 3 - peak.seed) * 0.035;
  const width = peak.profile === 'guilin' ? 0.78 : 0.76;
  const radius = distance / (width + flute);
  if (radius >= 1) return Math.max(-0.25, skirt - 0.25);
  let body: number;
  if (peak.profile === 'guilin') {
    // Rounded, unequal shoulders above a narrow foot; no pointed noisy apex.
    const shoulder = Math.pow(Math.max(0, 1 - radius * radius), 1.25);
    const lean = 0.96 + dx * 0.12 - dz * 0.06;
    body = shoulder * lean * (0.93 + noise(dx * 1.6 + 7, dz * 1.6 + 9, peak.seed) * 0.06);
  } else {
    // A long vertical shaft, irregular cap and a continuous small basal ramp.
    const cap = Math.pow(Math.max(0, 1 - Math.pow(radius, 6)), 0.48);
    const edge = 1 - THREE.MathUtils.smoothstep(radius, 0.82, 1);
    const crown = 0.82 + noise(dx * 4.8 + 5, dz * 4.8 + 7, peak.seed) * 0.17;
    body = cap * edge * crown;
  }
  const erosion = noise(dx * 13 + 9, dz * 13 + 4, peak.seed + 8);
  body *= 0.97 + erosion * 0.06;
  return Math.max(-0.25, skirt + peak.height * body - 0.25);
}

/** World-space strata and shallow fissures retain scale when viewed from the valley floor. */
export function addRockSurface(material: THREE.MeshStandardMaterial, sandstone: boolean): void {
  material.customProgramCacheKey = () =>
    `within-rock-strata-${sandstone ? 'sandstone' : 'limestone'}-1`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSandstone = { value: sandstone ? 1 : 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockWorld;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvRockWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vRockWorld;
uniform float uSandstone;
float rockHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float rockNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(rockHash(i),rockHash(i+vec2(1.,0.)),f.x),mix(rockHash(i+vec2(0.,1.)),rockHash(i+vec2(1.)),f.x),f.y);}
`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float rockBroad = rockNoise(vRockWorld.xz * .36 + vec2(vRockWorld.y*.08,-vRockWorld.y*.06));
float rockFine = rockNoise(vRockWorld.xz * 2.9 + vRockWorld.y * .08);
float rockLayer = abs(sin(vRockWorld.y * .83 + rockBroad * 5.0));
float rockSeam = 1.0 - smoothstep(.12, .42, rockLayer);
float rockCrack = pow(1.0-abs(sin(vRockWorld.x*.83+vRockWorld.z*.63+rockBroad*4.)),9.);
float rockFace = smoothstep(.5, 3.0, vRockWorld.y);
diffuseColor.rgb *= 1.0-rockFace*(rockSeam*.08*uSandstone+rockCrack*.10);
diffuseColor.rgb *= .87 + rockBroad*.2 + rockFine*.05;
`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
float rockRelief = (rockFine*.006-rockSeam*.008*uSandstone-rockCrack*.009)*rockFace;
vec3 rockDx=dFdx(-vViewPosition),rockDy=dFdy(-vViewPosition);
vec3 rockR1=cross(rockDy,normal),rockR2=cross(normal,rockDx);
float rockDet=dot(rockDx,rockR1);
normal=normalize(abs(rockDet)*normal-sign(rockDet)*(dFdx(rockRelief)*rockR1+dFdy(rockRelief)*rockR2));
`,
      );
  };
}

/** Rock color follows world-space strata, not a vertically stretched paper UV. */
export function colorRockLandform(
  target: THREE.Color,
  vegetation: THREE.Color,
  sandstone: boolean,
  x: number,
  z: number,
  height: number,
  steepness: number,
  seed: number,
): void {
  const weather = noise(x * 0.24, z * 0.31, seed);
  const patches = noise(x * 0.075 + height * 0.024, z * 0.08, seed + 4);
  const ledge = 0.5 + Math.sin(height * 1.3 + weather * 0.8) * 0.5;
  target.set(sandstone ? '#8c8778' : '#9ba5a1');
  // Vegetation gathers on shoulders and broken patches, not every vertical face.
  const cover = Math.max(0, 1 - steepness * 1.22) * 0.75 + Math.pow(patches, 3) * 0.18;
  target.lerp(vegetation, Math.min(0.88, cover));
  target.multiplyScalar(0.86 + weather * 0.19 - (sandstone ? ledge * 0.055 : 0));
}
