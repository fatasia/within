import * as THREE from 'three';
import type { StreetMaterials } from './qingmingEpisodes';
import { roofGeometry, roofTilesGeometry, roofGableGeometry, roofSurfaceY } from './qingmingRoof';
import { buildQingmingShopFront } from './qingmingCommerce';
import { potteryJar } from './qingmingDetails';
/** Distinct merchant compound based on the layered street-front timber architecture in source panel six.
 * Dimensions and hidden courtyard sides are interpretive; this is not a measured historical survey. */
export function* buildQingmingMerchantHallSteps(
  m: StreetMaterials,
  tile: THREE.Material,
  plaster: THREE.Material,
): Generator<void, THREE.Group> {
  const root = new THREE.Group();
  root.name = 'qingming-city-merchant-compound';
  root.position.set(84.4, 2.8, -57);
  const box = (
    g: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material = m.wood,
  ) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const roof = (g: THREE.Group, w: number, d: number, y: number, rise: number) => {
    const p = { width: w, depth: d, base: y, rise, detailed: true };
    g.add(new THREE.Mesh(roofGeometry(p), tile), new THREE.Mesh(roofTilesGeometry(p), tile));
    g.add(new THREE.Mesh(roofGableGeometry(p, w - 0.8, d - 0.8, y), plaster));
    box(g, w, 0.13, 0.18, 0, roofSurfaceY(p, 0, 0) + 0.06, 0, tile);
    for (const side of [-1, 1])
      box(g, w, 0.15, 0.15, 0, roofSurfaceY(p, 0, (side * d) / 2) - 0.1, (side * d) / 2, m.dark);
  };
  // Five open trading bays below an inhabited timber gallery, not a solid box façade.
  box(root, 18.5, 0.38, 9, 0, 0.19, 0, m.stone);
  box(root, 18, 0.12, 8.5, 0, 0.44, 0, m.earth);
  box(root, 18, 3.3, 0.22, 0, 2.1, -4, plaster);
  for (const side of [-1, 1]) box(root, 0.22, 3.3, 8, side * 8.9, 2.1, 0, plaster);
  box(root, 18.8, 0.25, 9.8, 0, 3.8, 0.4, m.dark);
  for (let bay = 0; bay < 6; bay++) {
    const x = -8.75 + bay * 3.5;
    box(root, 0.48, 0.22, 0.48, x, 0.56, 4.25, m.stone);
    box(root, 0.19, 3.0, 0.19, x, 2.17, 4.25, m.wood);
    box(root, 0.7, 0.16, 0.48, x, 3.52, 4.25, m.dark);
    box(root, 0.95, 0.14, 0.26, x, 3.65, 4.25, m.wood);
    for (const side of [-1, 1]) {
      const bracket = box(root, 0.7, 0.13, 0.2, x + side * 0.24, 3.35, 4.25, m.wood);
      bracket.rotation.z = side * 0.5;
    }
  }
  for (let bay = 0; bay < 5; bay++) {
    const shop = buildQingmingShopFront(bay === 2 ? 0 : bay, 3.2, 7.5, m);
    shop.position.set(-7 + bay * 3.5, 0.5, 0);
    root.add(shop);
    yield;
  }
  // The upper storey is recessed behind the gallery: open rail, layered posts and a lower eave.
  box(root, 14.2, 2.3, 0.2, 0, 5.05, -2.7, plaster);
  for (const side of [-1, 1]) box(root, 0.2, 2.3, 5.5, side * 7, 5.05, 0, plaster);
  for (let i = 0; i < 9; i++) {
    const x = -6.8 + i * 1.7;
    box(root, 0.14, 2.32, 0.14, x, 5.05, 2.8, m.dark);
    if (i < 8) {
      box(root, 1.52, 1.65, 0.07, x + 0.85, 5.05, 2.71, m.dark);
      for (let j = 0; j < 6; j++)
        box(root, 0.035, 1.65, 0.05, x + 0.2 + j * 0.25, 5.05, 2.77, m.linen);
      for (const y of [4.43, 5.13, 5.72]) box(root, 1.53, 0.035, 0.06, x + 0.85, y, 2.8, m.wood);
    }
  }
  for (let i = 0; i <= 30; i++) box(root, 0.055, 0.75, 0.055, -9 + i * 0.6, 4.35, 5, m.wood);
  box(root, 18.2, 0.1, 0.12, 0, 4.76, 5, m.dark);
  box(root, 18.2, 0.1, 0.12, 0, 4, 5, m.dark);
  // Four-sided gallery roof: an open ring meeting the recessed upper walls, not intersecting them.
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= 4; j++) {
    const t = j / 4,
      w = 19.6 - (19.6 - 14.2) * t,
      d = 11 - (11 - 5.6) * t,
      y = 5.7 + 0.65 * t + 0.12 * (1 - t) ** 4;
    for (const [x, z] of [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ]) {
      pos.push(x!, y, z!);
      uv.push(x! * 0.25, z! * 0.25);
    }
    if (j < 4)
      for (let k = 0; k < 4; k++) {
        const a = j * 4 + k,
          b = j * 4 + ((k + 1) % 4);
        idx.push(a, a + 4, b, b, a + 4, b + 4);
      }
  }
  const ring = new THREE.BufferGeometry();
  ring.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  ring.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  ring.setIndex(idx);
  ring.computeVertexNormals();
  root.add(new THREE.Mesh(ring, tile));
  // Upper main roof and exposed rafters have one shared roof surface datum.
  roof(root, 15.7, 7.2, 6.21, 1.85);
  for (let i = 0; i < 29; i++) box(root, 0.07, 0.09, 1, -7 + i * 0.5, 6.56, 3.3, m.dark);
  // Rear hall and two side wings enclose a real courtyard, with a clear open passage.
  for (const [x, z, w, d, h] of [
    [-9, -11, 3.8, 8, 3],
    [9, -11, 3.8, 8, 3],
    [0, -19, 19, 5, 3.2],
  ]) {
    const wing = new THREE.Group();
    wing.position.set(x!, 0, z!);
    root.add(wing);
    box(wing, w!, 0.25, d!, 0, 0.125, 0, m.stone);
    box(wing, w!, h!, d!, 0, h! / 2 + 0.25, 0, plaster);
    box(wing, 1.1, 2, 0.04, 0, 1.25, d! / 2 + 0.025, m.dark);
    roof(wing, w! + 0.9, d! + 1, h! + 0.25, Math.min(1.6, w! * 0.22));
    yield;
  }
  // Stacked ceramics and an inner well are visible through the side lane.
  for (let i = 0; i < 8; i++) {
    const jar = potteryJar(m.clay);
    jar.position.set(5.5 + (i % 2) * 0.5, 0.12, -8 - Math.floor(i / 2) * 0.55);
    jar.scale.setScalar(1.4);
    root.add(jar);
  }
  const well = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.65, 12, 1, true), m.stone);
  well.position.set(-3, 0.325, -10);
  root.add(well);
  root.userData.inventory = { frontBays: 5, storeys: 2, courtyardWings: 3, sourcePanel: 6 };
  return root;
}
