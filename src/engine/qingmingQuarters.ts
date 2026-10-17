import * as THREE from 'three';
import { potteryJar, wovenBasket } from './qingmingDetails';
import { roofGeometry, roofGableGeometry, roofSurfaceY } from './qingmingRoof';
import type { StreetMaterials } from './qingmingEpisodes';

/** Reading-order infill blocks derived from the whole scroll's nested roof/courtyard rhythm.
 * These are spatial interpretations, not surveyed coordinates of individual historic properties. */
export const QINGMING_QUARTERS = [
  { name: '郊野篱院', x: -91, z: -59, angle: -0.18, width: 15, depth: 15 },
  { name: '河埠后院', x: -76, z: -43, angle: 0.12, width: 16, depth: 15 },
  { name: '河市仓院', x: -58, z: -54, angle: -0.13, width: 18, depth: 17 },
  { name: '桥外街坊', x: -37, z: -53, angle: 0.08, width: 16, depth: 16 },
  { name: '桥头后巷', x: -6, z: -76, angle: -0.11, width: 17, depth: 17 },
  { name: '门外街坊西', x: 15, z: -77, angle: 0.14, width: 17, depth: 18 },
  { name: '门外街坊东', x: 36, z: -76, angle: -0.09, width: 16, depth: 17 },
  { name: '城内后街西', x: 72, z: -100, angle: 0.08, width: 17, depth: 17 },
  { name: '城内后街中', x: 94, z: -103, angle: -0.12, width: 18, depth: 19 },
  { name: '卷尾后街', x: 118, z: -103, angle: 0.12, width: 18, depth: 19 },
  { name: '卷尾街坊', x: 124, z: 17, angle: -0.1, width: 17, depth: 18 },
] as const;

export function* buildQingmingQuartersSteps(
  m: StreetMaterials,
  tile: THREE.Material = m.dark,
): Generator<void, THREE.Group> {
  const root = new THREE.Group();
  root.name = 'qingming-whole-scroll-quarter-infill';
  function box(
    g: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  }
  function dwelling(
    g: THREE.Group,
    x: number,
    z: number,
    w: number,
    d: number,
    angle: number,
    index: number,
  ) {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.rotation.y = angle;
    house.name = 'qingming-courtyard-wing';
    g.add(house);
    const h = 2.5 + (index % 4) * 0.3;
    box(house, w, h, d, 0, h / 2, 0, index % 3 === 0 ? m.earth : m.linen);
    box(house, w + 0.15, 0.22, d + 0.12, 0, 0.11, 0, m.stone);
    const profile = {
      width: w + 0.8,
      depth: d + 0.8,
      base: h + 0.04,
      rise: 0.85 + (index % 3) * 0.18,
      detailed: false,
    };
    house.add(new THREE.Mesh(roofGeometry(profile), tile));
    house.add(new THREE.Mesh(roofGableGeometry(profile, w, d, h), m.linen));
    box(house, w + 0.7, 0.09, 0.14, 0, roofSurfaceY(profile, 0, 0) + 0.05, 0, tile);
    for (const side of [-1, 1])
      box(
        house,
        w + 0.7,
        0.12,
        0.1,
        0,
        roofSurfaceY(profile, 0, (side * (d + 0.8)) / 2) - 0.07,
        (side * (d + 0.8)) / 2,
        m.wood,
      );
    box(house, 0.95, 1.9, 0.05, 0, 0.95, d / 2 + 0.03, m.dark);
    for (const side of [-1, 1]) {
      box(house, 0.12, h, 0.12, side * (w / 2 - 0.16), h / 2, d / 2 + 0.05, m.wood);
      box(house, 0.9, 0.85, 0.06, side * w * 0.3, 1.65, d / 2 + 0.04, m.dark);
      for (let j = -2; j <= 2; j++)
        box(house, 0.035, 0.85, 0.04, side * w * 0.3 + j * 0.16, 1.65, d / 2 + 0.085, m.wood);
      box(house, 0.95, 0.06, 0.08, side * w * 0.3, 1.65, d / 2 + 0.1, m.wood);
      const shutter = box(
        house,
        0.32,
        0.86,
        0.06,
        side * w * 0.3 + side * 0.58,
        1.65,
        d / 2 + 0.2,
        m.wood,
      );
      shutter.rotation.y = side * 0.6;
    }
  }
  for (const [index, q] of QINGMING_QUARTERS.entries()) {
    const court = new THREE.Group();
    court.name = q.name;
    court.position.set(q.x, 2.8, q.z);
    court.rotation.y = q.angle;
    root.add(court);
    const w = q.width,
      d = q.depth;
    box(court, w, 0.018, d, 0, 0.014, 0, m.earth);
    dwelling(court, 0, -d / 2 + 2.4, w - 1, 4.5, 0, index);
    dwelling(court, -w / 2 + 2.1, 2, d - 8, 3.8, Math.PI / 2, index + 1);
    dwelling(court, w / 2 - 2.1, 2, d - 8, 3.8, -Math.PI / 2, index + 2);
    for (const side of [-1, 1])
      box(court, (w - 3) / 2, 1.45, 0.22, (side * (w + 3)) / 4, 0.725, d / 2, m.earth);
    box(court, 3.4, 0.14, 0.5, 0, 2.15, d / 2, m.wood);
    for (const side of [-1, 1]) box(court, 0.13, 2.15, 0.16, side * 1.6, 1.075, d / 2, m.wood);
    box(court, 2.5, 0.035, 5, 0, 0.05, d / 2 + 2.5, m.earth);
    // A court is an inhabited work space, not three empty boxes. Keep the centre passage open.
    const type = index % 3;
    court.userData.use = ['storage-yard', 'tea-court', 'household-yard'][type];
    if (type === 0) {
      for (let j = 0; j < 6; j++) {
        const x = -2.7 + (j % 2) * 0.95,
          z = -0.8 + Math.floor(j / 2) * 1.05;
        if (j >= 3) {
          box(court, 0.7, 0.5, 0.65, x, 0.25, z, m.wood);
          continue;
        }
        const basket = wovenBasket(0.4, 0.55, m.wood);
        basket.position.set(x, 0.08, z);
        basket.scale.setScalar(0.75);
        court.add(basket);
      }
      for (let j = 0; j < 4; j++) box(court, 2.5, 0.12, 0.16, 2.3, 0.15 + j * 0.14, -0.5, m.wood);
    } else if (type === 1) {
      box(court, 2, 0.14, 1.2, -1.6, 0.9, -0.6, m.wood);
      for (const x of [-2.3, -0.9])
        for (const z of [-1, 0.0]) box(court, 0.11, 0.9, 0.11, x, 0.45, z, m.dark);
      for (const z of [-1.6, 0.5]) box(court, 2, 0.12, 0.36, -1.6, 0.48, z, m.wood);
      for (let j = 0; j < 3; j++) {
        const jar = potteryJar(m.clay);
        jar.position.set(-2.2 + j * 0.55, 1, -0.6);
        court.add(jar);
      }
    } else {
      const well = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.75, 0.62, 12, 1, true),
        m.stone,
      );
      well.position.set(-2.2, 0.31, -0.5);
      court.add(well);
      box(court, 0.09, 2, 0.09, 1.7, 1, -0.6, m.wood);
      box(court, 0.09, 2, 0.09, 3.1, 1, 2.8, m.wood);
      const cloth = box(court, 1, 0.8, 0.025, 2.4, 1.45, 1.1, m.linen);
      cloth.rotation.y = 0.39;
    }

    yield;
  }
  root.userData.inventory = {
    courtyards: QINGMING_QUARTERS.length,
    wings: QINGMING_QUARTERS.length * 3,
  };
  return root;
}
