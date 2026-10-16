// Sakura Fantasy material hooks adapted to the host's Three.js lighting/fog.
// Copyright (c) 2026 Bill Chan, MIT. See public/assets/sakura/LICENSE.
import * as THREE from 'three';
import { SAKURA_NOISE } from '../sakuraWind';

export function patch(material, opts = {}) {
  const hooks = opts.hooks || {};
  const light = {
    uSunDir: { value: new THREE.Vector3(-0.24, 0.3, -1).normalize() },
    uSunCol: { value: new THREE.Color(1.5, 1.3, 1.1) },
    uSkyHor: { value: new THREE.Color(0.5, 0.55, 0.6) },
    uAmbUp: { value: new THREE.Color(0.4, 0.45, 0.5) },
  };
  material.userData.sakuraFigureLight = light;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, light, opts.uniforms || {});
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${opts.vertexHead || ''}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${hooks.beginNormal || ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${hooks.vertex || ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SAKURA_NOISE}\nuniform vec3 uSunDir,uSunCol,uSkyHor,uAmbUp;\n${opts.fragHead || ''}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${hooks.map || ''}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${hooks.normal || ''}`)
      .replace('#include <alphatest_fragment>', `${hooks.alpha || ''}\n#include <alphatest_fragment>`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\nvec3 sfNW = inverseTransformDirection(normal,viewMatrix);\n${hooks.preLight || ''}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\nfloat sfShadow=1.0;\n${hooks.light || ''}`);
  };
  // The boatman's collar atlas is carried in an extra uniform, not a standard material slot.
  const standardTextures = new Set(Object.values(material).filter(value => value instanceof THREE.Texture));
  const auxiliary = Object.values(opts.uniforms || {}).map(uniform => uniform.value)
    .filter(value => value instanceof THREE.Texture && !standardTextures.has(value));
  material.addEventListener('dispose', () => auxiliary.forEach(texture => texture.dispose()));
  material.customProgramCacheKey = () => `within-sakura-figure-${opts.key || material.type}`;
  return material;
}
