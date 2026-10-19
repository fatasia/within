import * as THREE from 'three';
import { cityGround, qingmingRiver } from './cityLayout';
import { rod } from './modelGeometry';
import { qingmingCitizen } from './qingmingDetails';
import type { StreetMaterials } from './qingmingEpisodes';
import { seededRandom } from './math';

type Point = [number, number, number];

/** Bridge crop: round parasols, low counters and bare spreading trees frame the crossing.
 * Positions interpret the painting; these are not surveyed historical coordinates. */
export const BRIDGE_MARKET_SITES = [
  [-29, -19, 1.65],
  [-35, -21, 1.8],
  [-12, -17, 1.55],
  [-29, 25, 1.8],
  [-35, 25, 1.65],
  [-11, 25, 1.7],
  [-7, 28, 1.5],
  [1, 27, 1.6],
] as const;

export function buildQingmingBridgeMarket(m: StreetMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = 'qingming-reference-bridge-market';
  const random = seededRandom(112003);
  const beam = (g: THREE.Group, a: Point, b: Point, r: number, material = m.wood) =>
    rod(g, new THREE.Vector3(...a), new THREE.Vector3(...b), r, material, 0.7, 4);
  const box = (g: THREE.Group, size: Point, at: Point, material = m.wood) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...at);
    g.add(mesh);
    return mesh;
  };
  for (const [index, [x, offset, radius]] of BRIDGE_MARKET_SITES.entries()) {
    const z = qingmingRiver(x) + offset;
    const stand = new THREE.Group();
    stand.name = 'round-parasol-stall';
    stand.position.set(x, cityGround(x, z), z);
    stand.rotation.y = index * 1.7;
    root.add(stand);
    const positions: number[] = [],
      indices: number[] = [];
    // Curved, scalloped canopy, with explicitly modelled underside and timber ribs.
    for (let ring = 0; ring < 3; ring++) {
      const r = [0.05, radius * 0.55, radius][ring]!;
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        positions.push(
          Math.cos(a) * r,
          [3.1, 2.84, 2.58 + (i % 2) * 0.055][ring]!,
          Math.sin(a) * r,
        );
        if (ring < 2 && i < 24) {
          const n = ring * 25 + i;
          indices.push(
            n,
            n + 1,
            n + 25,
            n + 1,
            n + 26,
            n + 25,
            n,
            n + 25,
            n + 1,
            n + 1,
            n + 25,
            n + 26,
          );
        }
      }
    }
    const canopy = new THREE.BufferGeometry();
    canopy.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    canopy.setIndex(indices);
    canopy.computeVertexNormals();
    stand.add(new THREE.Mesh(canopy, index % 3 === 0 ? m.earth : m.linen));
    beam(stand, [0, 0, 0], [0, 3.22, 0], 0.055);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      beam(
        stand,
        [0, 3.07, 0],
        [Math.cos(a) * radius * 0.55, 2.81, Math.sin(a) * radius * 0.55],
        0.017,
      );
      beam(
        stand,
        [Math.cos(a) * radius * 0.55, 2.81, Math.sin(a) * radius * 0.55],
        [Math.cos(a) * radius, 2.55, Math.sin(a) * radius],
        0.014,
      );
    }
    box(stand, [1.65, 0.12, 0.8], [0, 0.85, 0.45]);
    for (const side of [-1, 1]) box(stand, [0.12, 0.8, 0.65], [side * 0.63, 0.4, 0.45]);
    for (let i = 0; i < 4; i++) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.09, 0.1, 6), m.clay);
      bowl.position.set(-0.57 + i * 0.38, 0.96, 0.45);
      stand.add(bowl);
    }
    if (index % 2 === 0) {
      const seller = qingmingCitizen(
        { robe: m.blue, skin: m.skin, hair: m.dark, trim: m.linen },
        index,
        false,
      );
      seller.position.set(0.55, 0, -0.45);
      seller.name = 'parasol-tea-seller';
      stand.add(seller);
    }
  }
  // Old riparian trunks have a low fork, spreading limbs and fine terminal twigs.
  // Retain the spring silhouette rather than covering it with summer foliage balls.
  for (const [x, offset, yaw] of [
    [-3, 21, 0.3],
    [-44, 23, 1.6],
    [20, -18, 2.4],
  ]) {
    const tree = new THREE.Group();
    tree.name = 'bridgehead-spreading-spring-tree';
    const z = qingmingRiver(x!) + offset!;
    tree.position.set(x!, cityGround(x!, z), z);
    tree.rotation.y = yaw!;
    root.add(tree);
    const fork: Point = [0.42, 3.1, 0.2];
    beam(tree, [0, 0, 0], fork, 0.35, m.dark);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      beam(tree, [Math.cos(a) * 1.2, 0.02, Math.sin(a) * 1.2], [0.18, 0.75, 0.1], 0.11, m.dark);
      const end: Point = [Math.cos(a) * (2.7 + random()), 5.2 + random() * 1.8, Math.sin(a) * 3.2];
      beam(tree, fork, end, 0.16, m.dark);
      for (let j = 0; j < 3; j++) {
        const angle = a + (j - 1.5) * 0.5;
        const twig: Point = [
          end[0] + Math.cos(angle) * 1.5,
          end[1] + 0.7 + random(),
          end[2] + Math.sin(angle) * 1.5,
        ];
        beam(tree, end, twig, 0.038, m.dark);
        for (const side of [-1, 1])
          beam(
            tree,
            twig,
            [
              twig[0] + Math.cos(angle + side * 0.5) * 0.8,
              twig[1] + 0.45,
              twig[2] + Math.sin(angle + side * 0.5) * 0.8,
            ],
            0.013,
            m.dark,
          );
      }
    }
  }
  root.userData.inventory = {
    parasols: BRIDGE_MARKET_SITES.length,
    teaSellers: 4,
    spreadingTrees: 3,
    source: 'reference/bridge.jpg',
  };
  return root;
}
