import * as THREE from 'three';
import type { Painting } from '../types';
import { clamp, seededRandom } from './math';
import { getWuhanGround, wuhanPath, wuhanShore } from './wuhanLayout';
import { gableGeometry, rod } from './modelGeometry';
import { batchStatic } from './resources';

type Point = readonly [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
interface Weather {
  rain: THREE.LineSegments;
  drops: Float32Array;
  rainOrigins: Float32Array;
  ripples: THREE.InstancedMesh;
  rippleOrigins: Float32Array;
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
function leafBlade(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.15, 0.025, 0.18, 0, 0.06, 0.2, 0, 0, 0, 0, 0.06, 0.2, 0.15, 0.025, 0.18, -0.15,
        0.025, 0.18, -0.12, 0.025, 0.32, 0, 0.06, 0.2, -0.12, 0.025, 0.32, 0, 0, 0.46, 0, 0.06, 0.2,
        0, 0.06, 0.2, 0, 0, 0.46, 0.12, 0.025, 0.32, 0, 0.06, 0.2, 0.12, 0.025, 0.32, 0.15, 0.025,
        0.18,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}
function osmanthusFlower(): THREE.BufferGeometry {
  const vertices: number[] = [];
  for (let petal = 0; petal < 4; petal++) {
    const a = petal * Math.PI * 0.5,
      u = [Math.cos(a), Math.sin(a)],
      v = [-Math.sin(a), Math.cos(a)];
    const left = [u[0]! * 0.48 + v[0]! * 0.28, u[1]! * 0.48 + v[1]! * 0.28, 0.06];
    const right = [u[0]! * 0.48 - v[0]! * 0.28, u[1]! * 0.48 - v[1]! * 0.28, 0.06];
    vertices.push(0, 0, 0, ...left, u[0]!, u[1]!, 0, 0, 0, 0, u[0]!, u[1]!, 0, ...right);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
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
export function buildWuhan(painting: Painting): THREE.Group {
  const group = new THREE.Group();
  group.name = 'East Lake · osmanthus garden in autumn rain';
  const random = seededRandom(painting.seed);
  const trunks: THREE.Matrix4[] = [],
    leaves: THREE.Matrix4[] = [],
    flowers: THREE.Matrix4[] = [],
    fallen: THREE.Matrix4[] = [],
    stones: THREE.Matrix4[] = [],
    reeds: THREE.Matrix4[] = [];
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: '#5b7d45',
    roughness: 0.49,
    side: THREE.DoubleSide,
  });
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: '#f0c051',
    roughness: 0.66,
    side: THREE.DoubleSide,
  });
  const goldenFlower = osmanthusFlower();
  let flowerFocus: Point | undefined;

  const tree = (x: number, z: number, size: number): void => {
    const y = getWuhanGround(x, z);
    if (y < 0.65) return;
    const height = 3.3 * size,
      lean = (random() - 0.5) * 0.6;
    trunks.push(segment([x, y, z], [x + lean, y + height, z], 0.15 * size));
    for (let arm = 0; arm < 6; arm++) {
      const angle = arm * 2.399 + random() * 0.3;
      const radius = (0.85 + random() * 0.7) * size;
      const end: Point = [
        x + lean + Math.cos(angle) * radius,
        y + height + (random() - 0.5) * size * 1.3,
        z + Math.sin(angle) * radius,
      ];
      trunks.push(
        segment([x + lean * 0.6, y + height * (0.47 + arm * 0.05), z], end, 0.055 * size),
      );
      // Glossy, opposite oval leaves sit along the outer twigs, with flowers at their axils.
      // No opaque crown volumes: gaps between individual leaf sprays admit skylight.
      for (let twig = 0; twig < 6; twig++) {
        const a = angle + twig * 2.399 + random() * 0.24;
        const reach = (0.72 + random() * 0.55) * size;
        const tip: Point = [
          end[0] + Math.cos(a) * reach,
          end[1] + (random() - 0.3) * 0.95 * size,
          end[2] + Math.sin(a) * reach,
        ];
        trunks.push(segment(end, tip, 0.017 * size));
        for (let node = 0; node < 5; node++) {
          const t = 0.24 + node * 0.17;
          const bx = end[0] + (tip[0] - end[0]) * t,
            by = end[1] + (tip[1] - end[1]) * t,
            bz = end[2] + (tip[2] - end[2]) * t;
          for (const sign of [-1, 1])
            leaves.push(
              pose(
                [bx, by, bz],
                [size * 0.95, size, size * (0.8 + random() * 0.3)],
                a + sign * Math.PI * 0.45,
                -0.68 + random() * 1.3,
              ),
            );
          if (node !== 1 && node !== 3) continue;
          for (let bloom = 0; bloom < 4; bloom++) {
            const flower: Point = [
              bx + (random() - 0.5) * 0.16,
              by - 0.085,
              bz + (random() - 0.5) * 0.16,
            ];
            flowers.push(
              pose(
                flower,
                [0.055 * size, 0.055 * size, 0.055 * size],
                a + random(),
                (random() - 0.5) * 1.2,
              ),
            );
            if (Math.abs(x + 18.5) < 0.01 && (!flowerFocus || flower[2] > flowerFocus[2]))
              flowerFocus = flower;
          }
        }
      }
    }
  };
  // Two loose groves leave open lake views and keep the path clear of trunks.
  for (let i = 0; i < 36; i++) {
    const x = -111 + (i % 18) * 13 + (random() - 0.5) * 3;
    const z = wuhanPath(x) + (i < 18 ? 6 : 16) + random() * 5;
    if (Math.abs(x - 23) < 9 && z < wuhanPath(x) + 13) continue;
    tree(x, z, 0.95 + random() * 0.65);
  }
  for (const [x, offset, size] of [
    [-18.5, 3.1, 1.1],
    [-9, 3.7, 1.35],
    [43, 2.5, 1.05],
    [-74, 3, 1.3],
  ] as const)
    tree(x, wuhanShore(x) + offset, size);
  // Small silhouettes on the far bank remain subordinate to the foreground flowers.
  for (let i = 0; i < 10; i++) tree(-100 + i * 23, -110 + Math.sin(i) * 7, 1.1 + random() * 0.4);

  batch(
    group,
    'Osmanthus forked trunks and fine twigs',
    new THREE.CylinderGeometry(0.65, 1, 1, 6),
    rough('#605747'),
    trunks,
  );
  batch(group, 'Opposite glossy osmanthus leaves', leafBlade(), leafMaterial, leaves);
  batch(group, 'Golden four-petal flower clusters', goldenFlower, flowerMaterial, flowers);
  group.userData.flowerFocus = flowerFocus;

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
    for (let petal = 0; petal < 3; petal++) {
      const px = x + (random() - 0.5) * 1.4,
        pz = z + (random() - 0.5) * 3.5;
      fallen.push(
        pose(
          [px, getWuhanGround(px, pz) + 0.045, pz],
          [0.038, 0.038, 0.038],
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
    osmanthusFlower(),
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
  const ripples = new THREE.InstancedMesh(
    rippleGeometry,
    new THREE.MeshBasicMaterial({
      color: '#c0d6c9',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    72,
  );
  ripples.name = 'Expanding lake raindrop rings';
  ripples.frustumCulled = false;
  group.add(ripples);
  weather.set(group, { rain, drops, rainOrigins, ripples, rippleOrigins, wetStone, lantern });
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
  for (let i = 0; i < state.rainOrigins.length / 3; i++) {
    const x = state.rainOrigins[i * 3]!,
      z = state.rainOrigins[i * 3 + 2]!;
    const y = ((state.rainOrigins[i * 3 + 1]! - ((t * 10.5) % 30) + 30) % 30) + 0.4;
    state.drops.set(
      [x + Math.sin(t * 0.13) * 0.5, y, z, x + 0.12 + Math.sin(t * 0.13) * 0.5, y + 0.65, z + 0.08],
      i * 6,
    );
  }
  state.rain.geometry.attributes.position!.needsUpdate = true;
  (state.rain.material as THREE.LineBasicMaterial).opacity = 0.27 - dark * 0.15;
  for (let i = 0; i < state.ripples.count; i++) {
    const phase = (state.rippleOrigins[i * 3 + 1]! + t * 0.48) % 1,
      scale = 0.08 + phase * 0.5;
    state.ripples.setMatrixAt(
      i,
      pose(
        [state.rippleOrigins[i * 3]!, 0.055, state.rippleOrigins[i * 3 + 2]!],
        [scale, 1, scale],
      ),
    );
  }
  state.ripples.instanceMatrix.needsUpdate = true;
  (state.ripples.material as THREE.MeshBasicMaterial).opacity = 0.18 - dark * 0.1;
  state.wetStone.roughness = 0.23 + Math.sin(t * 0.16) * 0.015;
  state.lantern.emissiveIntensity = 0.12 + dark * 2.4;
}
