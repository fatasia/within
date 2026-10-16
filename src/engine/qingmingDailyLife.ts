import * as THREE from 'three';
import type { StreetMaterials } from './qingmingEpisodes';
import { qingmingCitizen } from './qingmingDetails';
import { bakeQingmingRig } from './qingmingLife';
import { cityGround, qingmingMainStreet, qingmingRiver } from './cityLayout';
import { rod, curveRod } from './modelGeometry';
import { registerUpdate } from './featuredShared';

type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(...p);
/** One skinned batch carries workers and caravan; articulated motion never rebuilds geometry. */
export function buildQingmingDailyLife(m: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-daily-life';
  const root = new THREE.Bone(),
    updates: ((t: number) => void)[] = [];
  const bone = (parent: THREE.Object3D, name: string, p: P = [0, 0, 0]) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(...p);
    parent.add(b);
    return b;
  };
  const box = (g: THREE.Object3D, size: P, p: P, mat: THREE.Material) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    a.position.set(...p);
    g.add(a);
    return a;
  };
  const oval = (g: THREE.Object3D, p: P, s: P, mat: THREE.Material) => {
    const a = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), mat);
    a.position.set(...p);
    a.scale.set(...s);
    g.add(a);
    return a;
  };
  const citizen = (parent: THREE.Object3D, index: number, p: P, yaw = 0) => {
    const b = bone(parent, `working-citizen-${index}`, p);
    b.rotation.y = yaw;
    const model = qingmingCitizen(
      {
        robe: [m.blue, m.clay, m.linen, m.earth][index % 4]!,
        skin: m.skin,
        hair: m.dark,
        trim: m.wood,
      },
      index,
      index >= 90,
    );
    b.add(model);
    if (index < 90) {
      for (const side of [-1, 1])
        oval(b, [side * 0.047, 1.6, 0.107], [0.012, 0.014, 0.009], m.dark);
      oval(b, [0, 1.56, 0.119], [0.021, 0.027, 0.022], m.skin);
    }
    const arms = [-1, 1].map((side) => bone(b, `worker-arm-${side}`, [side * 0.19, 1.29, 0]));
    model.updateMatrixWorld(true);
    for (const part of [...model.children]) {
      if (!(part instanceof THREE.Mesh)) continue;
      part.geometry.computeBoundingBox();
      const bounds = part.geometry.boundingBox!.clone().applyMatrix4(part.matrix);
      const mid = bounds.getCenter(new THREE.Vector3());
      if (Math.abs(mid.x) > 0.18 && mid.y > 0.7 && mid.y < 1.38) {
        const arm = arms[mid.x > 0 ? 1 : 0]!;
        part.position.sub(arm.position);
        arm.add(part);
      }
    }
    return { root: b, arms };
  };
  // Grouped conversations and customers: kept at street margins, not across the cart lane.
  for (let i = 0; i < 64; i++) {
    const x = -9 + (i % 32) * 4.1 + Math.sin(i * 2.1) * 0.7,
      side = i < 32 ? -1 : 1,
      z = qingmingMainStreet(x) + side * (2.7 + (i % 3) * 0.4);
    const a = citizen(root, i, [x, cityGround(x, z) + 0.02, z], side < 0 ? 0.3 : Math.PI + 0.25);
    if (i % 4 === 0)
      updates.push((t) => {
        a.arms[0]!.rotation.x = Math.sin(t * 1.1 + i) * 0.16;
      });
  }
  // Three double-humped pack camels walk inside the gate, clear of existing donkey traffic.
  for (let i = 0; i < 3; i++) {
    const a = bone(root, `pack-camel-${i}`);
    oval(a, [0, 1.8, 0], [1.15, 0.65, 0.43], m.earth);
    for (const x of [-0.46, 0.48]) oval(a, [x, 2.35, 0], [0.42, 0.65, 0.33], m.earth);
    curveRod(
      a,
      [v([0.82, 1.8, 0]), v([1.4, 2.0, 0]), v([1.47, 3.0, 0]), v([1.78, 3.13, 0])],
      0.18,
      m.earth,
      7,
    );
    oval(a, [1.85, 3.14, 0], [0.33, 0.19, 0.19], m.earth);
    oval(a, [2.1, 3.09, 0], [0.17, 0.12, 0.16], m.clay);
    for (const side of [-1, 1]) {
      oval(a, [1.64, 3.31, side * 0.18], [0.08, 0.09, 0.08], m.earth);
      oval(a, [1.9, 3.22, side * 0.174], [0.025, 0.025, 0.018], m.dark);
      oval(a, [2.19, 3.13, side * 0.115], [0.025, 0.014, 0.018], m.dark);
      curveRod(
        a,
        [v([2.12, 3.18, side * 0.13]), v([1.77, 3.29, side * 0.2]), v([1.56, 2.8, side * 0.17])],
        0.018,
        m.wood,
        5,
      );
      box(a, [1.25, 0.65, 0.42], [0, 1.95, side * 0.55], m.linen);
      for (const x of [-0.4, 0.4]) box(a, [0.055, 0.72, 0.47], [x, 1.95, side * 0.55], m.dark);
    }
    const legs: THREE.Bone[] = [];
    for (const x of [-0.73, 0.73])
      for (const side of [-1, 1]) {
        const leg = bone(a, 'camel-leg', [x, 1.55, side * 0.3]);
        legs.push(leg);
        rod(leg, v([0, 0, 0]), v([0.06, -0.72, 0]), 0.1, m.earth, 0.8, 5);
        rod(leg, v([0.06, -0.72, 0]), v([-0.06, -1.43, 0.02]), 0.065, m.earth, 0.85, 5);
        oval(leg, [0.06, -0.72, 0], [0.1, 0.12, 0.085], m.earth);
        oval(leg, [-0.03, -1.48, 0.04], [0.2, 0.07, 0.14], m.clay);
        rod(leg, v([0.07, -1.49, 0.04]), v([0.16, -1.49, 0.04]), 0.012, m.dark, 1, 4);
      }
    curveRod(
      a,
      [v([-1.0, 1.85, 0]), v([-1.32, 1.35, 0.05]), v([-1.4, 0.95, 0.1])],
      0.045,
      m.dark,
      5,
    );
    updates.push((t) => {
      const distance = 10 * (1 - Math.exp(-t / 35));
      a.position.set(66 + i * 4.7 + distance, 2.82, -46.2);
      const stride = distance * 4;
      legs.forEach((leg, j) => {
        leg.rotation.z = Math.sin(stride + j * Math.PI * 0.55) * 0.11;
      });
    });
  }
  const lead = citizen(root, 71, [81.6, 2.82, -44.1], Math.PI / 2);
  updates.push((t) => {
    lead.root.position.x = 81.6 + 10 * (1 - Math.exp(-t / 35));
    lead.arms[0]!.rotation.x = -0.35;
  });
  // Two pairs haul cargo on the western bank, shoulders and wrists moving with effort.
  for (let i = 0; i < 4; i++) {
    const x = -103 + i * 2.1,
      z = qingmingRiver(x) - 17.7;
    const a = citizen(root, 80 + i, [x, 2.82, z], Math.PI / 2);
    const cargo = box(a.root, [0.68, 0.62, 0.52], [0, 1.57, -0.25], m.linen);
    box(a.root, [0.05, 0.66, 0.56], [0, 1.57, -0.25], m.dark);
    updates.push((t) => {
      const phase = t * 0.8 + i * 0.7;
      a.root.rotation.z = Math.sin(phase) * 0.045;
      a.arms[0]!.rotation.x = -0.5 + Math.sin(phase) * 0.1;
      a.arms[1]!.rotation.x = -0.5;
      cargo.rotation.z = Math.sin(phase) * 0.02;
    });
  }
  // Separate moving hand-work pairs beside, not inside, the existing serving episode.
  for (let i = 0; i < 4; i++) {
    const x = 90 + i * 5.7,
      z = -48.3;
    const a = citizen(root, 90 + i, [x, 2.82, z], 0);
    updates.push((t) => {
      a.arms[1]!.rotation.x = -0.45 + Math.sin(t * 1.6 + i) * 0.35;
      a.root.rotation.y = Math.sin(t * 0.35 + i) * 0.14;
    });
  }
  const mesh = bakeQingmingRig(root);
  mesh.name = 'qingming-caravan-and-working-crowd';
  group.add(mesh);
  group.userData.inventory = {
    customers: 64,
    camels: 3,
    handlers: 1,
    porters: 4,
    vendors: 4,
    draws: 1,
  };
  const update = (t: number) => {
    if (!Number.isFinite(t)) return;
    for (const fn of updates) fn(Math.max(0, t));
  };
  registerUpdate(group, update);
  update(0);
  return group;
}
