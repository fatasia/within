import * as THREE from 'three';
import type { Painting, Vec3 } from '../types';
import { seededRandom } from './math';
import { rod } from './modelGeometry';
import { batchStatic } from './resources';
import { groundHeight } from './terrain';

const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
type Palette = ReturnType<typeof palette>;
function palette() {
  return {
    stone: material('#c2bca2'),
    dark: material('#524f44'),
    cloth: material('#d5cab0'),
    red: material('#834b43'),
    skin: material('#af8a65'),
    leaf: material('#62715a'),
  };
}
function ellipsoid(group: THREE.Group, at: Vec3, scale: Vec3, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), mat);
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
}
function block(group: THREE.Group, at: Vec3, size: Vec3, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...at);
  group.add(mesh);
  return mesh;
}
function beam(group: THREE.Group, a: Vec3, b: Vec3, radius: number, mat: THREE.Material) {
  return rod(group, new THREE.Vector3(...a), new THREE.Vector3(...b), radius, mat);
}

/** Cloth folds, exposed forearms and separated legs; these are interpretive figures. */
function citizen(p: Palette, stride: number, ceremonial: boolean): THREE.Group {
  const g = new THREE.Group();
  const tunic = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.31, 0.78, 12),
    ceremonial ? p.cloth : p.red,
  );
  tunic.scale.z = 0.72;
  tunic.position.y = 0.96;
  g.add(tunic);
  for (const side of [-1, 1]) {
    beam(g, [side * 0.12, 0.65, 0], [side * 0.13, 0.12, side * stride], 0.075, p.skin);
    ellipsoid(g, [side * 0.13, 0.065, side * stride + 0.045], [0.09, 0.065, 0.18], p.dark);
    const wrist: Vec3 = [side * 0.32, 0.9 + (side === 1 ? 0.21 : 0), side * stride];
    beam(g, [side * 0.22, 1.27, 0], [side * 0.32, 1.05, 0.04], 0.07, p.skin);
    beam(g, [side * 0.32, 1.05, 0.04], wrist, 0.055, p.skin);
  }
  beam(g, [0, 1.27, 0], [0, 1.48, 0], 0.075, p.skin);
  ellipsoid(g, [0, 1.6, 0], [0.12, 0.17, 0.12], p.skin);
  ellipsoid(g, [0, 1.69, -0.025], [0.125, 0.09, 0.12], p.dark);
  ellipsoid(g, [0, 1.6, 0.115], [0.035, 0.045, 0.045], p.skin);
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7;
    beam(
      g,
      [Math.sin(a) * 0.205, 1.27, Math.cos(a) * 0.15],
      [Math.sin(a) * 0.306, 0.6, Math.cos(a) * 0.22],
      0.012,
      p.cloth,
    );
  }
  return g;
}

function sheep(p: Palette, grazing: boolean): THREE.Group {
  const g = new THREE.Group();
  ellipsoid(g, [0, 0.66, 0], [0.59, 0.34, 0.3], p.cloth);
  for (const x of [-0.32, 0.32])
    for (const z of [-0.19, 0.19]) beam(g, [x, 0.59, z], [x + 0.04, 0.08, z], 0.045, p.dark);
  const headY = grazing ? 0.37 : 0.77;
  beam(g, [0.4, 0.71, 0], [0.62, headY + 0.04, 0], 0.12, p.cloth);
  ellipsoid(g, [0.66, headY, 0], [0.22, 0.15, 0.13], p.dark);
  for (const side of [-1, 1])
    ellipsoid(g, [0.59, headY + 0.1, side * 0.16], [0.11, 0.04, 0.07], p.cloth);
  return g;
}

function ceremonialLitter(p: Palette): THREE.Group {
  const g = new THREE.Group();
  // Two poles meet the bearers' inner forearms; the throne is not floating above a crowd.
  for (const side of [-1, 1]) {
    beam(g, [-2.15, 1.11, side * 0.61], [2.15, 1.11, side * 0.61], 0.065, p.dark);
    for (const x of [-1.25, 1.25]) {
      const bearer = citizen(p, 0.1 * side, true);
      bearer.position.set(x, 0, side * 0.93);
      bearer.rotation.y = Math.PI / 2;
      g.add(bearer);
    }
  }
  block(g, [0, 1.23, 0], [1.8, 0.17, 1.35], p.skin);
  block(g, [-0.25, 1.58, 0], [0.7, 0.54, 0.72], p.red);
  block(g, [-0.55, 2.08, 0], [0.12, 0.92, 0.84], p.skin);
  for (const side of [-1, 1]) {
    beam(g, [-0.4, 1.43, side * 0.48], [-0.4, 2.04, side * 0.48], 0.04, p.skin);
    beam(g, [0.4, 1.43, side * 0.48], [0.4, 2.04, side * 0.48], 0.04, p.skin);
    beam(g, [-0.4, 2.04, side * 0.48], [0.4, 2.04, side * 0.48], 0.05, p.skin);
  }
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.32, 0.63, 12), p.red);
  robe.position.set(-0.23, 2.11, 0);
  robe.scale.z = 0.8;
  g.add(robe);
  ellipsoid(g, [-0.19, 2.61, 0], [0.12, 0.17, 0.12], p.skin);
  ellipsoid(g, [-0.22, 2.69, 0], [0.12, 0.09, 0.13], p.dark);
  for (const side of [-1, 1]) {
    beam(g, [-0.15, 1.86, side * 0.15], [0.35, 1.8, side * 0.18], 0.13, p.red);
    beam(g, [0.35, 1.8, side * 0.18], [0.39, 1.35, side * 0.18], 0.075, p.skin);
    beam(g, [-0.2, 2.3, side * 0.22], [0.22, 2.05, side * 0.43], 0.07, p.skin);
  }
  return g;
}

function ruinedColumn(p: Palette, reclaim: boolean): THREE.Group {
  const g = new THREE.Group();
  block(g, [0, 0.2, 0], [3.5, 0.4, 3.5], p.stone);
  block(g, [0, 0.52, 0], [2.8, 0.25, 2.8], p.stone);
  const shaft = new THREE.CylinderGeometry(0.78, 0.98, 7.3, 32, 8);
  const positions = shaft.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i),
      angle = Math.atan2(z, x);
    const groove = 1 - 0.035 * (0.5 + 0.5 * Math.cos(angle * 20));
    positions.setX(i, x * groove);
    positions.setZ(i, z * groove);
    if (positions.getY(i) > 3.6) positions.setY(i, 3.65 + Math.sin(angle * 3) * 0.14);
  }
  shaft.computeVertexNormals();
  const column = new THREE.Mesh(shaft, p.stone);
  column.position.y = 4.3;
  g.add(column);
  for (const y of [0.78, 1.02, 7.95]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.1, 0.2, 24), p.stone);
    collar.position.y = y;
    g.add(collar);
  }
  if (!reclaim) return g;
  // The collection record identifies nesting herons on the surviving column.
  for (let i = 0; i < 32; i++) {
    const angle = i * 2.4,
      r = 0.34 + (i % 5) * 0.065;
    beam(
      g,
      [Math.cos(angle) * r, 8.11 + (i % 3) * 0.025, Math.sin(angle) * r],
      [Math.cos(angle + 1.2) * r, 8.13 + (i % 3) * 0.025, Math.sin(angle + 1.2) * r],
      0.025,
      p.dark,
    );
  }
  ellipsoid(g, [0.15, 8.59, 0], [0.19, 0.25, 0.32], p.cloth);
  for (const x of [0.06, 0.23]) beam(g, [x, 8.14, 0], [x, 8.44, 0], 0.023, p.dark);
  beam(g, [0.18, 8.7, 0.15], [0.14, 9.04, 0.14], 0.055, p.cloth);
  beam(g, [0.14, 9.04, 0.14], [0.21, 9.15, 0.24], 0.05, p.cloth);
  ellipsoid(g, [0.21, 9.15, 0.26], [0.07, 0.07, 0.1], p.cloth);
  beam(g, [0.21, 9.15, 0.32], [0.21, 9.13, 0.54], 0.035, p.skin);
  const random = seededRandom(18365);
  for (let i = 0; i < 85; i++) {
    const y = random() * 6.8,
      angle = y * 1.9 + random() * 0.8;
    const r = 0.96 - y * 0.02;
    const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), p.leaf);
    leaf.position.set(Math.cos(angle) * r, y + 0.9, Math.sin(angle) * r);
    leaf.scale.set(0.6, 1.7, 0.25);
    leaf.rotation.set(random(), angle, random());
    g.add(leaf);
  }
  return g;
}

/** Small fixed-pose episodes, not a reconstruction of every figure in Cole's series. */
export function buildEmpireDetails(painting: Painting, period: number): THREE.Group {
  const g = new THREE.Group(),
    p = palette(),
    random = seededRandom(18361);
  const stage = THREE.MathUtils.clamp(Math.round(period), 0, 4);
  const place = (object: THREE.Group, x: number, z: number, angle = 0) => {
    object.position.set(x, Math.max(1.05, groundHeight(painting, x, z)), z);
    object.rotation.y = angle;
    g.add(object);
  };
  if (stage === 1) {
    for (let i = 0; i < 12; i++)
      place(sheep(p, i % 3 !== 0), -25 + random() * 15, -7 - random() * 7, random() * 6);
    const shepherd = citizen(p, 0.07, false);
    beam(shepherd, [0.32, 0.05, 0.1], [0.32, 1.95, 0.1], 0.025, p.dark);
    place(shepherd, -10, -7, -0.7);
  }
  if (stage === 2) {
    for (let i = 0; i < 12; i++) {
      const figure = citizen(p, i % 2 ? 0.13 : -0.1, true);
      if (i % 5 === 0) {
        beam(figure, [0.32, 0.05, 0], [0.32, 2.65, 0], 0.028, p.skin);
        block(figure, [0.54, 2.29, 0], [0.43, 0.67, 0.035], p.red);
      }
      const x = i < 6 ? -19 + i * 1.35 : -1 + (i - 6) * 1.35;
      place(figure, x, i % 2 ? -0.9 : -2.6, Math.PI / 2);
    }
    place(ceremonialLitter(p), -7.3, -1.75);
  }
  if (stage >= 3) {
    place(ruinedColumn(p, stage === 4), -35, -0.6);
    for (let i = 0; i < 18; i++) {
      const rubble = new THREE.Group();
      const stone = block(rubble, [0, 0.3, 0], [0.5 + random(), 0.6, 0.5 + random()], p.stone);
      stone.rotation.set(0.08, random() * 4, 0.15);
      place(rubble, -35 + (random() - 0.5) * 12, -2 - random() * 4);
    }
    if (stage === 3)
      for (let i = 0; i < 6; i++)
        place(citizen(p, 0.2, false), 12 + i * 1.7, -1.4 - (i % 2), Math.PI / 2);
  }
  const used = new Set<THREE.Material>();
  g.traverse((object) => {
    if (object instanceof THREE.Mesh && !Array.isArray(object.material)) used.add(object.material);
  });
  Object.values(p).forEach((mat) => {
    if (!used.has(mat)) mat.dispose();
  });
  const result = batchStatic(g);
  result.name = 'Empire period foreground episodes';
  result.userData.period = stage;
  result.userData.focus = stage === 1 ? [-17, 2, -10] : stage === 2 ? [-6, 2, -1] : [-35, 5, -0.6];
  result.userData.hasPeople = stage > 0 && stage < 4;
  return result;
}
