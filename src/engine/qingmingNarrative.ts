import * as THREE from 'three';
import { qingmingCitizen } from './qingmingDetails';
import { curveRod, rod } from './modelGeometry';
import type { StreetMaterials } from './qingmingEpisodes';
import { qingmingRiver, cityGround } from './cityLayout';
import { roofGeometry, roofGableGeometry } from './qingmingRoof';
type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(...p);

/** Observable work and street structures, kept distinct from unverified shop identities. */
export function* buildQingmingNarrativeSteps(
  m: StreetMaterials,
  tile: THREE.Material,
): Generator<void, THREE.Group> {
  const root = new THREE.Group();
  root.name = 'qingming-river-and-street-narratives';
  const box = (g: THREE.Object3D, s: P, p: P, mat: THREE.Material = m.wood) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(...s), mat);
    a.position.set(...p);
    g.add(a);
    return a;
  };
  const beam = (g: THREE.Object3D, a: P, b: P, r = 0.035, mat = m.wood) =>
    rod(g, v(a), v(b), r, mat, 1, 5);
  const place = (name: string, x: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, cityGround(x, z) + 0.02, z);
    root.add(g);
    return g;
  };
  // Different cargo silhouettes: low open hold, reed-covered craft and working ferry.
  for (const [i, x] of [-116, -101, -42, 17].entries()) {
    const g = new THREE.Group();
    g.name = [
      'open-grain-barge',
      'reed-covered-cargo-boat',
      'river-ferry',
      'reed-covered-cargo-boat',
    ][i]!;
    // Keel -0.35 and deck -0.08: a 0.15 lift keeps the hull immersed and
    // the deck above the 0.04 water plane through the +/-0.035 heave cycle.
    g.position.set(x, 0.15, qingmingRiver(x) + (i % 2 ? 4.5 : -4.5));
    root.add(g);
    g.userData.riverCraft = true;
    const length = i === 2 ? 6.5 : 10,
      width = i === 2 ? 2.0 : 2.8;
    const pos: number[] = [],
      idx: number[] = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20,
        xx = (t - 0.5) * length,
        ww = (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.36) + 0.04,
        up = 0.45 + Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.65;
      pos.push(xx, up, -ww, xx, -0.35, -ww * 0.58, xx, -0.35, ww * 0.58, xx, up, ww);
      if (j < 20)
        for (let k = 0; k < 3; k++) {
          const a = j * 4 + k;
          idx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m.wood));
    for (const side of [-1, 1])
      curveRod(
        g,
        Array.from({ length: 21 }, (_, j) => {
          const t = j / 20;
          return v([
            (t - 0.5) * length,
            0.45 + Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.65,
            side * ((width / 2) * Math.pow(Math.sin(Math.PI * t), 0.36) + 0.04),
          ]);
        }),
        0.065,
        m.dark,
        20,
      );
    for (let j = 0; j < 13; j++)
      box(g, [0.5, 0.07, width * 0.72], [((j - 6) * length) / 16, -0.08, 0]);
    if (i % 2) {
      for (let j = 0; j < 8; j++) {
        const x = (j - 3.5) * 0.65;
        curveRod(
          g,
          Array.from({ length: 9 }, (_, k) => {
            const a = (k / 8) * Math.PI;
            return v([x, 0.45 + Math.sin(a) * 1.2, Math.cos(a) * width * 0.43]);
          }),
          0.045,
          m.linen,
          8,
        );
      }
      const cp: number[] = [],
        ci: number[] = [];
      for (let j = 0; j <= 8; j++)
        for (const x of [-2.6, 2.6]) {
          const a = (j / 8) * Math.PI;
          cp.push(x, 0.45 + Math.sin(a) * 1.2, Math.cos(a) * width * 0.43);
        }
      for (let j = 0; j < 8; j++) {
        const a = j * 2;
        ci.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      cg.setIndex(ci);
      cg.computeVertexNormals();
      g.add(new THREE.Mesh(cg, m.linen));
    } else if (i === 0) {
      for (let j = 0; j < 12; j++) {
        const sack = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), m.linen);
        sack.scale.set(0.5, 0.35, 0.38);
        sack.position.set(
          ((j % 4) - 1.5) * 1.15,
          0.12 + Math.floor(j / 8) * 0.4,
          ((Math.floor(j / 4) % 2) - 0.5) * 0.9,
        );
        g.add(sack);
      }
    } else {
      for (const x of [-1.7, 0, 1.7]) box(g, [0.3, 0.12, width * 0.86], [x, 0.4, 0]);
    }
    const oar = new THREE.Bone();
    oar.name = 'qingming-working-oar';
    oar.position.set(length * 0.35, 0.65, 0.2);
    g.add(oar);
    beam(oar, [0, 0, 0], [2, -0.6, 1.4], 0.05);
    box(oar, [0.32, 0.07, 0.8], [2, -0.6, 1.4], m.dark).rotation.y = -0.5;
    const boatman = new THREE.Bone();
    boatman.name = 'qingming-working-boatman';
    boatman.position.set(length * 0.35, 0.08, -0.25);
    boatman.rotation.y = Math.PI / 2;
    g.add(boatman);
    boatman.add(
      qingmingCitizen({ robe: m.blue, skin: m.skin, hair: m.dark, trim: m.linen }, i + 100, true, {
        leftWrist: [-0.25, 1.05, 0.4],
        rightWrist: [0.25, 1.05, 0.4],
      }),
    );
    yield;
  }
  // Tow rope stays taut between river craft and the riverside path.
  curveRod(
    root,
    [
      v([-116, 1.3, qingmingRiver(-116) - 4.5]),
      v([-120, 2.2, qingmingRiver(-120) - 10]),
      v([-125, 4.1, qingmingRiver(-125) - 15.2]),
    ],
    0.025,
    m.linen,
    16,
  );
  // Boatmen, porters and buyers have places to work: quayside sheds, poles and uneven cargo stacks.
  for (const [index, x] of [-105, -77, -48].entries()) {
    const z = qingmingRiver(x) + 22;
    const g = place('quayside-open-goods-shed', x, z);
    for (const sx of [-3.1, 3.1])
      for (const sz of [-2, 2]) beam(g, [sx, 0, sz], [sx, 3.2, sz], 0.1);
    const roof = { width: 7, depth: 5, base: 3.14, rise: 0.9, detailed: false };
    g.add(new THREE.Mesh(roofGeometry(roof), tile));
    for (let j = 0; j < 6; j++) {
      box(
        g,
        [0.8, 0.55, 0.65],
        [((j % 3) - 1) * 1.1, 0.3, Math.floor(j / 3) * 0.9],
        j % 2 ? m.linen : m.wood,
      );
      beam(
        g,
        [((j % 3) - 1) * 1.1 - 0.23, 0, Math.floor(j / 3) * 0.9],
        [((j % 3) - 1) * 1.1 - 0.23, 0.58, Math.floor(j / 3) * 0.9],
        0.025,
        m.dark,
      );
    }
    for (let j = 0; j < 5; j++)
      beam(g, [-2.5, 0.09 + j * 0.11, 1.6], [2.4, 0.09 + j * 0.11, 1.6], 0.06, m.wood);
    g.rotation.y = index * 0.12 - 0.1;
    yield;
  }
  // Small entrance pavilions and lateral shop galleries break the identical roof rhythm.
  for (const [index, x, z] of [
    [0, -120, -41],
    [1, -70, 38],
    [2, 14, -92],
    [3, 45, -96],
  ] as const) {
    const g = place('side-street-open-gallery', x, z);
    const w = 5.1,
      d = 3.2,
      h = 3.1;
    for (const sx of [-w / 2, 0, w / 2])
      for (const sz of [-d / 2, d / 2]) beam(g, [sx, 0, sz], [sx, h, sz], 0.09);
    const roof = { width: w + 1, depth: d + 1, base: h, rise: 1, detailed: false };
    g.add(new THREE.Mesh(roofGeometry(roof), tile));
    g.add(new THREE.Mesh(roofGableGeometry(roof, w, d, h), m.linen));
    box(g, [w, 0.15, 0.65], [0, 0.7, -d / 2]);
    for (let j = 0; j < 4; j++)
      box(g, [0.25, 0.45, 0.3], [-1.5 + j, 0.98, -d / 2], index % 2 ? m.clay : m.linen);
    yield;
  }
  // Carrying sedan: poles, suspended textile enclosure and a rounded canopy, rather than another cart.
  const sedan = place('covered-sedan-on-city-street', 108, -44.3);
  for (const side of [-1, 1]) beam(sedan, [-2.8, 1.2, side * 0.6], [2.8, 1.2, side * 0.6], 0.055);
  box(sedan, [1.65, 0.15, 1.35], [0, 1.2, 0]);
  for (const x of [-0.8, 0.8])
    for (const z of [-0.65, 0.65]) beam(sedan, [x, 1.2, z], [x, 2.65, z], 0.04);
  for (const side of [-1, 1]) box(sedan, [1.55, 1.25, 0.04], [0, 1.94, side * 0.66], m.linen);
  const cover = { width: 1.95, depth: 1.65, base: 2.6, rise: 0.4, detailed: false };
  sedan.add(new THREE.Mesh(roofGeometry(cover), m.blue));
  yield;
  root.userData.inventory = { additionalBoats: 4, cargoSheds: 3, streetGalleries: 4, sedans: 1 };
  return root;
}
