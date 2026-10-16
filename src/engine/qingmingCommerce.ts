import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { StreetMaterials } from './qingmingEpisodes';

type P = [number, number, number];
export const QINGMING_SHOP_KINDS = [
  'wine',
  'tea-food',
  'medicine',
  'silk',
  'bamboo-wood',
  'paper',
  'grain',
  'inn',
] as const;

/** Reconstructed trade furnishings, not claims about the identity of a specific painted shop. */
export function buildQingmingShopFront(
  kind: number,
  width: number,
  depth: number,
  materials: StreetMaterials,
): THREE.Group {
  const k = ((Math.trunc(Number.isFinite(kind) ? kind : 0) % 8) + 8) % 8;
  const w = Math.max(0.5, Number.isFinite(width) ? width : 5.2);
  const d = Number.isFinite(depth) ? depth : 5;
  const group = new THREE.Group();
  group.name = `qingming-shop-${QINGMING_SHOP_KINDS[k]}`;
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const features: { name: string; triangles: number; bounds: number[] }[] = [];
  let feature = { name: '', triangles: 0, box: new THREE.Box3() };
  const start = (name: string) => {
    if (feature.name)
      features.push({
        name: feature.name,
        triangles: feature.triangles,
        bounds: [...feature.box.min.toArray(), ...feature.box.max.toArray()],
      });
    feature = { name, triangles: 0, box: new THREE.Box3() };
  };
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    p: P,
    rotation: P = [0, 0, 0],
  ) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...p),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    geometry.scale(w / 5.2, 1, 1);
    geometry.translate(0, 0, d / 2);
    geometry.computeBoundingBox();
    feature.box.union(geometry.boundingBox!);
    feature.triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
    const parts = buckets.get(material) ?? [];
    parts.push(geometry);
    buckets.set(material, parts);
  };
  const box = (size: P, p: P, m: THREE.Material = materials.wood, rotation: P = [0, 0, 0]) =>
    add(new THREE.BoxGeometry(...size), m, p, rotation);
  const cylinder = (
    r: number,
    h: number,
    p: P,
    m: THREE.Material = materials.wood,
    top = r,
    segments = 8,
    rotation: P = [0, 0, 0],
  ) => add(new THREE.CylinderGeometry(top, r, h, segments), m, p, rotation);
  const line = (a: P, b: P, r = 0.025, m: THREE.Material = materials.wood, sides = 5) => {
    const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const geo = new THREE.CylinderGeometry(r, r, direction.length(), sides);
    geo.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    );
    add(geo, m, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
  };
  const lathe = (profile: [number, number][], p: P, m: THREE.Material, segments = 10) =>
    add(
      new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        segments,
      ),
      m,
      p,
    );
  const bowl = (x: number, y: number, z: number, r = 0.19, m = materials.clay) =>
    lathe(
      [
        [0.03, 0],
        [r * 0.65, 0.035],
        [r, 0.16],
        [r - 0.025, 0.16],
        [r * 0.6, 0.055],
        [0.03, 0.025],
      ],
      [x, y, z],
      m,
      8,
    );
  const table = (x: number, z: number, length: number, height = 0.86, depth = 0.7) => {
    box([length, 0.09, depth], [x, height, z]);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(
          [0.08, height - 0.045, 0.08],
          [x + sx * (length / 2 - 0.1), (height - 0.045) / 2, z + sz * (depth / 2 - 0.08)],
        );
    box([length - 0.15, 0.07, 0.065], [x, height * 0.36, z]);
  };
  const shelf = (x: number, z: number, length: number, height: number, levels: number) => {
    for (const sx of [-1, 1])
      box([0.08, height, 0.12], [x + sx * (length / 2 - 0.04), height / 2, z]);
    for (let j = 0; j < levels; j++)
      box([length, 0.065, 0.48], [x, 0.2 + (j * (height - 0.3)) / (levels - 1), z]);
  };
  const textile = (
    x: number,
    y: number,
    z: number,
    length: number,
    drop: number,
    m: THREE.Material,
  ) => {
    // Actual folded surface: visible side thickness, with a bent return rather than a door decal.
    const geo = new THREE.PlaneGeometry(length, drop, 6, 3),
      p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i),
        py = p.getY(i);
      p.setXYZ(
        i,
        px,
        py,
        Math.sin((px / length) * Math.PI * 6) * 0.045 + Math.max(0, -py / drop - 0.28) * 0.27,
      );
    }
    geo.computeVertexNormals();
    add(geo, m, [x, y, z]);
    box([length, 0.025, 0.24], [x, y + drop / 2, z - 0.1], m);
  };

  if (k === 0) {
    start('wine-porcelain-vats-and-cloth-seals');
    for (let i = 0; i < 3; i++) {
      const x = -1.7 + i * 0.78;
      lathe(
        [
          [0.22, 0],
          [0.36, 0.12],
          [0.42, 0.55],
          [0.32, 0.91],
          [0.19, 1.02],
          [0.19, 1.08],
        ],
        [x, 0, -0.62],
        materials.clay,
      );
      cylinder(0.22, 0.045, [x, 1.09, -0.62], materials.linen);
      box([0.09, 0.38, 0.43], [x, 1.0, -0.62], materials.linen);
    }
    start('wine-serving-counter-and-measure');
    table(0.25, 0.58, 2.35);
    box([2.2, 0.5, 0.055], [0.25, 0.55, 0.89], materials.dark);
    for (let i = 0; i < 3; i++) bowl(-0.45 + i * 0.36, 0.92, 0.58, 0.13);
    cylinder(0.12, 0.24, [0.88, 1.03, 0.59], materials.wood, 0.15);
    line([0.9, 1.14, 0.58], [1.23, 1.38, 0.55], 0.025, materials.wood);
    start('wine-tasting-bench');
    table(1.68, -0.3, 0.8, 0.42, 0.4);
  } else if (k === 1) {
    start('tea-food-stacked-steamers');
    table(-0.95, 0.37, 2.0);
    for (let i = 0; i < 3; i++) {
      cylinder(0.36, 0.16, [-1.35, 0.99 + i * 0.17, 0.36], materials.linen);
      cylinder(0.37, 0.025, [-1.35, 1.065 + i * 0.17, 0.36], materials.wood);
    }
    cylinder(0.35, 0.07, [-1.35, 1.49, 0.36], materials.linen, 0.12);
    line([-1.46, 1.53, 0.36], [-1.24, 1.53, 0.36], 0.028);
    for (let i = 0; i < 3; i++)
      cylinder(
        0.075,
        0.07,
        [-0.61 + (i % 2) * 0.21, 0.94, 0.26 + Math.floor(i / 2) * 0.2],
        materials.linen,
        0.05,
        7,
      );
    start('tea-brazier-and-kettle');
    cylinder(0.32, 0.46, [1.0, 0.23, -0.38], materials.earth, 0.26);
    for (const x of [0.82, 1.18]) box([0.11, 0.17, 0.035], [x, 0.24, -0.12], materials.dark);
    lathe(
      [
        [0.12, 0],
        [0.23, 0.12],
        [0.21, 0.29],
        [0.11, 0.34],
      ],
      [1, 0.47, -0.38],
      materials.dark,
      8,
    );
    line([1.15, 0.65, -0.38], [1.4, 0.81, -0.38], 0.055, materials.dark);
    line([0.86, 0.78, -0.38], [0.86, 0.95, -0.38], 0.025, materials.dark);
    line([0.86, 0.95, -0.38], [1.13, 0.95, -0.38], 0.025, materials.dark);
    line([1.13, 0.95, -0.38], [1.13, 0.78, -0.38], 0.025, materials.dark);
    start('tea-bowls-and-long-bench');
    table(0.65, 0.9, 1.7, 0.45, 0.4);
    bowl(-0.38, 0.91, 0.53, 0.17);
    bowl(-0.43, 0.91, 0.08, 0.17);
  } else if (k === 2) {
    start('medicine-apothecary-drawers');
    box([2.35, 1.87, 0.42], [-0.6, 1.02, -0.89], materials.dark);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const x = -1.47 + col * 0.58,
          y = 0.36 + row * 0.43;
        box([0.53, 0.37, 0.07], [x, y, -0.64], materials.wood);
        box([0.12, 0.055, 0.045], [x, y + 0.045, -0.58], materials.linen);
        line([x - 0.065, y - 0.07, -0.58], [x + 0.065, y - 0.07, -0.58], 0.018, materials.dark, 4);
      }
    start('medicine-mortar-and-pestle');
    table(-0.5, 0.55, 2.7);
    bowl(-1.02, 0.92, 0.5, 0.28, materials.stone);
    line([-1.08, 1.0, 0.5], [-0.84, 1.4, 0.45], 0.05, materials.stone);
    for (let i = 0; i < 3; i++)
      box([0.3, 0.065, 0.26], [-0.1 + i * 0.35, 0.94, 0.48], materials.linen, [
        0,
        (i - 1) * 0.18,
        0,
      ]);
    start('medicine-small-steelyard');
    line([1.5, 0.05, -0.5], [1.5, 1.67, -0.5], 0.045);
    line([1.1, 1.55, -0.5], [1.95, 1.67, -0.5], 0.025, materials.dark);
    line([1.13, 1.55, -0.5], [1.13, 1.15, -0.5], 0.012, materials.linen, 3);
    bowl(1.13, 1.08, -0.5, 0.18, materials.dark);
    cylinder(0.07, 0.14, [1.82, 1.51, -0.5], materials.stone);
  } else if (k === 3) {
    start('silk-bolt-display-rack');
    shelf(-0.77, -0.83, 2.55, 2.1, 3);
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 3; i++) {
        cylinder(
          0.12,
          0.58,
          [-1.57 + i * 0.78, 0.37 + row * 0.9, -0.77],
          i % 2 ? materials.blue : materials.linen,
          0.12,
          8,
          [0, 0, Math.PI / 2],
        );
      }
    start('silk-hanging-folded-lengths');
    line([0.8, 0.08, -0.75], [0.8, 2.4, -0.75], 0.045);
    line([2.15, 0.08, -0.75], [2.15, 2.4, -0.75], 0.045);
    line([0.76, 2.35, -0.75], [2.2, 2.35, -0.75], 0.045);
    textile(1.17, 1.63, -0.7, 0.57, 1.35, materials.blue);
    textile(1.83, 1.49, -0.66, 0.53, 1.63, materials.linen);
    start('silk-cutting-table-and-folded-bolts');
    table(-0.55, 0.7, 2.7);
    for (let j = 0; j < 4; j++)
      box(
        [0.78, 0.065, 0.48],
        [-1.2, 0.95 + j * 0.07, 0.69],
        j % 2 ? materials.linen : materials.blue,
      );
    box([1.05, 0.025, 0.41], [0.12, 0.93, 0.7], materials.linen);
    line([-0.25, 0.96, 0.66], [0.58, 0.96, 0.72], 0.022, materials.dark, 4);
  } else if (k === 4) {
    start('bamboo-pole-bundle-and-ties');
    for (let i = 0; i < 7; i++) {
      const x = -1.85 + (i % 3) * 0.17,
        z = -0.85 + Math.floor(i / 3) * 0.17,
        h = 1.7 + (i % 3) * 0.21;
      line([x, 0.05, z], [x + 0.28, h, z], 0.045, materials.linen, 5);
      for (const y of [0.6, 1.2])
        box([0.12, 0.045, 0.11], [x + (0.28 * y) / h, y, z], materials.wood);
    }
    for (const y of [0.47, 1.25]) box([0.54, 0.045, 0.5], [-1.55, y, -0.69], materials.dark);
    start('woodworking-bench-plane-and-shavings');
    table(0.55, 0.45, 2.7, 0.73, 0.8);
    box([2.35, 0.13, 0.26], [0.55, 0.87, 0.4], materials.linen);
    box([0.38, 0.12, 0.15], [0.25, 0.99, 0.39], materials.wood);
    box([0.055, 0.17, 0.08], [0.28, 1.07, 0.4], materials.dark, [0, 0, -0.3]);
    for (let j = 0; j < 4; j++)
      box(
        [0.35, 0.018, 0.06],
        [1.0 + (j % 2) * 0.24, 0.81, 0.12 + Math.floor(j / 2) * 0.24],
        materials.linen,
        [0, j * 0.7, 0],
      );
    start('wood-hand-saw-and-split-staves');
    line([1.68, 0.08, -0.7], [1.68, 1.45, -0.7], 0.032);
    line([2.08, 0.08, -0.7], [2.08, 1.45, -0.7], 0.032);
    box([0.44, 0.06, 0.08], [1.88, 1.1, -0.7]);
    box([0.04, 1.25, 0.025], [1.82, 0.75, -0.7], materials.dark);
    for (let j = 0; j < 4; j++)
      box([0.13, 0.07, 1.12], [-0.55 + j * 0.2, 0.065, -0.23], materials.linen, [0, 0.11, 0]);
  } else if (k === 5) {
    start('paper-stacks-and-open-shelf');
    shelf(-1.25, -0.84, 1.55, 2.2, 3);
    for (let row = 0; row < 3; row++)
      for (let j = 0; j < 3; j++)
        box([1.17, 0.055, 0.36], [-1.25, 0.27 + row * 0.95 + j * 0.06, -0.81], materials.linen);
    start('paper-brushing-and-print-block-table');
    table(0.42, 0.55, 3.25);
    box([0.85, 0.07, 0.5], [0.04, 0.95, 0.5], materials.dark);
    for (let j = 0; j < 5; j++)
      box([0.58, 0.022, 0.025], [0.04, 1.0, 0.33 + j * 0.075], materials.wood);
    box([0.72, 0.018, 0.49], [1.08, 0.92, 0.55], materials.linen);
    box([0.24, 0.045, 0.2], [1.39, 0.96, 0.13], materials.stone);
    line([0.85, 0.96, 0.69], [1.25, 0.96, 0.75], 0.018, materials.wood, 5);
    line([1.25, 0.96, 0.75], [1.35, 0.96, 0.765], 0.026, materials.dark, 5);
    start('paper-hanging-sheets-and-drying-rail');
    line([0.15, 1.9, -0.83], [2.05, 1.9, -0.83], 0.035);
    for (let j = 0; j < 3; j++) {
      box([0.48, 0.68, 0.018], [0.5 + j * 0.58, 1.53, -0.81], materials.linen);
      box([0.09, 0.1, 0.045], [0.5 + j * 0.58, 1.84, -0.78]);
    }
  } else if (k === 6) {
    start('grain-open-divided-bins');
    for (let j = 0; j < 3; j++) {
      const x = -1.52 + j * 1.02;
      box([0.89, 0.08, 0.86], [x, 0.12, 0.4]);
      for (const side of [-1, 1]) {
        box([0.06, 0.6, 0.86], [x + side * 0.42, 0.43, 0.4]);
        box([0.89, 0.6, 0.06], [x, 0.43, 0.4 + side * 0.4]);
      }
      const heap = new THREE.SphereGeometry(0.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      heap.scale(1, 0.35, 0.9);
      add(heap, materials.linen, [x, 0.59, 0.4]);
      box([0.25, 0.23, 0.24], [x + 0.12, 0.8, 0.42], materials.wood, [0, 0.2, 0.12]);
    }
    start('grain-sacks-and-bound-mouths');
    for (let j = 0; j < 3; j++) {
      const x = -1.65 + j * 0.65;
      lathe(
        [
          [0.18, 0],
          [0.31, 0.14],
          [0.29, 0.6],
          [0.11, 0.78],
          [0.12, 0.89],
        ],
        [x, 0, -0.79],
        materials.linen,
        8,
      );
      cylinder(0.12, 0.045, [x, 0.8, -0.79], materials.dark);
    }
    start('grain-large-balance-and-measure');
    line([1.66, 0.04, -0.65], [1.66, 1.8, -0.65], 0.055);
    line([1.16, 1.66, -0.65], [2.13, 1.82, -0.65], 0.03);
    for (const x of [1.22, 2.04]) {
      line([x, 1.68, -0.65], [x, 1.28, -0.65], 0.013, materials.linen, 3);
      bowl(x, 1.16, -0.65, 0.2, materials.wood);
    }
  } else {
    start('inn-recessed-cot-and-rolled-bedding');
    table(-1.12, -0.63, 1.9, 0.47, 0.76);
    box([1.75, 0.08, 0.64], [-1.12, 0.55, -0.63], materials.blue);
    cylinder(0.15, 0.6, [-1.78, 0.71, -0.63], materials.linen, 0.15, 8, [Math.PI / 2, 0, 0]);
    start('inn-travel-cases-and-straps');
    for (let j = 0; j < 2; j++) {
      box([0.95, 0.37, 0.65], [1.35, 0.2 + j * 0.39, -0.65], j ? materials.wood : materials.dark);
      for (const x of [1.08, 1.62])
        box([0.065, 0.4, 0.69], [x, 0.2 + j * 0.39, -0.65], materials.linen);
      box([0.19, 0.045, 0.055], [1.35, 0.29 + j * 0.39, -0.28], materials.dark);
    }
    start('inn-checkin-desk-and-tally-board');
    table(0.6, 0.64, 1.5, 0.89, 0.66);
    box([0.52, 0.035, 0.37], [0.53, 0.96, 0.64], materials.linen, [0, -0.15, 0]);
    for (let j = 0; j < 4; j++)
      box([0.21, 0.01, 0.018], [0.51, 0.985, 0.53 + j * 0.055], materials.dark);
    start('inn-traveller-bench-and-foot-basin');
    table(-1.25, 0.81, 1.4, 0.4, 0.38);
    bowl(1.83, 0, 0.66, 0.35, materials.wood);
    line([2.1, 0.02, -0.1], [1.86, 1.67, -0.45], 0.03, materials.wood);
  }
  start('');
  for (const [material, parts] of buckets) {
    const geometry = mergeGeometries(parts, false)!;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${group.name}-batch-${Object.entries(materials).find(([, v]) => v === material)?.[0] ?? 'shared'}`;
    group.add(mesh);
    parts.forEach((part) => part.dispose());
  }
  group.userData.shopKind = QINGMING_SHOP_KINDS[k];
  group.userData.features = features;
  group.userData.triangleCount = features.reduce((sum, f) => sum + f.triangles, 0);
  group.userData.provenance =
    'Period-informed trade furnishings; shop identity and placement are interpretive.';
  return group;
}
