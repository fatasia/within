import * as THREE from 'three';
import type { StreetMaterials } from './qingmingEpisodes';
import { cityGround, qingmingRiver } from './cityLayout';
import { rod, curveRod } from './modelGeometry';
type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(...p);
/** Working river margins and small enclosed yards, not additional monumental architecture. */
export function buildQingmingRiverCraft(m: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-river-craft';
  const inventory: string[] = [];
  const box = (g: THREE.Group, s: P, p: P, mat = m.wood) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(...s), mat);
    a.position.set(...p);
    g.add(a);
    return a;
  };
  const beam = (g: THREE.Group, a: P, b: P, r = 0.04, mat = m.wood) =>
    rod(g, v(a), v(b), r, mat, 1, 5);
  const place = (name: string, x: number, z: number) => {
    const a = new THREE.Group();
    a.name = name;
    a.position.set(x, cityGround(x, z) + 0.02, z);
    group.add(a);
    inventory.push(name);
    return a;
  };
  for (const [i, x] of [-110, -99, -83, -60].entries()) {
    const g = place('river-cargo-yard', x, qingmingRiver(x) + 18.5);
    for (let k = 0; k < 7; k++) {
      const xx = (k % 3) * 0.86 - 1.1,
        zz = Math.floor(k / 3) * 0.75;
      box(g, [0.8, 0.52, 0.66], [xx, 0.26, zz], k % 2 ? m.linen : m.clay);
      for (const d of [-0.22, 0.22]) box(g, [0.045, 0.55, 0.7], [xx + d, 0.26, zz], m.dark);
    }
    for (let k = 0; k < 5; k++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.7, 6), m.wood);
      log.rotation.z = Math.PI / 2;
      log.position.set(0.3, 0.15 + (k % 2) * 0.22, 2.2 + Math.floor(k / 2) * 0.28);
      g.add(log);
    }
    const mooring = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.85, 7), m.wood);
    mooring.position.set(-2, 0.42, -0.8);
    g.add(mooring);
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24 + k * 0.07, 0.025, 3, 12), m.linen);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-1.55, 0.05, -0.7);
      g.add(ring);
    }
    // Small irregular plank ramp terminates above the existing quay, clear of the water mask.
    for (let k = 0; k < 5; k++) box(g, [0.27, 0.09, 2.2], [-0.6 + k * 0.3, 0.09, -2.3], m.wood);
    if (i % 2 === 0) {
      for (const x of [-2.4, 2.4]) beam(g, [x, 0, 3.3], [x, 2.8, 3.3], 0.07);
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 12; col++) {
          const x = -2.35 + col * 0.4,
            y = 0.5 + row * 0.24;
          beam(g, [x, y, 3.3], [x + 0.38, y + 0.22, 3.3], 0.009, m.linen);
          beam(g, [x + 0.38, y, 3.3], [x, y + 0.22, 3.3], 0.009, m.linen);
        }
    }
  }
  const yard = place('boatwright-rib-frame', -115, qingmingRiver(-115) - 21.5);
  yard.rotation.y = -0.2;
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.7,
      w = 0.8 * Math.sin(((i + 1) / 8) * Math.PI);
    curveRod(yard, [v([x, 0.65, -w]), v([x, 0.15, 0]), v([x, 0.65, w])], 0.055, m.wood, 5);
  }
  beam(yard, [-2.7, 0.15, 0], [2.7, 0.15, 0], 0.08);
  for (const x of [-1.6, 1.6])
    for (const z of [-0.75, 0.75]) beam(yard, [x, 0, z], [x, 0.48, 0], 0.08);
  for (let k = 0; k < 5; k++) box(yard, [3.8, 0.1, 0.2], [0.2, 0.06 + k * 0.1, 1.5], m.wood);
  box(yard, [1.1, 0.07, 0.55], [2.8, 0.8, 1.4]);
  for (const x of [2.4, 3.2]) beam(yard, [x, 0, 1.4], [x, 0.8, 1.4], 0.06);
  for (const x of [2.5, 2.8, 3.1]) box(yard, [0.08, 0.06, 0.34], [x, 0.88, 1.4], m.dark);
  for (const [i, x] of [-119, -99, -88].entries()) {
    const g = place('rural-well-and-kitchen-garden', x, -64 - i * 2);
    for (let row = 0; row < 5; row++) {
      box(g, [7, 0.07, 0.1], [0, 0.07, 1 + row * 0.7], m.earth);
      for (let j = 0; j < 13; j++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), m.blue);
        leaf.position.set(-3 + j * 0.48, 0.16, 1 + row * 0.7);
        g.add(leaf);
      }
    }
    for (let j = 0; j < 9; j++) beam(g, [-4 + j, 0, 4.5], [-4 + j, 1, 4.5], 0.035);
    for (const y of [0.28, 0.6, 0.9]) beam(g, [-4, y, 4.5], [4, y, 4.5], 0.025, m.linen);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.7, 10, 1, true), m.stone);
    well.position.set(-2, 0.35, -1.5);
    g.add(well);
    for (const side of [-1, 1])
      beam(g, [-2 + side * 0.85, 0, -1.5], [-2 + side * 0.85, 2, -1.5], 0.07);
    beam(g, [-3, 1.85, -1.5], [-1, 1.85, -1.5], 0.1);
    beam(g, [-2, 1.8, -1.5], [-2, 0.55, -1.5], 0.014, m.linen);
    for (let j = 0; j < 8; j++)
      beam(g, [1 + j * 0.14, 0.05, -1.4], [1 + j * 0.14, 0.5, -0.3], 0.04);
  }
  // Connected low service yards make the city read as blocks, not isolated identical boxes.
  for (const x of [70, 91, 113]) {
    const g = place('city-service-courtyard', x, -66);
    for (const side of [-1, 1]) box(g, [0.18, 1.5, 10], [side * 7, 0.75, 0], m.earth);
    box(g, [14, 1.5, 0.18], [0, 0.75, -5], m.earth);
    for (const side of [-1, 1]) box(g, [4.6, 1.5, 0.18], [side * 4.7, 0.75, 5], m.earth);
    for (let j = 0; j < 4; j++)
      box(g, [1.1, 0.7, 0.7], [-4 + j * 1.2, 0.35, -3.8], j % 2 ? m.wood : m.linen);
    for (const z of [-2, 1]) {
      box(g, [2.7, 0.1, 0.9], [3, 0.75, z]);
      for (const x of [2, 4]) box(g, [0.1, 0.75, 0.1], [x, 0.375, z]);
    }
  }
  group.userData.inventory = inventory;
  return group;
}
