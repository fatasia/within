import * as THREE from 'three';
import { SakuraGeometryQueue } from './sakuraGeometry';
import { prepareSakuraObject } from './sakuraPrepare';
import { disposeObject } from './resources';
import type { Quality } from '../types';
import { SAKURA_NOISE, SAKURA_VERTEX, SAKURA_WIND } from './sakuraWind';
import { scatterInstanced, type Placement } from './featuredShared';

/** Original Sakura Fantasy recursive Somei Yoshino trees, photo atlases and gust deformation.
 * Copyright (c) 2026 Bill Chan, MIT. Adaptations: scene-local uniforms and Three material integration.
 */
export function buildSakuraGrove(parent: THREE.Group, placements: Placement[]) {
  const uniforms = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3(0.6, -0.8, 0.65) } };
  const loader = new THREE.TextureLoader();
  const pending: Promise<void>[] = [];
  const texture = (name: string, color = false, repeat = false) => {
    let resolve: () => void = () => {};
    let reject: (error: unknown) => void = () => {};
    pending.push(new Promise<void>((yes, no) => { resolve = yes; reject = no; }));
    const t = loader.load(`${import.meta.env.BASE_URL}assets/sakura/${name}.webp`, () => resolve(), undefined, reject);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const bark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.5, 0.45, 0.45), map: texture('sakura_bark_c', true, true),
    normalMap: texture('sakura_bark_n', false, true), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.92,
  });
  const blossom = new THREE.MeshLambertMaterial({
    map: texture('sakura_blossom', true), side: THREE.DoubleSide,
    alphaTest: 0.38, alphaToCoverage: true,
  });
  const normals = texture('sakura_blossom_n');
  // Keep auxiliary atlas in a standard material slot so the scene resource disposer owns it.
  blossom.userData.normalAtlas = normals;
  const patch = (material: THREE.Material, leaves: boolean) => {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms, { tBlossomN: { value: normals } });
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
        uniform float uTime; uniform vec3 uWind;
        ${SAKURA_NOISE}\n${SAKURA_WIND}
        #define SF_STIFF 0.32
        ${leaves ? '#define SF_LEAF\n#define SF_SWELL 0.3\nattribute vec2 aAux; attribute vec3 aCtr; varying vec2 vLeaf; varying float vSeed;' : ''}
      `).replace('#include <begin_vertex>', `#include <begin_vertex>\n${SAKURA_VERTEX}`);
      if (leaves) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
          varying vec2 vLeaf; varying float vSeed; uniform sampler2D tBlossomN;
          vec2 sfAtlasUv(vec2 uv) {
            float c = min(floor(vLeaf.y * 4.0), 3.0);
            return (vec2(mod(c, 2.0), 1.0 - floor(c * 0.5)) + uv) * 0.5;
          }
        `).replace('#include <map_fragment>', `
          vec2 bUv = sfAtlasUv(vMapUv);
          vec4 b = texture2D(map, bUv);
          float pk = smoothstep(0.35, 0.95, fract(vSeed * 5.3 + vLeaf.y * 2.9));
          float variation = fract(vLeaf.y * 4.0);
          diffuseColor.rgb = b.rgb * mix(vec3(1.0, 0.9, 0.93), vec3(1.0, 0.78, 0.86), pk) * (0.9 + 0.16 * variation);
          diffuseColor.rgb *= mix(vec3(0.6, 0.47, 0.5), vec3(1.0), smoothstep(0.1, 0.9, vLeaf.x));
          vec2 texel = vMapUv * 1024.0;
          float lod = log2(max(length(dFdx(texel)), length(dFdy(texel))));
          vec3 cardNormal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
          float facing = abs(dot(cardNormal, normalize(vViewPosition)));
          diffuseColor.a *= b.a * (1.0 + max(lod, 0.0) * 0.28) * smoothstep(0.12, 0.42, facing);
        `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          // Authored crown normals must not flip with the randomly mirrored card faces.
          #ifndef FLAT_SHADED
          normal = normalize(vNormal);
          #endif
          vec3 tn = texture2D(tBlossomN, sfAtlasUv(vMapUv)).xyz * 2.0 - 1.0;
          vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);
          vec2 st0 = dFdx(vMapUv), st1 = dFdy(vMapUv);
          vec3 cn = normalize(cross(q0, q1));
          cn *= sign(dot(cn, vViewPosition));
          vec3 q1p = cross(q1, cn), q0p = cross(cn, q0);
          vec3 T = q1p * st0.x + q0p * st1.x;
          vec3 B = q1p * st0.y + q0p * st1.y;
          float det = max(dot(T, T), dot(B, B));
          float sc = det == 0.0 ? 0.0 : inversesqrt(det);
          vec3 fn = normalize(T * (tn.x * sc) + B * (tn.y * sc) + cn * tn.z);
          normal = normalize(normal + (fn - cn) * 0.9);
        `).replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          // A thin blossom transmits daylight rather than reading as a dark green card backside.
          reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(1.0, 0.7, 0.76) * ambientLightColor * 0.07;
          #if NUM_DIR_LIGHTS > 0
            float back = pow(max(dot(-normalize(vViewPosition), directionalLights[0].direction), 0.0), 2.5);
            reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * back * 0.2 * (0.25 + 0.75 * vLeaf.x);
          #endif
        `);
      }
    };
    material.customProgramCacheKey = () => `sakura-fantasy-spring-${leaves}`;
  };
  patch(bark, false); patch(blossom, true);
  const queue = new SakuraGeometryQueue();
  const treeBatch = new THREE.Group();
  let disposed = false, detailRadius = 42;
  const resources = new THREE.Mesh(new THREE.BufferGeometry(), [bark, blossom]);
  resources.name = 'sakura-grove-resource-owner'; resources.visible = false; parent.add(resources);
  bark.addEventListener('dispose', () => { disposed = true; queue.dispose(); });
  const geometryJobs = [101, 202, 303].map(async (seed, variant) => {
    const [geometries, distant] = await Promise.all([queue.generate('sakura', seed), queue.generate('sakura', seed, true)]);
    if (disposed) { for (const g of [geometries, distant]) { g.wood.dispose(); g.leaf.dispose(); } return; }
    const slots = placements.filter((_, index) => index % 3 === variant);
    // LOD never thins the photographed flower sprays. Only sub-pixel timber is omitted far away.
    distant.leaf.dispose();
    for (const [level, geometry] of [geometries.wood, distant.wood].entries()) {
      const wood = scatterInstanced(treeBatch, geometry, bark, slots);
      wood.name = `sakura-fantasy-branches-${seed}-${level ? 'distant' : 'near'}`;
      const transforms = slots.map((_, index) => {
        const matrix = new THREE.Matrix4(); wood.getMatrixAt(index, matrix); return matrix;
      });
      const cameraPosition = new THREE.Vector3(), rootPosition = new THREE.Vector3();
      // Called for each view, including the reflected camera; bounds remain the full original batch.
      wood.computeBoundingSphere();
      let previous: string | undefined;
      wood.onBeforeRender = (_renderer, _scene, camera) => {
        camera.getWorldPosition(cameraPosition);
        const selected: number[] = [];
        transforms.forEach((matrix, index) => {
          rootPosition.setFromMatrixPosition(matrix).applyMatrix4(wood.matrixWorld);
          if ((rootPosition.distanceToSquared(cameraPosition) < detailRadius * detailRadius) === (level === 0)) selected.push(index);
        });
        const key = selected.join(',');
        if (key === previous) return;
        previous = key;
        selected.forEach((index, slot) => wood.setMatrixAt(slot, transforms[index]));
        wood.count = selected.length;
        wood.instanceMatrix.needsUpdate = true;
      };
    }
    const flowers = scatterInstanced(treeBatch, geometries.leaf, blossom, slots);
    flowers.name = `sakura-fantasy-photo-blossoms-${seed}`;
  });
  // Standard material resource lifecycle doesn't traverse userData.
  blossom.addEventListener('dispose', () => normals.dispose());
  const ready = Promise.all([...pending, ...geometryJobs]).then(async () => {
    if (!disposed) await prepareSakuraObject(parent, treeBatch);
    if (disposed) disposeObject(treeBatch); else parent.add(treeBatch);
  }).catch(error => { disposeObject(treeBatch); throw error; }).finally(() => queue.dispose());
  // Propagate failures to consumers without an unhandled rejection during a scene switch.
  ready.catch(error => { parent.userData.sakuraAssetError = String(error); });
  parent.userData.sakuraAssetsReady = ready;
  return { update: (time: number) => { uniforms.uTime.value = time; }, ready, setQuality(quality: Quality) { detailRadius = quality === 'high' ? 42 : quality === 'balanced' ? 24 : 0; } };
}

/** Original sugi scaffold/frond geometry replaces the former solid cone backdrop. */
export function buildSakuraForest(parent: THREE.Group, placements: Placement[]) {
  const uniforms = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3(0.6, -0.8, 0.65) } };
  let resolve: () => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const textureReady = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const atlas = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/sakura/conifer_atlas.webp`, resolve, undefined, reject);
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;
  const needles = new THREE.MeshLambertMaterial({ map: atlas, color: '#d1d6b6', alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide });
  needles.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      uniform float uTime; uniform vec3 uWind;
      ${SAKURA_NOISE} ${SAKURA_WIND}
      #define SF_STIFF 0.12
      #define SF_SWELL 0.4
      #define SF_LEAF
      attribute vec3 aCtr; attribute vec2 aAux; varying vec2 vLeaf; varying float vSeed;
    `).replace('#include <begin_vertex>', `#include <begin_vertex>\n${SAKURA_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vLeaf;`)
      .replace('#include <map_fragment>', `
        float c = min(floor(vLeaf.y * 4.0), 3.0);
        vec2 atlasUv = (vec2(mod(c, 2.0), 1.0 - floor(c * 0.5)) + vMapUv) * 0.5;
        diffuseColor *= texture2D(map, atlasUv);
        vec2 footprint = vMapUv * 512.0;
        float lod = log2(max(length(dFdx(footprint)), length(dFdy(footprint))));
        diffuseColor.a *= 1.0 + max(lod, 0.0) * 0.28;
      `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n#ifndef FLAT_SHADED
          normal = normalize(vNormal);
          #endif`);
  };
  needles.customProgramCacheKey = () => 'sakura-fantasy-sugi';
  const timber = new THREE.MeshStandardMaterial({ color: '#655343', roughness: 0.95 });
  const queue = new SakuraGeometryQueue();
  const treeBatch = new THREE.Group();
  let disposed = false;
  const resources = new THREE.Mesh(new THREE.BufferGeometry(), [timber, needles]);
  resources.name = 'sakura-forest-resource-owner'; resources.visible = false; parent.add(resources);
  timber.addEventListener('dispose', () => { disposed = true; queue.dispose(); });
  const geometryJobs = [707, 808].map(async (seed, variant) => {
    const geometry = await queue.generate('cedar', seed);
    if (disposed) { geometry.wood.dispose(); geometry.leaf.dispose(); return; }
    const slots = placements.filter((_, i) => i % 2 === variant);
    scatterInstanced(treeBatch, geometry.wood, timber, slots).name = `sakura-fantasy-sugi-wood-${seed}`;
    scatterInstanced(treeBatch, geometry.leaf, needles, slots).name = `sakura-fantasy-sugi-needles-${seed}`;
  });
  const ready = Promise.all([textureReady, ...geometryJobs]).then(async () => {
    if (!disposed) await prepareSakuraObject(parent, treeBatch);
    if (disposed) disposeObject(treeBatch); else parent.add(treeBatch);
  }).catch(error => { disposeObject(treeBatch); throw error; }).finally(() => queue.dispose());
  ready.catch(error => { parent.userData.sakuraAssetError = String(error); });
  return { ready, update(time: number) { uniforms.uTime.value = time; } };
}

