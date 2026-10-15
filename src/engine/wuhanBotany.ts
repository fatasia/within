import * as THREE from 'three';
import type { Painting, Quality } from '../types';
import { seededRandom } from './math';
import { getWuhanGround, wuhanPath, wuhanShore, WUHAN_FLOWER_FOCUS } from './wuhanLayout';

type Point = readonly [number, number, number];
export interface GardenTree {
  x: number;
  z: number;
  y: number;
  size: number;
  hero: boolean;
}
export interface GardenBotany {
  group: THREE.Group;
  trees: GardenTree[];
}
const UP = new THREE.Vector3(0, 1, 0);
function pose(at: Point, scale: Point, yaw: number, pitch = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0)),
    new THREE.Vector3(...scale),
  );
}
function rod(a: Point, b: Point, radius: number): THREE.Matrix4 {
  const start = new THREE.Vector3(...a),
    direction = new THREE.Vector3(...b).sub(start);
  return new THREE.Matrix4().compose(
    start.clone().addScaledVector(direction, 0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
    new THREE.Vector3(radius, direction.length(), radius),
  );
}
function batch(
  group: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  poses: THREE.Matrix4[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, poses.length);
  mesh.name = name;
  poses.forEach((p, i) => mesh.setMatrixAt(i, p));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
  return mesh;
}

/** Elliptic pointed evergreen blade with a continuous midrib and softly curved lamina. */
function leafGeometry(detailed: boolean): THREE.BufferGeometry {
  const segments = detailed ? 5 : 2,
    vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      halfWidth = Math.pow(Math.sin(t * Math.PI), 0.82) * 0.105;
    const curve = Math.sin(t * Math.PI) * 0.022;
    for (const side of [-1, 0, 1]) {
      vertices.push(halfWidth * side, curve + (side === 0 ? 0.012 : 0), t * 0.32);
      const color = new THREE.Color(side === 0 ? '#819356' : '#4f7043');
      colors.push(color.r, color.g, color.b);
    }
    if (i < segments) {
      const a = i * 3;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function osmanthusFlowerGeometry(): THREE.BufferGeometry {
  const vertices: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI * 0.5,
      dx = Math.cos(a),
      dy = Math.sin(a),
      px = -dy,
      py = dx;
    vertices.push(
      0,
      0,
      0.02,
      dx * 0.55 + px * 0.3,
      dy * 0.55 + py * 0.3,
      0.06,
      dx,
      dy,
      0,
      0,
      0,
      0.02,
      dx,
      dy,
      0,
      dx * 0.55 - px * 0.3,
      dy * 0.55 - py * 0.3,
      0.06,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Regional autumn garden palette; references describe East Lake, not a surveyed planting bed. */
export function buildWuhanBotany(painting: Painting, quality: Quality): GardenBotany {
  const group = new THREE.Group();
  group.name = 'Osmanthus foliage and seasonal garden plants';
  group.userData.ecologySources = [
    'https://www.wuhan.gov.cn/zjwh/whly/202410/t20241012_2467368.shtml',
    'https://wlj.wuhan.gov.cn/zwgk_27/zwdt/xydt/202602/t20260209_2726280.shtml',
  ];
  const layout = seededRandom(painting.seed + 904),
    trees: GardenTree[] = [];
  const add = (x: number, z: number, size: number, hero = false): void => {
    const y = getWuhanGround(x, z);
    if (y > 0.65) trees.push({ x, z, y, size, hero });
  };
  for (let i = 0; i < 34; i++) {
    const x = -112 + (i % 17) * 14 + (layout() - 0.5) * 3,
      z = wuhanPath(x) + (i < 17 ? 6.5 : 16) + layout() * 4;
    if (Math.abs(x - 23) < 10 && z < wuhanPath(x) + 14) continue;
    add(x, z, 0.95 + layout() * 0.55);
  }
  for (const [x, offset, size] of [
    [-18.5, 3.1, 1.1],
    [-9, 3.7, 1.35],
    [43, 2.5, 1.05],
    [-74, 3, 1.3],
  ] as const)
    add(x, wuhanShore(x) + offset, size, true);
  for (let i = 0; i < 9; i++) add(-103 + i * 26, -111 + Math.sin(i) * 5, 1.2);
  const trunks: THREE.Matrix4[] = [],
    fineLeaves: THREE.Matrix4[] = [],
    distantLeaves: THREE.Matrix4[] = [],
    blooms: THREE.Matrix4[] = [],
    midribs: THREE.Matrix4[] = [],
    litter: THREE.Matrix4[] = [];
  const nodeCount = quality === 'high' ? 6 : quality === 'balanced' ? 5 : 2;
  const farTwigs = quality === 'high' ? 8 : quality === 'balanced' ? 6 : 1;
  for (let index = 0; index < trees.length; index++) {
    const { x, z, y, size, hero } = trees[index]!,
      r = seededRandom(painting.seed + index * 311),
      arms = hero ? 8 : quality === 'low' ? 4 : 6;
    const height = size * 3.25,
      lean = (r() - 0.5) * 0.4;
    trunks.push(rod([x, y, z], [x + lean, y + height, z], size * 0.13));
    for (let arm = 0; arm < arms; arm++) {
      const a = arm * 2.399 + r() * 0.3,
        radius = size * (0.7 + r() * 0.72);
      const end: Point = [
        x + lean + Math.cos(a) * radius,
        y + height + (r() - 0.5) * size * 1.6,
        z + Math.sin(a) * radius,
      ];
      trunks.push(
        rod([x + lean * 0.6, y + height * (0.4 + (arm / arms) * 0.3), z], end, size * 0.042),
      );
      const twigs = hero ? 9 : farTwigs;
      for (let twig = 0; twig < twigs; twig++) {
        const angle = a + twig * 2.399 + r() * 0.35,
          reach = size * (0.5 + r() * 0.7);
        const tip: Point = [
          end[0] + Math.cos(angle) * reach,
          end[1] + (r() - 0.48) * size * 1.2,
          end[2] + Math.sin(angle) * reach,
        ];
        trunks.push(rod(end, tip, size * 0.012));
        const nodes = hero ? 6 : nodeCount;
        for (let node = 0; node < nodes; node++) {
          const t = 0.15 + (node / (nodes - 1)) * 0.8,
            base: Point = [
              end[0] + (tip[0] - end[0]) * t,
              end[1] + (tip[1] - end[1]) * t,
              end[2] + (tip[2] - end[2]) * t,
            ];
          for (const sign of [-1, 1]) {
            const transform = pose(
              base,
              [size * (0.86 + r() * 0.22), size, size * (0.8 + r() * 0.35)],
              angle + sign * 1.2,
              -0.95 + r() * 1.6,
            );
            (hero ? fineLeaves : distantLeaves).push(transform);
            if (hero && node % 2 === 0) {
              const a = new THREE.Vector3(0, 0.014, 0.02).applyMatrix4(transform),
                b = new THREE.Vector3(0, 0.035, 0.285).applyMatrix4(transform);
              midribs.push(
                rod(
                  a.toArray() as [number, number, number],
                  b.toArray() as [number, number, number],
                  0.0022 * size,
                ),
              );
            }
          }
          // Small axillary clusters, never one giant golden blossom per branch.
          if (node !== 2 && !(hero && node === 4)) continue;
          for (let flower = 0; flower < (hero ? 5 : 3); flower++)
            blooms.push(
              pose(
                [base[0] + (r() - 0.5) * 0.055, base[1] - 0.045, base[2] + (r() - 0.5) * 0.055],
                [0.021 * size, 0.021 * size, 0.021 * size],
                angle + r(),
                (r() - 0.5) * 1.4,
              ),
            );
        }
      }
    }
    // Fallen corollas accumulate under the drip line, not uniformly along every metre of road.
    const litterCount = hero ? 130 : quality === 'low' ? 16 : 32;
    for (let j = 0; j < litterCount; j++) {
      const a = r() * Math.PI * 2,
        rad = Math.sqrt(r()) * size * 2.1;
      const lx = x + Math.cos(a) * rad,
        lz = z + Math.sin(a) * rad,
        ly = getWuhanGround(lx, lz);
      if (ly < 0.5) continue;
      const onPath = Math.abs(lz - wuhanPath(lx)) < 2;
      litter.push(
        pose(
          [lx, ly + (onPath ? 0.047 : 0.014), lz],
          [0.019, 0.019, 0.019],
          r() * 6.28,
          -Math.PI * 0.5,
        ),
      );
    }
  }
  // This front-facing outer spray is stable across all tiers and anchors the detail shot.
  const focus = WUHAN_FLOWER_FOCUS;
  trunks.push(
    rod(
      [focus[0] - 0.48, focus[1] - 0.19, focus[2] - 0.55],
      [focus[0] + 0.14, focus[1] + 0.06, focus[2] + 0.16],
      0.011,
    ),
  );
  for (let n = 0; n < 5; n++) {
    const z = focus[2] - 0.45 + n * 0.14,
      x = focus[0] - 0.35 + n * 0.1,
      y = focus[1] - 0.12 + n * 0.04;
    for (const sign of [-1, 1]) fineLeaves.push(pose([x, y, z], [1, 1, 1], sign * 1.2, 0.25));
  }
  blooms.push(pose(focus, [0.023, 0.023, 0.023], 0, 0.18));
  for (let n = 0; n < 8; n++) {
    const a = n * 2.399;
    blooms.push(
      pose(
        [focus[0] + Math.cos(a) * 0.044, focus[1] + Math.sin(a) * 0.035, focus[2] - 0.008],
        [0.019, 0.019, 0.019],
        a,
        0.16,
      ),
    );
  }

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: '#d2d9bd',
    vertexColors: true,
    roughness: 0.56,
    side: THREE.DoubleSide,
  });
  batch(
    group,
    'Osmanthus forked trunks and fine twigs',
    new THREE.CylinderGeometry(0.6, 1, 1, 5),
    new THREE.MeshStandardMaterial({ color: '#6d6250', roughness: 0.9 }),
    trunks,
  );
  batch(group, 'Opposite glossy osmanthus leaves', leafGeometry(true), leafMaterial, fineLeaves);
  batch(
    group,
    'Distant osmanthus leaf sprays',
    leafGeometry(false),
    leafMaterial.clone(),
    distantLeaves,
  );
  batch(
    group,
    'Fine pale leaf midribs',
    new THREE.CylinderGeometry(0.7, 1, 1, 3),
    new THREE.MeshStandardMaterial({ color: '#87945c', roughness: 0.8 }),
    midribs,
  );
  const golden = new THREE.MeshStandardMaterial({
    color: '#d9af49',
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  batch(group, 'Golden four-petal flower clusters', osmanthusFlowerGeometry(), golden, blooms);
  batch(
    group,
    'Fallen golden flowers below osmanthus crowns',
    osmanthusFlowerGeometry(),
    golden.clone(),
    litter,
  );
  group.userData.flowerFocus = [...focus];
  group.userData.treeBases = trees.map(({ x, y, z, size }) => ({ x, y, z, size }));
  // A modest planted sulfur-cosmos border, based on the official East Lake autumn flower menu.
  const stems: THREE.Matrix4[] = [],
    petals: THREE.Matrix4[] = [],
    centres: THREE.Matrix4[] = [];
  const floral = seededRandom(430109);
  for (let i = 0; i < (quality === 'low' ? 16 : 30); i++) {
    const x = -45 + floral() * 8,
      z = wuhanPath(x) + 3.8 + floral() * 2,
      y = getWuhanGround(x, z),
      h = 0.5 + floral() * 0.45;
    stems.push(rod([x, y, z], [x + 0.1, y + h, z], 0.014));
    for (let p = 0; p < 8; p++) {
      const a = p * Math.PI * 0.25;
      petals.push(
        pose(
          [x + 0.1 + Math.sin(a) * 0.075, y + h, z + Math.cos(a) * 0.075],
          [0.38, 0.35, 0.38],
          a,
          -Math.PI * 0.5,
        ),
      );
    }
    centres.push(pose([x + 0.1, y + h + 0.01, z], [0.035, 0.025, 0.035], 0));
    for (let j = 0; j < 3; j++)
      stems.push(
        rod(
          [x, y + h * 0.4, z],
          [x + Math.cos(j * 2.1) * 0.17, y + h * 0.5, z + Math.sin(j * 2.1) * 0.17],
          0.008,
        ),
      );
  }
  batch(
    group,
    'Autumn cosmos fine stems',
    new THREE.CylinderGeometry(0.4, 1, 1, 4),
    new THREE.MeshStandardMaterial({ color: '#697b49' }),
    stems,
  );
  batch(
    group,
    'Restrained sulfur cosmos flower border',
    leafGeometry(false),
    new THREE.MeshStandardMaterial({ color: '#d7a146', roughness: 0.8, side: THREE.DoubleSide }),
    petals,
  );
  batch(
    group,
    'Cosmos flower hearts',
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: '#9a782e' }),
    centres,
  );
  // Keep vector allocations out of update loops; all botanical transforms are static.
  return { group, trees };
}
