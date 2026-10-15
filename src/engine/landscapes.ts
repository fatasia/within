import * as THREE from 'three';
import type { Painting } from '../types';
import { seededRandom } from './math';
import { groundHeight } from './terrain';
import { landscapeRiverCenter } from './geography';

const UP = new THREE.Vector3(0, 1, 0);
type Point = readonly [number, number, number];

/** Each species/material has one draw call, even for hundreds of detailed branch segments. */
class Instances {
  private matrices: THREE.Matrix4[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private name: string;
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
    this.geometry = geometry;
    this.material = material;
    this.name = name;
  }
  add(at: Point, scale: Point = [1, 1, 1], rotation = 0): void {
    this.matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...at),
        new THREE.Quaternion().setFromAxisAngle(UP, rotation),
        new THREE.Vector3(...scale),
      ),
    );
  }
  segment(start: Point, end: Point, radius: number): void {
    const a = new THREE.Vector3(...start),
      b = new THREE.Vector3(...end);
    const delta = b.sub(a);
    this.matrices.push(
      new THREE.Matrix4().compose(
        a.clone().addScaledVector(delta, 0.5),
        new THREE.Quaternion().setFromUnitVectors(UP, delta.clone().normalize()),
        new THREE.Vector3(radius, delta.length(), radius),
      ),
    );
  }
  finish(group: THREE.Group): void {
    if (!this.matrices.length) {
      this.geometry.dispose();
      this.material.dispose();
      return;
    }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.matrices.length);
    mesh.name = this.name;
    this.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
}

function surface(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.94 });
}

function leafGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  // A folded lanceolate blade catches light on its ridge rather than reading as a flat triangle.
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -0.13, 0.06, 0.38, 0, 0.11, 0.42, 0, 0, 0, 0, 0.11, 0.42, 0.13, 0.06, 0.38, -0.13,
        0.06, 0.38, 0, 0, 1, 0, 0.11, 0.42, 0, 0.11, 0.42, 0, 0, 1, 0.13, 0.06, 0.38,
      ],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function wetRockGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    p.setXYZ(
      i,
      x * (1 + Math.sin(z * 8 + y * 3) * 0.1),
      y * 0.65,
      z * (1 + Math.cos(x * 6) * 0.13),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function cliffPineCrown(flat = true): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 9, 4);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const angle = Math.atan2(z, x);
    const edge = 0.88 + Math.sin(angle * 5 + y * 3) * 0.12;
    p.setXYZ(i, x * edge, y * (flat ? 0.27 : 0.7) + Math.sin(angle * 3) * 0.07, z * edge);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Close-range botany and river life, separate from the mountain heightfield. */
export function buildLandscapeDetails(painting: Painting): THREE.Group {
  const group = new THREE.Group();
  group.name =
    painting.id === 'zhangjiajie'
      ? 'Wulingyuan · cliffs and stream'
      : 'Li River · bamboo and rafts';
  if (painting.id !== 'zhangjiajie' && painting.id !== 'guilin') return group;
  const random = seededRandom(painting.seed + 71);
  const zhangjiajie = painting.id === 'zhangjiajie';
  const bark = new Instances(
    new THREE.CylinderGeometry(0.7, 1, 1, 5),
    surface('#544c3d'),
    'Bent pine trunks and branches',
  );
  const crowns = new Instances(
    cliffPineCrown(zhangjiajie),
    surface('#344d38'),
    zhangjiajie ? 'Scalloped cliff pine crowns' : 'Broadleaf riverbank crowns',
  );
  const stones = new Instances(
    wetRockGeometry(),
    surface(zhangjiajie ? '#8c8878' : '#9b9f8c'),
    'Weathered shoreline stones',
  );
  const moss = new Instances(wetRockGeometry(), surface('#526247'), 'Moss on shaded stones');
  const bamboo = new Instances(
    new THREE.CylinderGeometry(0.84, 1, 1, 7),
    surface('#71784b'),
    'Jointed bamboo culms',
  );
  const joints = new Instances(
    new THREE.CylinderGeometry(1, 1, 0.035, 8),
    surface('#9eaa77'),
    'Bamboo node rings',
  );
  const bladeMaterial = surface('#496641');
  bladeMaterial.side = THREE.DoubleSide;
  const leaves = new Instances(leafGeometry(), bladeMaterial, 'Folded lanceolate bamboo leaves');
  const wood = new Instances(
    new THREE.BoxGeometry(1, 1, 1),
    surface('#8b785b'),
    'Footpath and landing timber',
  );
  const rope = new Instances(
    new THREE.CylinderGeometry(1, 1, 1, 5),
    surface('#66573e'),
    'Raft lashings and poles',
  );
  const rafts = new Instances(
    new THREE.CylinderGeometry(0.95, 1, 1, 8),
    surface('#b1a476'),
    'Curved bamboo raft poles',
  );
  const hats = new Instances(
    new THREE.ConeGeometry(1, 0.46, 12),
    surface('#b3a078'),
    'Woven fisherman hats',
  );
  const coats = new Instances(
    new THREE.CylinderGeometry(0.6, 1, 1, 7),
    surface('#485862'),
    'Fisherman cotton coats',
  );
  const skin = new Instances(
    new THREE.SphereGeometry(1, 7, 5),
    surface('#ae8b6c'),
    'Fisherman hands and face',
  );

  const pine = (x: number, z: number, size: number): void => {
    const y = groundHeight(painting, x, z);
    if (y < 0.5) return;
    const bend = (random() - 0.5) * size * 0.8;
    const top: [number, number, number] = [x + bend, y + size * 3.2, z + size * 0.2];
    bark.segment([x, y, z], [x + bend * 0.4, y + size * 1.65, z], size * 0.15);
    bark.segment([x + bend * 0.4, y + size * 1.65, z], top, size * 0.11);
    for (let k = 0; k < 4; k++) {
      const angle = k * 2.4 + random() * 0.5;
      const level = 0.45 + k * 0.15;
      const start: Point = [x + bend * level, y + size * 3.2 * level, z];
      const end: Point = [
        start[0] + Math.cos(angle) * size * (1.2 - k * 0.15),
        start[1] + size * 0.2,
        z + Math.sin(angle) * size * (1.2 - k * 0.15),
      ];
      bark.segment(start, end, size * 0.055);
      crowns.add(end, [size * (1.2 - k * 0.1), size * 0.95, size * (0.8 - k * 0.06)], angle);
    }
    crowns.add(top, [size * 0.85, size * 0.8, size * 0.75]);
  };

  // Summit groves stay on the broad cap; terrain sampling anchors each root to the rock.
  painting.peaks.forEach((peak) => {
    for (let j = 0; j < 3; j++) {
      const angle = random() * Math.PI * 2,
        radius = peak.radius * (0.025 + random() * 0.18);
      pine(
        peak.x + Math.cos(angle) * radius,
        peak.z + Math.sin(angle) * radius,
        zhangjiajie ? 1.1 + random() * 0.7 : 0.8 + random() * 0.8,
      );
    }
  });
  // Valley forest is a deliberately uneven band, with an open walking corridor beside the stream.
  for (let i = 0; i < (zhangjiajie ? 45 : 28); i++) {
    const x = -129 + random() * 258;
    const z = zhangjiajie ? -22 + random() * 27 : -32 - random() * 12;
    const y = groundHeight(painting, x, z);
    const slope =
      Math.abs(groundHeight(painting, x + 0.7, z) - y) +
      Math.abs(groundHeight(painting, x, z + 0.7) - y);
    if (slope < 1.6) pine(x, z, 1.1 + random() * 1.3);
  }

  // Smooth stones follow the actual waterline; no disconnected rocks floating above the water.
  for (let i = 0; i < 180; i++) {
    const x = -132 + random() * 264;
    const side = random() < 0.5 ? -1 : 1;
    const z =
      landscapeRiverCenter(painting, x) + side * ((zhangjiajie ? 4.5 : 21) + random() * 3.6);
    const y = groundHeight(painting, x, z);
    if (y > 4) continue;
    const s = 0.2 + Math.pow(random(), 2) * 1.2;
    stones.add([x, y + 0.1, z], [s, s * 0.65, s * (0.7 + random())], random() * 6.28);
    if (i % 4 === 0)
      moss.add([x, y + s * 0.32, z], [s * 0.83, s * 0.28, s * 0.78], random() * 6.28);
  }

  const bambooClump = (x: number, z: number): void => {
    const y = groundHeight(painting, x, z);
    if (y < 0.5 || y > 8) return;
    for (let stem = 0; stem < 4; stem++) {
      const angle = random() * Math.PI * 2,
        spread = 0.25 + random() * 0.55;
      const px = x + Math.cos(angle) * spread,
        pz = z + Math.sin(angle) * spread;
      const h = 4.5 + random() * 2.6;
      const lean = 0.3 + random() * 0.65;
      for (let node = 0; node < 6; node++) {
        const t = node / 6,
          next = (node + 1) / 6;
        const bx = px + Math.cos(angle) * lean * t * t,
          bz = pz + Math.sin(angle) * lean * t * t;
        bamboo.segment(
          [bx, y + h * t, bz],
          [
            px + Math.cos(angle) * lean * next * next,
            y + h * next,
            pz + Math.sin(angle) * lean * next * next,
          ],
          0.065,
        );
        joints.add([bx, y + h * t, bz], [0.074, 1, 0.074]);
        if (node < 3) continue;
        for (let branch = 0; branch < 2; branch++) {
          const a = angle + branch * 2.7 + node;
          const ex = bx + Math.cos(a) * 0.65,
            ez = bz + Math.sin(a) * 0.65;
          bamboo.segment([bx, y + h * t, bz], [ex, y + h * t + 0.3, ez], 0.016);
          for (let leaf = 0; leaf < 3; leaf++) {
            const u = (leaf + 1) / 4;
            leaves.add(
              [bx + (ex - bx) * u, y + h * t + 0.3 * u, bz + (ez - bz) * u],
              [0.8, 0.8, 0.65],
              a + (leaf % 2 === 0 ? 0.8 : -0.8),
            );
          }
        }
      }
    }
  };

  if (zhangjiajie) {
    // Stone walking slabs retain irregular edges and leave the creek unobstructed.
    for (let i = 0; i < 112; i++) {
      const x = -122 + i * 2.2,
        z = landscapeRiverCenter(painting, x) + 9;
      const y = groundHeight(painting, x, z);
      stones.add([x, y - 0.04, z], [1.18, 0.18, 1.25], Math.sin(i) * 0.09);
    }
    for (let i = 0; i < 6; i++) bambooClump(-100 + i * 40, 33 + (i % 2) * 4);
  } else {
    for (let i = 0; i < 15; i++) {
      const x = -112 + i * 16;
      bambooClump(x, landscapeRiverCenter(painting, x) + 30 + (i % 3) * 2);
    }
    // Two asymmetric foreground clumps frame the landing from the walking start.
    bambooClump(-35.5, landscapeRiverCenter(painting, -35.5) + 24);
    bambooClump(-28.5, landscapeRiverCenter(painting, -28.5) + 24);
    // Near-bank footpath stays continuous while the river bend changes beneath it.
    for (let i = 0; i < 96; i++) {
      const x = -119 + i * 2.5,
        z = landscapeRiverCenter(painting, x) + 28;
      stones.add([x, groundHeight(painting, x, z) - 0.06, z], [1.4, 0.16, 0.9], Math.sin(i) * 0.06);
    }
    for (const [x, z, turn] of [
      [-49, 4, 0.2],
      [8, 1, -0.2],
      [65, 6, 0.12],
    ]) {
      const cos = Math.cos(turn!),
        sin = Math.sin(turn!);
      const point = (dx: number, dy: number, dz: number): Point => [
        x! + dx * cos - dz * sin,
        dy,
        z! + dx * sin + dz * cos,
      ];
      for (let j = 0; j < 7; j++) {
        const dx = (j - 3) * 0.22;
        rafts.segment(point(dx, 0.13, -2.5), point(dx, 0.13, 2.5), 0.115);
        rafts.segment(point(dx, 0.13, 2.5), point(dx, 0.33, 3.1), 0.1);
        rafts.segment(point(dx, 0.13, -2.5), point(dx, 0.29, -2.95), 0.1);
      }
      for (const dz of [-1.8, -0.8, 0.8, 1.8])
        rope.segment(point(-0.8, 0.26, dz), point(0.8, 0.26, dz), 0.035);
      wood.add(point(0, 0.65, -0.8), [0.75, 0.13, 0.45], turn);
      for (const dx of [-0.3, 0.3]) wood.add(point(dx, 0.43, -0.8), [0.07, 0.4, 0.1], turn);
      coats.add(point(0, 0.95, 1.1), [0.24, 0.75, 0.26], turn);
      skin.add(point(0, 1.47, 1.1), [0.14, 0.18, 0.14]);
      hats.add(point(0, 1.67, 1.1), [0.43, 0.7, 0.43]);
      for (const dx of [-0.12, 0.12]) rope.segment(point(dx, 0.3, 1.1), point(dx, 0.65, 1.1), 0.07);
      rope.segment(point(0.35, 0.0, 1.8), point(0.7, 2.5, 0.9), 0.025);
      skin.segment(point(0.12, 1.15, 1.1), point(0.51, 1.2, 1.35), 0.055);
    }
    // A low timber landing gives the first-person start a clear human scale.
    const landingX = -32,
      landingZ = landscapeRiverCenter(painting, landingX) + 23;
    for (let i = 0; i < 15; i++) wood.add([landingX, 1.5, landingZ - i * 0.36], [2.8, 0.14, 0.32]);
    for (const x of [-33.25, -30.75])
      for (const z of [landingZ, landingZ - 4.8]) {
        rope.segment([x, -0.3, z], [x, 2.15, z], 0.1);
      }
  }
  for (const batch of [
    bark,
    crowns,
    stones,
    moss,
    bamboo,
    joints,
    leaves,
    wood,
    rope,
    rafts,
    hats,
    coats,
    skin,
  ])
    batch.finish(group);
  return group;
}
