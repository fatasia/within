import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Painting } from '../types';
import { seededRandom } from './math';
import { boat } from './props';
import { curveRod, pineCrownGeometry, rod } from './modelGeometry';
import { batchStatic } from './resources';

import { qingmingRiver, qingmingBridgeHeight } from './cityLayout';
export { qingmingRiver, qingmingBridgeHeight } from './cityLayout';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);
const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.94 });

/** Hand-built Song street sections, batched by material after placement. */
export function buildQingming(painting: Painting): THREE.Group {
  const city = new THREE.Group();
  const random = seededRandom(painting.seed);
  const wood = mat('#614b37'),
    dark = mat('#413d32'),
    plaster = mat('#c3af87');
  const tile = mat('#65675b'),
    tileLight = mat('#77786a'),
    stone = mat('#9d937a');
  const earth = mat('#aa9e7d'),
    linen = mat('#c7b78e'),
    red = mat('#8e4938');
  const leaf = mat('#697555'),
    leafDark = mat('#4b624a'),
    skin = mat('#ba926b');
  const blue = mat('#526d6a'),
    ochre = mat('#a58b59');
  const glow = new THREE.MeshStandardMaterial({
    color: '#d9b36e',
    emissive: '#ffb158',
    emissiveIntensity: 1.1,
    roughness: 1,
  });
  const signGeometry: THREE.BufferGeometry[] = [];
  const box = (g: THREE.Group, size: Point, p: Point, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
    mesh.position.set(...p);
    g.add(mesh);
    return mesh;
  };
  const beam = (g: THREE.Group, a: Point, b: Point, r = 0.09, m: THREE.Material = wood) =>
    rod(g, v(a), v(b), r, m, 1, 5);

  function roof(g: THREE.Group, w: number, d: number, y: number, h: number) {
    const vertices: number[] = [],
      indices: number[] = [];
    for (let side = 0; side < 2; side++)
      for (let i = 0; i <= 8; i++)
        for (let j = 0; j <= 6; j++) {
          const x = (i / 8 - 0.5) * w,
            t = j / 6;
          vertices.push(
            x,
            y + h * (1 - t + 0.23 * t ** 4) + 0.13 * (Math.abs(x) / (w / 2)) ** 5,
            ((side ? -1 : 1) * t * d) / 2,
          );
          if (i < 8 && j < 6) {
            const a = side * 63 + i * 7 + j;
            indices.push(a, a + 7, a + 1, a + 1, a + 7, a + 8);
          }
        }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const roofMat = tile.clone();
    roofMat.side = THREE.DoubleSide;
    g.add(new THREE.Mesh(geometry, roofMat));
    // Individual barrel-tile lines and a restrained ridge are visible from street level.
    for (let i = 0; i <= Math.ceil(w / 0.4); i++)
      for (const s of [-1, 1]) {
        const x = -w / 2 + (i * w) / Math.ceil(w / 0.4);
        curveRod(
          g,
          Array.from({ length: 5 }, (_, j) => {
            const t = j / 4;
            return v([x, y + h * (1 - t + 0.23 * t ** 4) + 0.05, (s * t * d) / 2]);
          }),
          0.045,
          tileLight,
          5,
        );
      }
    beam(g, [-w / 2, y + h + 0.08, 0], [w / 2, y + h + 0.08, 0], 0.1, tileLight);
  }

  function sign(g: THREE.Group, x: number, y: number, z: number, index: number) {
    box(g, [2, 0.68, 0.13], [x, y, z], dark);
    const geo = new THREE.PlaneGeometry(1.85, 0.52);
    const uv = geo.attributes.uv!;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i), (uv.getY(i) + (7 - (index % 8))) / 8);
    geo.translate(x, y, z + 0.071);
    g.updateMatrixWorld(true);
    geo.applyMatrix4(g.matrixWorld);
    signGeometry.push(geo);
  }

  function house(x: number, z: number, w: number, d: number, tall: boolean, facing = 0, index = 0) {
    const g = new THREE.Group();
    g.position.set(x, 2.8, z);
    g.rotation.y = facing;
    city.add(g);
    const h = tall ? 6.4 : 3.9;
    box(g, [w + 0.5, 0.3, d + 0.45], [0, 0.15, 0], stone);
    box(g, [w - 0.3, h, d - 0.3], [0, h / 2 + 0.3, 0], plaster);
    for (const s of [-1, 1])
      for (const q of [-1, 1])
        box(g, [0.18, h, 0.18], [s * (w / 2 - 0.12), h / 2 + 0.3, q * (d / 2 - 0.12)], wood);
    box(g, [w, 0.16, 0.18], [0, 3.1, d / 2], wood);
    box(g, [w, 0.11, 0.1], [0, 2.9, -d / 2], wood);
    for (const s of [-1, 1]) {
      box(g, [0.13, h, 0.12], [s * w * 0.23, h / 2 + 0.3, -d / 2], wood);
      box(g, [1.05, 0.85, 0.06], [s * w * 0.24, 2.15, -d / 2 - 0.04], dark);
      for (let k = -2; k <= 2; k++)
        box(g, [0.04, 0.85, 0.04], [s * w * 0.24 + k * 0.2, 2.15, -d / 2 - 0.09], linen);
    }
    for (let j = 0; j < 3; j++) {
      const xx = (j - 1) * w * 0.29;
      box(g, [w * 0.23, 1.8, 0.04], [xx, 1.35, d / 2], j === 1 ? dark : wood);
      if (j !== 1)
        for (let k = -2; k <= 2; k++)
          box(g, [0.045, 1.5, 0.05], [xx + k * w * 0.035, 1.45, d / 2 + 0.05], linen);
      if (tall) {
        box(g, [w * 0.22, 1.2, 0.04], [xx, 4.6, d / 2], glow);
        for (let k = -2; k <= 2; k++)
          box(g, [0.055, 1.3, 0.06], [xx + k * w * 0.04, 4.6, d / 2 + 0.08], dark);
        box(g, [w * 0.25, 0.08, 0.06], [xx, 4.6, d / 2 + 0.08], dark);
      }
    }
    roof(g, w + 1.3, d + 1.5, h + 0.05, w * 0.24);
    if (tall) {
      roof(g, w + 1.3, 2.4, 3.05, 0.55);
      box(g, [w + 0.6, 0.15, 1], [0, 3.5, d / 2 + 0.25], wood);
      for (let i = 0; i < 11; i++)
        box(g, [0.065, 0.7, 0.065], [(i / 10 - 0.5) * w, 3.9, d / 2 + 0.7], wood);
      box(g, [w + 0.2, 0.09, 0.08], [0, 4.25, d / 2 + 0.7], wood);
    }
    const awning = box(g, [w - 0.7, 0.09, 2.5], [0, 2.9, d / 2 + 0.85], index % 3 ? linen : blue);
    awning.rotation.x = 0.1;
    for (const s of [-1, 1])
      beam(g, [s * (w / 2 - 0.5), 0, d / 2 + 1.9], [s * (w / 2 - 0.5), 2.9, d / 2 + 1.9]);
    sign(g, 0, tall ? 5.9 : 3.2, d / 2 + 0.15, index);
    return g;
  }

  function person(x: number, z: number, yaw: number, variant: number, y = 2.8) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    city.add(g);
    const robe = [blue, linen, ochre, red, dark][variant % 5]!;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.95, 6), robe);
    body.position.y = 0.9;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 5), skin);
    head.position.y = 1.58;
    g.add(head);
    box(g, [0.38, 0.1, 0.3], [0, 1.77, 0], dark);
    for (const s of [-1, 1]) {
      beam(g, [s * 0.12, 0.42, 0], [s * 0.15, 0.04, s * 0.1], 0.08, dark);
      beam(g, [s * 0.18, 1.23, 0], [s * 0.38, 0.76, 0.12], 0.07, robe);
    }
    if (variant % 7 === 0) {
      beam(g, [-0.95, 1.4, 0], [0.95, 1.4, 0], 0.035);
      for (const s of [-1, 1]) {
        beam(g, [s * 0.85, 1.4, 0], [s * 0.85, 0.55, 0], 0.018);
        box(g, [0.38, 0.35, 0.4], [s * 0.85, 0.45, 0], ochre);
      }
    }
  }

  function stall(x: number, z: number, yaw: number, index: number, y = 2.8) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    city.add(g);
    box(g, [2.5, 0.14, 1.15], [0, 0.85, 0], wood);
    for (const a of [-1, 1])
      for (const b of [-1, 1]) beam(g, [a * 1.1, 0, b * 0.5], [a * 1.1, 2.45, b * 0.5], 0.05);
    box(g, [2.8, 0.07, 1.8], [0, 2.4, 0], index % 3 === 0 ? blue : linen);
    for (let k = 0; k < 8; k++) {
      const item = new THREE.Mesh(
        index % 2
          ? new THREE.SphereGeometry(0.16, 6, 4)
          : new THREE.CylinderGeometry(0.13, 0.18, 0.3, 7),
        index % 2 ? ochre : red,
      );
      item.position.set(((k % 4) - 1.5) * 0.46, 1.04, k < 4 ? -0.23 : 0.23);
      g.add(item);
    }
    person(x + Math.sin(yaw) * 0.8, z + Math.cos(yaw) * 0.8, yaw, index, y);
  }

  function tree(x: number, z: number, size: number) {
    const g = new THREE.Group();
    g.position.set(x, 2.8, z);
    city.add(g);
    beam(g, [0, 0, 0], [0.2, size * 0.8, 0], size * 0.035);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4,
        xx = Math.cos(a) * size * 0.22,
        zz = Math.sin(a) * size * 0.22,
        yy = size * (0.6 + i * 0.07);
      beam(g, [0, size * 0.38, 0], [xx, yy, zz], size * 0.014);
      const crown = new THREE.Mesh(pineCrownGeometry(), i % 2 ? leaf : leafDark);
      crown.position.set(xx, yy, zz);
      crown.scale.set(size * 0.33, size * 0.6, size * 0.28);
      g.add(crown);
      for (let j = 0; j < 3; j++)
        curveRod(
          g,
          [
            v([xx, yy, zz]),
            v([xx + 0.8, yy - 1, zz + j * 0.4]),
            v([xx + 0.9, yy - 2.6, zz + j * 0.4]),
          ],
          0.035,
          leafDark,
          4,
        );
    }
  }

  // Earthen lanes remain open: a waterfront path and the east-west city street.
  box(city, [265, 0.04, 7], [0, 2.82, -45], earth);
  for (let x = -126; x < 135; x += 7)
    for (const s of [-1, 1]) {
      box(city, [7.1, 0.05, 5], [x, 2.81, qingmingRiver(x) + s * 17], earth);
      if (x > -60) box(city, [7, 1.2, 0.6], [x, 2.18, qingmingRiver(x) + s * 12.4], stone);
    }
  // Rural western quarter, then a progressively denser waterfront and city.
  for (let i = 0; i < 9; i++)
    house(
      -122 + (i % 3) * 16,
      -33 - Math.floor(i / 3) * 17,
      6.1,
      5.4,
      false,
      i % 2 ? 0.1 : -0.1,
      i,
    );
  for (let i = 0; i < 22; i++) {
    const x = -65 + i * 8.5;
    if (Math.abs(x + 20) < 7) continue;
    house(x, qingmingRiver(x) - 26.5, 6.7 + random(), 6.8, i % 4 === 1, 0, i);
  }
  for (let i = 0; i < 16; i++) {
    const x = -8 + i * 8.4;
    if (Math.abs(x - 55) < 7) continue;
    house(x, -55, 6.7, 7.5, i % 3 === 0, 0, i + 3);
    house(x, -83, 6.5, 8, i % 4 === 0, 0, i + 5);
  }
  for (let i = 0; i < 13; i++) {
    const x = -46 + i * 12;
    if (Math.abs(x + 20) < 8) continue;
    house(x, qingmingRiver(x) + 31, 7, 6, i % 5 === 0, Math.PI, i);
  }
  for (let i = 0; i < 36; i++) {
    const x = -64 + i * 5.4;
    if (Math.abs(x + 20) < 8) continue;
    stall(x, qingmingRiver(x) - 18.5, 0, i);
  }
  for (let i = 0; i < 20; i++) stall(-4 + i * 6.4, -40, Math.PI, i);
  for (let i = 0; i < 115; i++) {
    const x = -125 + random() * 254;
    const z =
      i % 3 === 0
        ? -45 + (random() - 0.5) * 4
        : qingmingRiver(x) + (i % 2 ? 16 : -15) + (random() - 0.5) * 2;
    person(x, z, random() * Math.PI * 2, i);
  }

  // Rainbow bridge: a clear river span with interlocking timber ribs, no masonry arch.
  const riverZ = qingmingRiver(-20);
  for (let i = 0; i < 55; i++) {
    const z = riverZ - 22 + i * 0.8,
      y = qingmingBridgeHeight(z);
    const slope = ((z - riverZ) * 13.4) / (22 * 22);
    const deck = box(
      city,
      [8.6, 0.28, 0.82 * Math.sqrt(1 + slope * slope)],
      [-20, y - 0.14, z],
      i % 4 ? wood : ochre,
    );
    deck.rotation.x = Math.atan(slope);
    if (i % 3 === 0)
      for (const s of [-1, 1]) {
        beam(city, [-20 + s * 4.2, y, z], [-20 + s * 4.2, y + 1.2, z], 0.085);
        if (i < 52)
          beam(
            city,
            [-20 + s * 4.2, y + 1.12, z],
            [-20 + s * 4.2, qingmingBridgeHeight(z + 2.4) + 1.12, z + 2.4],
            0.09,
          );
      }
  }
  for (const x of [-23.5, -21.2, -18.8, -16.5])
    for (let i = 0; i < 10; i++) {
      const z1 = riverZ - 22 + i * 4.4,
        z2 = z1 + 4.4;
      beam(
        city,
        [x, qingmingBridgeHeight(z1) - 0.9, z1],
        [x, qingmingBridgeHeight(z2) - 0.9, z2],
        0.27,
      );
      if (i < 9)
        beam(
          city,
          [x, qingmingBridgeHeight(z1) - 1.7, z1],
          [x, qingmingBridgeHeight(z2 + 4.4) - 0.5, z2 + 4.4],
          0.16,
        );
      beam(
        city,
        [-24, qingmingBridgeHeight(z1) - 0.65, z1],
        [-16, qingmingBridgeHeight(z1) - 0.65, z1],
        0.15,
      );
    }
  for (let i = 0; i < 18; i++) {
    const z = riverZ - 20 + i * 2.2;
    person(-21.6 + random() * 3.3, z, i % 2 ? 0 : Math.PI, i, qingmingBridgeHeight(z));
  }
  for (const z of [riverZ - 12, riverZ + 12])
    stall(-23, z, Math.PI / 2, 1, qingmingBridgeHeight(z));

  // The gate is aligned with the principal street; an actual open arch is retained.
  const gate = new THREE.Group();
  gate.position.set(55, 2.8, -45);
  gate.rotation.y = Math.PI / 2;
  city.add(gate);
  for (const s of [-1, 1]) box(gate, [9, 10, 7], [s * 9, 5, 0], stone);
  box(gate, [10, 2.8, 7], [0, 9, 0], stone);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.6, 4, 18, Math.PI), stone);
  arch.position.y = 4;
  arch.scale.z = 5;
  gate.add(arch);
  // Recessed brick joints, jambs and door leaves give the gateway a human-scale edge.
  const mortar = mat('#827c68');
  for (const face of [-1, 1])
    for (const side of [-1, 1]) {
      for (let row = 0; row < 17; row++) {
        box(gate, [8.9, 0.035, 0.025], [side * 9, row * 0.56 + 0.3, face * 3.515], mortar);
        for (let j = 0; j < 6; j++)
          box(
            gate,
            [0.035, 0.53, 0.03],
            [side * 9 - 4.1 + j * 1.45 + (row % 2) * 0.5, row * 0.56 + 0.58, face * 3.52],
            mortar,
          );
      }
      box(gate, [0.18, 4.1, 6.6], [side * 4.55, 2.05, 0], wood);
      for (let j = 0; j < 9; j++)
        box(gate, [0.2, 3.95, 0.06], [side * 4.42, 2.05, -2.9 + j * 0.7], dark);
    }
  for (let i = -7; i <= 7; i++) box(gate, [1.05, 1.05, 0.8], [i * 1.8, 10.5, 3.1], stone);
  box(gate, [12, 4.5, 6], [0, 12.3, 0], plaster);
  for (const face of [-1, 1])
    for (let i = -2; i <= 2; i++) {
      box(gate, [1.15, 2.7, 0.08], [i * 2.1, 12.3, face * 3.05], dark);
      for (let j = -1; j <= 1; j++)
        box(gate, [0.065, 2.7, 0.08], [i * 2.1 + j * 0.3, 12.3, face * 3.12], wood);
    }
  roof(gate, 15, 10, 14.5, 3.6);
  for (const s of [-1, 1])
    for (let j = 0; j < 3; j++) {
      const z = -45 + s * (22 + j * 12);
      if (z > -11 || z < -100) continue;
      box(city, [5.5, 7.2, 12.2], [55, 6.4, z], stone);
      for (let k = 0; k < 5; k++) box(city, [0.8, 1, 1.1], [57.4, 10.5, z - 5 + k * 2.5], stone);
    }

  // Cargo boats, riverside timber jetties, sacks and handcarts.
  for (let i = 0; i < 11; i++) {
    const x = -114 + i * 23;
    if (Math.abs(x + 20) < 9) continue;
    const vessel = boat();
    vessel.position.set(x, 0.6, qingmingRiver(x) + (i % 2 ? -7 : 6));
    vessel.scale.setScalar(i % 3 ? 1.3 : 1.8);
    vessel.rotation.y = i % 2 ? 0.08 : Math.PI + 0.1;
    city.add(vessel);
    if (i % 2) {
      const z = qingmingRiver(x) - 10;
      box(city, [8, 0.3, 4.8], [x, 2, z], wood);
      for (const a of [-1, 1])
        for (const b of [-1, 1])
          beam(city, [x + a * 3.5, 0, z + b * 2], [x + a * 3.5, 2.5, z + b * 2], 0.16);
      for (let k = 0; k < 8; k++)
        box(city, [0.8, 0.6, 0.7], [x - 2 + (k % 4), 2.5, z + Math.floor(k / 4)], linen);
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = -90 + i * 28,
      z = -44;
    box(city, [2.5, 0.2, 1.4], [x, 3.55, z], wood);
    for (const s of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 4, 12), dark);
      wheel.position.set(x, 3.45, z + s * 0.85);
      city.add(wheel);
      for (let k = 0; k < 4; k++)
        beam(
          city,
          [
            x - Math.cos((k * Math.PI) / 4) * 0.6,
            3.45 - Math.sin((k * Math.PI) / 4) * 0.6,
            z + s * 0.85,
          ],
          [
            x + Math.cos((k * Math.PI) / 4) * 0.6,
            3.45 + Math.sin((k * Math.PI) / 4) * 0.6,
            z + s * 0.85,
          ],
          0.035,
        );
      beam(city, [x, 3.55, z + s * 0.55], [x + 2.8, 3.25, z + s * 0.55], 0.055);
    }
    for (let k = 0; k < 3; k++) box(city, [0.65, 0.6, 1.05], [x - 0.8 + k * 0.8, 3.95, z], linen);
  }
  for (let i = 0; i < 34; i++) {
    const x = -131 + random() * 260;
    tree(x, i < 16 ? qingmingRiver(x) + 22 : -95 + random() * 13, 4.8 + random() * 3);
  }
  // Farm furrows and woven fences keep the western approach intentionally quiet.
  for (let i = 0; i < 12; i++) box(city, [48, 0.07, 0.18], [-108, 2.88, 27 + i * 1.2], ochre);
  for (let i = 0; i < 20; i++) {
    const x = -133 + i * 2.4;
    beam(city, [x, 2.8, 44], [x, 3.85, 44], 0.05);
    if (i < 19) beam(city, [x, 3.4, 44], [x + 2.4, 3.4, 44], 0.045);
  }

  // Broken, slightly uneven paving; never a single featureless street plane.
  const paving = [mat('#b3aa91'), mat('#a89d82')];
  for (let i = 0; i < 230; i++)
    for (let row = 0; row < 4; row++) {
      const x = -129 + i * 1.14 + (row % 2) * 0.55;
      const flag = box(
        city,
        [1.02, 0.035, 1.1],
        [x, 2.85 + random() * 0.015, -46.8 + row * 1.2],
        paving[(i + row) % 2]!,
      );
      flag.rotation.y = (random() - 0.5) * 0.08;
    }

  const result = batchStatic(city);
  // One atlas for all legible shop signs, kept separate from material-color batching.
  if (typeof document !== 'undefined' && signGeometry.length) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#3d392d';
      ctx.fillRect(0, 0, 512, 1024);
      ctx.fillStyle = '#d8c59a';
      ctx.font = '64px "Kaiti SC", KaiTi, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ['茶坊', '脚店', '香铺', '酒肆', '布帛', '食店', '药铺', '杂货'].forEach((word, i) =>
        ctx.fillText(word, 256, i * 128 + 64),
      );
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const geo = mergeGeometries(signGeometry);
      if (geo)
        result.add(
          new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide }),
          ),
        );
    }
  }
  signGeometry.forEach((geometry) => geometry.dispose());
  result.name = 'qingming-city';
  return result;
}
