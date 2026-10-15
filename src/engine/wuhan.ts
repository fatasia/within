import * as THREE from 'three';
import type { Painting, Quality } from '../types';
import { clamp, seededRandom } from './math';
import { getWuhanGround, wuhanPath, wuhanShore } from './wuhanLayout';
import { gableGeometry, rod } from './modelGeometry';
import { batchStatic } from './resources';
import { buildWuhanBotany, osmanthusFlowerGeometry } from './wuhanBotany';
import { addWetStoneDetail } from './wuhanMaterials';

type Point = readonly [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
interface Weather {
  rain: THREE.LineSegments;
  drops: Float32Array;
  rainOrigins: Float32Array;
  ripples: THREE.InstancedMesh;
  petals: THREE.InstancedMesh;
  petalOrigins: Float32Array;
  particle: THREE.Object3D;
  wetStone: THREE.MeshPhysicalMaterial;
  lantern: THREE.MeshStandardMaterial;
}
const weather = new WeakMap<THREE.Group, Weather>();

function pose(at: Point, scale: Point = [1, 1, 1], yaw = 0, pitch = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0)),
    new THREE.Vector3(...scale),
  );
}
function segment(start: Point, end: Point, radius: number): THREE.Matrix4 {
  const a = new THREE.Vector3(...start),
    direction = new THREE.Vector3(...end).sub(a);
  return new THREE.Matrix4().compose(
    a.clone().addScaledVector(direction, 0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
    new THREE.Vector3(radius, direction.length(), radius),
  );
}
function batch(
  group: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: THREE.Matrix4[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
  return mesh;
}
function rough(color: string, roughness = 0.86): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}
function addShelter(
  group: THREE.Group,
  lantern: THREE.MeshStandardMaterial,
): THREE.MeshStandardMaterial {
  const x = 23,
    z = wuhanPath(x) + 1.6,
    y = getWuhanGround(x, z);
  const wood = rough('#534b3e'),
    stone = rough('#96998b', 0.48),
    tile = rough('#4d5b52', 0.5);
  const shelter = new THREE.Group();
  shelter.name = 'Open lakeside rain shelter';
  shelter.position.set(x, y, z);
  const box = (size: Point, at: Point, material: THREE.Material): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...at);
    shelter.add(mesh);
  };
  box([9, 0.25, 5.8], [0, 0.14, 0], stone);
  for (const px of [-3.7, 3.7])
    for (const pz of [-2.2, 2.2]) {
      rod(shelter, new THREE.Vector3(px, 0.25, pz), new THREE.Vector3(px, 3.9, pz), 0.14, wood);
      box([0.5, 0.2, 0.5], [px, 0.35, pz], stone);
    }
  box([8.2, 0.17, 0.17], [0, 3.7, -2.2], wood);
  box([8.2, 0.17, 0.17], [0, 3.7, 2.2], wood);
  const roof = new THREE.Mesh(gableGeometry(6.6, 10, 1.45), tile);
  roof.rotation.y = Math.PI * 0.5;
  roof.position.y = 3.8;
  shelter.add(roof);
  for (let i = 0; i < 25; i++)
    for (const sign of [-1, 1]) {
      const rz = -4.8 + i * 0.4;
      rod(
        shelter,
        new THREE.Vector3(rz, 5.28, 0),
        new THREE.Vector3(rz, 3.85, sign * 3.3),
        0.035,
        tile,
        1,
        5,
      );
    }
  for (const px of [-3.2, 3.2]) {
    box([0.45, 0.12, 3.5], [px, 1.02, 0], wood);
    for (const pz of [-1.2, 1.2]) box([0.2, 0.8, 0.2], [px, 0.58, pz], wood);
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.62, 8), lantern);
  lamp.position.set(0, 3.08, 0);
  shelter.add(lamp);
  rod(shelter, new THREE.Vector3(0, 3.4, 0), new THREE.Vector3(0, 4.5, 0), 0.025, wood);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rod(
      shelter,
      new THREE.Vector3(Math.cos(a) * 0.31, 2.77, Math.sin(a) * 0.31),
      new THREE.Vector3(Math.cos(a) * 0.31, 3.39, Math.sin(a) * 0.31),
      0.015,
      wood,
    );
  }
  const baked = batchStatic(shelter);
  group.add(baked);
  let lightMaterial = lantern;
  baked.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial &&
      object.material.emissive.getHex() !== 0
    )
      lightMaterial = object.material;
  });
  return lightMaterial;
}

/** A wet lakeside garden at human scale: no generic mountain or village substitution. */
export function buildWuhan(painting: Painting, quality: Quality = 'balanced'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'East Lake · osmanthus garden in autumn rain';
  const random = seededRandom(painting.seed);
  const garden = buildWuhanBotany(painting, quality);
  group.add(garden.group);
  group.userData.flowerFocus = garden.group.userData.flowerFocus;
  group.userData.quality = quality;
  group.userData.ecologySources = garden.group.userData.ecologySources;
  const fallen: THREE.Matrix4[] = [],
    stones: THREE.Matrix4[] = [],
    reeds: THREE.Matrix4[] = [];
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: '#c8a34b',
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const pathGeometry = new THREE.BufferGeometry();
  const pathVertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 180; i++) {
    const x = -126 + i * 1.4,
      z = wuhanPath(x);
    for (const offset of [-2, 2])
      pathVertices.push(x, getWuhanGround(x, z + offset) + 0.035, z + offset);
    if (i < 180) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathVertices, 3));
  pathGeometry.setIndex(indices);
  pathGeometry.computeVertexNormals();
  const wetStone = new THREE.MeshPhysicalMaterial({
    color: '#6f7872',
    roughness: 0.23,
    metalness: 0.04,
    clearcoat: 0.8,
    clearcoatRoughness: 0.16,
  });
  addWetStoneDetail(wetStone);
  const path = new THREE.Mesh(pathGeometry, wetStone);
  path.name = 'Continuous wet stone lakeside path';
  path.receiveShadow = true;
  group.add(path);
  for (let i = 0; i < 145; i++) {
    const x = -124 + i * 1.72,
      z = wuhanPath(x);
    for (const side of [-1, 1])
      stones.push(
        pose(
          [x, getWuhanGround(x, z + side * 2.1) + 0.055, z + side * 2.1],
          [0.78, 0.12, 0.2],
          Math.sin(i) * 0.06,
        ),
      );
    const nearTree = garden.trees.some(
      (tree) => Math.abs(tree.x - x) < 2.2 && Math.abs(tree.z - z) < 6,
    );
    for (let petal = 0; petal < (nearTree ? 12 : 0); petal++) {
      const px = x + (random() - 0.5) * 0.28,
        pz = z + (random() - 0.5) * 3.5;
      fallen.push(
        pose(
          [px, getWuhanGround(px, pz) + 0.045, pz],
          [0.02, 0.02, 0.02],
          random() * 6.28,
          -Math.PI * 0.5,
        ),
      );
    }
  }
  batch(group, 'Worn path edging', new THREE.BoxGeometry(1, 1, 1), rough('#8d9288', 0.43), stones);
  batch(
    group,
    'Fallen golden flowers on wet stone',
    osmanthusFlowerGeometry(),
    flowerMaterial.clone(),
    fallen,
  );
  for (let i = 0; i < 115; i++) {
    const x = -120 + random() * 240,
      z = wuhanShore(x) + 1 + random() * 1.2,
      y = getWuhanGround(x, z);
    for (let j = 0; j < 3; j++)
      reeds.push(
        segment(
          [x, y, z],
          [x + (random() - 0.5) * 0.6, y + 0.6 + random() * 0.8, z + (random() - 0.5) * 0.5],
          0.02,
        ),
      );
  }
  batch(
    group,
    'Fine lakeshore sedges',
    new THREE.CylinderGeometry(0.2, 1, 1, 4),
    rough('#738259'),
    reeds,
  );
  const benchMaterial = rough('#9a9c8f', 0.48);
  const benches = new THREE.Group();
  for (const x of [-63, -5, 67]) {
    const z = wuhanPath(x) + 3.8,
      y = getWuhanGround(x, z);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.23, 0.65), benchMaterial);
    bench.position.set(x, y + 0.65, z);
    benches.add(bench);
    for (const dx of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.5), benchMaterial);
      foot.position.set(x + dx, y + 0.28, z);
      benches.add(foot);
    }
  }
  group.add(batchStatic(benches));
  let lantern = new THREE.MeshStandardMaterial({
    color: '#e8cb91',
    emissive: '#f9b846',
    emissiveIntensity: 0.12,
    roughness: 0.63,
  });
  lantern = addShelter(group, lantern);

  // A broad local rain curtain: short fine lines, not a screen-space filter.
  const rainCount = 850,
    rainOrigins = new Float32Array(rainCount * 3),
    drops = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    rainOrigins[i * 3] = -132 + random() * 264;
    rainOrigins[i * 3 + 1] = random() * 30;
    rainOrigins[i * 3 + 2] = -80 + random() * 142;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(drops, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const rain = new THREE.LineSegments(
    rainGeometry,
    new THREE.LineBasicMaterial({
      color: '#c4d7d2',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  rain.name = 'Fine autumn rain';
  rain.frustumCulled = false;
  group.add(rain);
  const rippleOrigins = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) {
    rippleOrigins[i * 3] = -115 + random() * 230;
    rippleOrigins[i * 3 + 1] = random();
    rippleOrigins[i * 3 + 2] = -64 + random() * 65;
  }
  const rippleGeometry = new THREE.RingGeometry(0.94, 1, 20);
  rippleGeometry.rotateX(-Math.PI * 0.5);
  const phases = new Float32Array(72),
    speeds = new Float32Array(72),
    radii = new Float32Array(72);
  for (let i = 0; i < 72; i++) {
    phases[i] = random();
    speeds[i] = 0.26 + random() * 0.46;
    radii[i] = 0.22 + random() * 0.5;
  }
  rippleGeometry.setAttribute('phaseOffset', new THREE.InstancedBufferAttribute(phases, 1));
  rippleGeometry.setAttribute('cycleSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
  rippleGeometry.setAttribute('maxRadius', new THREE.InstancedBufferAttribute(radii, 1));
  const ripples = new THREE.InstancedMesh(
    rippleGeometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
      vertexShader: `attribute float phaseOffset;attribute float cycleSpeed;attribute float maxRadius;
        uniform float uTime;varying float vFade;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){float cycle=phaseOffset+uTime*cycleSpeed;float phase=fract(cycle);vFade=sin(phase*3.14159265);
          vec3 p=position;p.xz*=maxRadius*(.08+phase);vec4 world=instanceMatrix*vec4(p,1.);
          world.xz+=vec2(sin(floor(cycle)*12.7+phaseOffset*83.),cos(floor(cycle)*7.3+phaseOffset*65.))*1.1;
          gl_Position=projectionMatrix*modelViewMatrix*world;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform float uNight;varying float vFade;
        #include <logdepthbuf_pars_fragment>
        void main(){
          #include <logdepthbuf_fragment>
          gl_FragColor=vec4(mix(vec3(.51,.62,.54),vec3(.1,.17,.19),uNight),vFade*(.18-uNight*.1));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
    72,
  );
  ripples.name = 'Expanding lake raindrop rings';
  ripples.frustumCulled = false;
  for (let i = 0; i < 72; i++)
    ripples.setMatrixAt(
      i,
      pose([rippleOrigins[i * 3]!, 0.055, rippleOrigins[i * 3 + 2]!], [1, 1, 1]),
    );
  group.add(ripples);
  const petalCount = quality === 'low' ? 48 : quality === 'high' ? 168 : 96;
  const petalOrigins = new Float32Array(petalCount * 7);
  const petalGeometry = new THREE.BufferGeometry();
  petalGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 0, 0, -0.45, 0.5, 0.07, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0.45, 0.5, 0.07],
      3,
    ),
  );
  petalGeometry.computeVertexNormals();
  const petals = new THREE.InstancedMesh(
    petalGeometry,
    new THREE.MeshStandardMaterial({ color: '#d1ac55', roughness: 0.85, side: THREE.DoubleSide }),
    petalCount,
  );
  petals.name = 'Sparse windborne osmanthus petals';
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  const nearTrees = garden.trees.filter((tree) => tree.z > -20);
  const petalRandom = seededRandom(painting.seed + 2903);
  for (let i = 0; i < petalCount; i++) {
    const tree = nearTrees[i % nearTrees.length]!,
      x = tree.x + (petalRandom() - 0.5) * 2,
      z = tree.z + (petalRandom() - 0.5) * 2;
    petalOrigins.set(
      [
        x,
        tree.y + 3.4 * tree.size,
        z,
        Math.max(0.08, getWuhanGround(x, z) + 0.05),
        petalRandom(),
        0.07 + petalRandom() * 0.09,
        petalRandom() * 6.28,
      ],
      i * 7,
    );
  }
  group.add(petals);
  weather.set(group, {
    rain,
    drops,
    rainOrigins,
    ripples,
    petals,
    petalOrigins,
    particle: new THREE.Object3D(),
    wetStone,
    lantern,
  });
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  updateWuhan(group, 0, 0);
  return group;
}

export function updateWuhan(group: THREE.Group, time: number, night: number): void {
  const state = weather.get(group);
  if (!state) return;
  const t = Number.isFinite(time) ? Math.max(0, time) : 0,
    dark = clamp(night);
  const wind = Math.sin(t * 0.13) * 0.5;
  for (let i = 0; i < state.rainOrigins.length / 3; i++) {
    const x = state.rainOrigins[i * 3]!,
      z = state.rainOrigins[i * 3 + 2]!;
    const seed = state.rainOrigins[i * 3 + 1]!,
      velocity = 8.6 + (seed % 3) * 1.4;
    const y = ((seed - ((t * velocity) % 30) + 30) % 30) + 0.4;
    const at = i * 6;
    state.drops[at] = x + wind;
    state.drops[at + 1] = y;
    state.drops[at + 2] = z;
    state.drops[at + 3] = x + 0.07 + (seed % 1) * 0.08 + wind;
    state.drops[at + 4] = y + 0.3 + (seed % 1) * 0.45;
    state.drops[at + 5] = z + 0.06;
  }
  state.rain.geometry.attributes.position!.needsUpdate = true;
  (state.rain.material as THREE.LineBasicMaterial).opacity = 0.27 - dark * 0.15;
  const rippleMaterial = state.ripples.material as THREE.ShaderMaterial;
  rippleMaterial.uniforms.uTime!.value = t;
  rippleMaterial.uniforms.uNight!.value = dark;
  const particle = state.particle;
  for (let i = 0; i < state.petals.count; i++) {
    const a = i * 7,
      phase = (state.petalOrigins[a + 4]! + t * state.petalOrigins[a + 5]!) % 1,
      angle = state.petalOrigins[a + 6]!;
    const drift = Math.sin(t * 0.6 + angle) * 0.12;
    particle.position.set(
      state.petalOrigins[a]! + phase * 0.38 + drift,
      state.petalOrigins[a + 1]! * (1 - phase) + state.petalOrigins[a + 3]! * phase,
      state.petalOrigins[a + 2]! + Math.sin(angle + t * 0.25) * 0.15,
    );
    particle.rotation.set(angle + t * 0.45, angle + t * 0.3, Math.sin(t * 0.7 + angle) * 0.6);
    const size = (0.026 + (i % 3) * 0.006) * Math.min(1, phase * 10, (1 - phase) * 10);
    particle.scale.setScalar(size);
    particle.updateMatrix();
    state.petals.setMatrixAt(i, particle.matrix);
  }
  state.petals.instanceMatrix.needsUpdate = true;
  state.wetStone.roughness = 0.23 + Math.sin(t * 0.16) * 0.015;
  state.lantern.emissiveIntensity = 0.12 + dark * 2.4;
}
