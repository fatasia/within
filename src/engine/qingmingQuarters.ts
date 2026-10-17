import * as THREE from 'three';
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
    const h = 2.5 + (index % 3) * 0.3;
    box(house, w, h, d, 0, h / 2, 0, m.linen);
    const profile = { width: w + 0.8, depth: d + 0.8, base: h + 0.04, rise: 1.05, detailed: false };
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
      box(house, 0.75, 0.75, 0.06, side * w * 0.3, 1.65, d / 2 + 0.04, m.wood);
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
    yield;
  }
  root.userData.inventory = {
    courtyards: QINGMING_QUARTERS.length,
    wings: QINGMING_QUARTERS.length * 3,
  };
  return root;
}
