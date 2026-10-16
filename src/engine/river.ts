import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type { Painting, Quality, Vec3 } from '../types';
import { clamp } from './math';
import { SAKURA_SUN_DIRECTION } from './sakuraLight';

export interface River {
  mesh: THREE.Mesh;
  update: (time: number, night: number) => void;
  setSakuraHull: (position: Vec3, rotation: Vec3) => void;
  dispose: () => void;
}

const vertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vReflection;
  varying vec3 vWorld;
  varying vec3 vView;
  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 view = viewMatrix * world;
    vWorld = world.xyz;
    vView = cameraPosition - world.xyz;
    vReflection = textureMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec3 color;
  uniform vec3 uHorizon;
  uniform vec2 uTexel;
  uniform float uTime;
  uniform float uNight;
  uniform float uHasReflection;
  uniform float uLakeClarity;
  uniform float uSakura;
  uniform vec3 uSunDirection;
  uniform mat4 uSakuraHullInverse;
  uniform float uSakuraHullActive;
  varying vec4 vReflection;
  varying vec3 vWorld;
  varying vec3 vView;
  #include <common>
  #include <logdepthbuf_pars_fragment>

  // Waterline sampled from the original tomabune, not a rectangular cutout.
  // Adapted from sakura-fantasy (Bill Chan, MIT); see assets/sakura/LICENSE.
  const float HULL_WL[36] = float[36](0.558, 0.574, 0.608, 0.646, 0.674, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.685, 0.680, 0.670, 0.651, 0.624, 0.588, 0.544, 0.491, 0.426, 0.348, 0.256, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

  float riverNoise(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    vec4 corners = fract(sin(vec4(
      dot(cell, vec2(127.1, 311.7)),
      dot(cell + vec2(1.0, 0.0), vec2(127.1, 311.7)),
      dot(cell + vec2(0.0, 1.0), vec2(127.1, 311.7)),
      dot(cell + vec2(1.0, 1.0), vec2(127.1, 311.7))
    )) * 43758.5453);
    return mix(mix(corners.x, corners.y, f.x), mix(corners.z, corners.w, f.x), f.y);
  }

  vec3 softReflection(vec2 uv, float spread) {
    // Five taps soften the ink edge without erasing the mountain silhouette.
    vec2 texel = uTexel * spread;
    vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.4;
    reflected += texture2D(tDiffuse, uv + vec2(texel.x, texel.y)).rgb * 0.15;
    reflected += texture2D(tDiffuse, uv + vec2(-texel.x, texel.y)).rgb * 0.15;
    reflected += texture2D(tDiffuse, uv + vec2(texel.x, -texel.y)).rgb * 0.15;
    reflected += texture2D(tDiffuse, uv - texel).rgb * 0.15;
    return reflected;
  }

  void main() {
    #include <logdepthbuf_fragment>
    if (uSakura > 0.5 && uSakuraHullActive > 0.5) {
      vec3 hull = (uSakuraHullInverse * vec4(vWorld, 1.0)).xyz;
      // The integrated model's longitudinal axis is +X (upstream is +Z).
      float station = (hull.x + 4.1) / 8.3 * 35.0;
      if (station > 0.0 && station < 35.0) {
        int i = int(floor(station));
        float halfWidth = mix(HULL_WL[i], HULL_WL[min(i + 1, 35)], fract(station));
        if (abs(hull.z) < halfWidth) discard;
      }
    }
    // Evaluate the distance per fragment. Interpolating corner distances on the
    // kilometre-wide quad would fade even the nearest water into the horizon.
    float viewDistance = length(vView);
    vec2 p = vWorld.xz;
    float n = riverNoise(p * vec2(0.11, 0.24) + vec2(uTime * 0.017, 0.0));
    // Centimetre-scale capillary ripples; no geometric wave displacement.
    float ripple = sin(p.x * 0.75 + p.y * 1.12 + n * 5.4 + uTime * 0.3);
    float crossRipple = sin(p.x * -0.43 + p.y * 0.91 - uTime * 0.19 + n * 3.1);
    vec3 normal = normalize(vec3(ripple * 0.012, 1.0, crossRipple * 0.009));
    if (uSakura > 0.5) {
      // Two flow scales break a flat mirror into small, non-repeating wavelets.
      float fine = riverNoise(p * 2.7 + vec2(uTime * .12, -uTime * .19));
      normal = normalize(vec3(ripple * .035 + (fine - .5) * .045, 1.0,
        crossRipple * .028 + sin(p.y * 3.7 + fine * 6.0 - uTime) * .018));
    }
    float facing = clamp(dot(normalize(vView), normal), 0.0, 1.0);
    float fresnel = pow(1.0 - facing, 3.0);
    vec3 nightWater = vec3(0.004, 0.012, 0.021);
    vec3 waterColor = mix(color, nightWater, uNight);
    vec3 horizon = mix(uHorizon, vec3(0.012, 0.027, 0.047), uNight);
    vec3 body = waterColor * (0.96 + (n - 0.5) * 0.055);
    body = mix(body, horizon, smoothstep(160.0, 900.0, viewDistance) * 0.28);

    if (uHasReflection > 0.5 && vReflection.w > 0.0) {
      vec2 uv = vReflection.xy / vReflection.w;
      float distanceDamping = 1.0 - smoothstep(70.0, 460.0, viewDistance) * 0.7;
      uv += vec2(ripple, crossRipple) * vec2(0.00072, 0.00048) * distanceDamping * (1.0 + uSakura * 1.5);
      // Texture edges fall back to the water body instead of smearing a border.
      float valid = smoothstep(0.0, 0.025, uv.x) * (1.0 - smoothstep(0.975, 1.0, uv.x))
        * smoothstep(0.0, 0.025, uv.y) * (1.0 - smoothstep(0.975, 1.0, uv.y));
      vec3 reflected = softReflection(clamp(uv, uTexel, 1.0 - uTexel), 0.85 + n * 0.8);
      // The target is linear HDR; absorption and tone mapping are applied once here.
      reflected *= mix(vec3(0.78, 0.9, 0.86), vec3(0.55, 0.69, 0.83), uNight);
      float reflectance = mix(0.48 + uLakeClarity * 0.14, 0.79 + uLakeClarity * 0.08, fresnel) * valid;
      if (uSakura > 0.5) reflectance = mix(.24, .92, pow(1.0 - facing, 2.0)) * valid;
      body = mix(body, reflected, reflectance);
    }

    body = mix(body, horizon, smoothstep(210.0, 650.0, viewDistance));

    // Broad directional sheen, never white periodic stripes.
    float sheen = pow(max(0.0, dot(normalize(vView), reflect(normalize(vec3(-0.45, -0.8, 0.3)), normal))), 100.0);
    body += mix(vec3(0.016, 0.017, 0.012), vec3(0.002, 0.004, 0.006), uNight) * sheen;
    if (uSakura > 0.5) {
      vec3 halfVector = normalize(normalize(vView) + uSunDirection);
      float nh = max(dot(normal, halfVector), 0.0);
      // Pixel-footprint filtering prevents distant sparkles from crawling.
      float footprint = max(length(dFdx(p)), length(dFdy(p)));
      float resolved = 1.0 - smoothstep(.15, 1.8, footprint);
      float glitter = riverNoise(p * 7.0 + vec2(uTime * 1.7, -uTime * 1.1));
      glitter = mix(.66, glitter, resolved);
      float exponent = mix(90.0, 480.0, resolved);
      float specular = pow(nh, exponent) * exponent * .025 * smoothstep(.5, .78, glitter)
        + pow(nh, 90.0) * .45;
      body += vec3(1.0, .78, .48) * specular * (1.0 - uNight);
    }
    gl_FragColor = vec4(max(body, vec3(0.0)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A still river with actual reflected scene geometry; quality changes rebuild this object. */
export function buildRiver(painting: Painting, quality: Quality): River {
  const reflectionEnabled = quality !== 'low';
  const resolution = quality === 'high' ? 1024 : 512;
  const waterTint = new THREE.Color(painting.palette.water);
  waterTint.lerp(new THREE.Color(painting.id === 'fuchun' ? '#777f73' : '#456e66'), 0.38);
  if (painting.id === 'sakura') waterTint.set('#376f69');
  const shader = {
    name: 'QuietRiverReflection',
    uniforms: {
      color: { value: waterTint },
      tDiffuse: { value: null },
      textureMatrix: { value: new THREE.Matrix4() },
      uHorizon: { value: new THREE.Color(painting.palette.sky) },
      uTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) },
      uTime: { value: 0 },
      uNight: { value: 0 },
      uHasReflection: { value: reflectionEnabled ? 1 : 0 },
      uLakeClarity: { value: painting.id === 'wuhan' ? 1 : 0 },
      uSakura: { value: painting.id === 'sakura' ? 1 : 0 },
      uSunDirection: { value: new THREE.Vector3(...SAKURA_SUN_DIRECTION).normalize() },
      uSakuraHullInverse: { value: new THREE.Matrix4() },
      uSakuraHullActive: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  };
  const geometry = new THREE.PlaneGeometry(1800, 1800);
  const reflector = reflectionEnabled
    ? new Reflector(geometry, {
        color: waterTint,
        textureWidth: resolution,
        textureHeight: resolution,
        clipBias: 0.002,
        multisample: 0,
        shader,
      })
    : null;
  const mesh = reflector ?? new THREE.Mesh(geometry, new THREE.ShaderMaterial(shader));
  const material = mesh.material as THREE.ShaderMaterial;
  material.toneMapped = true;
  mesh.name = 'Still river with soft mountain reflections';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  let time = 0;
  let lastReflection = -Infinity;
  let lastNight = -1;
  let disposed = false;
  const hullPosition = new THREE.Vector3(), hullRotation = new THREE.Euler();
  const hullOrientation = new THREE.Quaternion(), hullScale = new THREE.Vector3(1, 1, 1);
  if (reflector) {
    const renderReflection = reflector.onBeforeRender;
    const interval = quality === 'high' ? 1 / 30 : 1 / 20;
    const reflectedView = new THREE.Matrix4();
    const reflectedProjection = new THREE.Matrix4();
    const reflectedSurface = new THREE.Matrix4();
    let hasReflectedView = false;
    reflector.onBeforeRender = function (renderer, scene, camera, geo, mat, group) {
      // A cached planar reflection is tied to its capture camera, not merely time.
      // Holding it while the view moves makes the bank's reflection step at 20–30 Hz.
      // Only a stationary view may reuse a target; walking, turning and zooming stay continuous.
      const viewChanged =
        !hasReflectedView ||
        !reflectedView.equals(camera.matrixWorld) ||
        !reflectedProjection.equals(camera.projectionMatrix) ||
        !reflectedSurface.equals(this.matrixWorld);
      if (!viewChanged && time >= lastReflection && time - lastReflection + 1e-8 < interval) return;
      lastReflection = time;
      renderReflection.call(this, renderer, scene, camera, geo, mat, group);
      reflectedView.copy(camera.matrixWorld);
      reflectedProjection.copy(camera.projectionMatrix);
      reflectedSurface.copy(this.matrixWorld);
      hasReflectedView = true;
    };
    const target = reflector.getRenderTarget();
    target.texture.minFilter = THREE.LinearFilter;
    target.texture.magFilter = THREE.LinearFilter;
    target.texture.generateMipmaps = false;
  }
  return {
    mesh,
    setSakuraHull(position, rotation) {
      if (disposed || painting.id !== 'sakura') return;
      hullPosition.set(...position);
      hullRotation.set(...rotation);
      hullOrientation.setFromEuler(hullRotation);
      (material.uniforms.uSakuraHullInverse!.value as THREE.Matrix4)
        .compose(hullPosition, hullOrientation, hullScale).invert();
      material.uniforms.uSakuraHullActive!.value = 1;
    },
    update(nextTime, night) {
      if (disposed) return;
      time = Number.isFinite(nextTime) ? nextTime : 0;
      const darkness = clamp(night);
      if (Math.abs(darkness - lastNight) > 0.025) lastReflection = -Infinity;
      lastNight = darkness;
      material.uniforms.uTime!.value = time;
      material.uniforms.uNight!.value = darkness;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.removeFromParent();
      geometry.dispose();
      if (reflector)
        reflector.dispose(); // Includes its render target and material.
      else material.dispose();
    },
  };
}
