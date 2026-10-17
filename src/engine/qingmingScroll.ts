import * as THREE from 'three';
import { rod, curveRod } from './modelGeometry';
import { qingmingCitizen, wovenBasket, potteryJar } from './qingmingDetails';
import type { StreetMaterials } from './qingmingEpisodes';
import { cityGround, qingmingRiver } from './cityLayout';
import { disposeObject } from './resources';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);
export const QINGMING_RURAL_HOUSES = [
      [-121, -34, 6, 4.8, -0.14],
      [-109, -34, 7, 5.6, 0.08],
      [-114, -53, 6.4, 5, -0.18],
      [-97, -57, 5.5, 4.5, 0.2],
    ] as const;
export const QINGMING_SCROLL_FOCI = {
  village: [-110, 5.2, -34] as const,
  landing: [-91, 3.7, qingmingRiver(-91) - 13] as const,
  courtyard: [113, 4.2, -68] as const,
};

function box(g: THREE.Group, size: Point, at: Point, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...at);
  g.add(mesh);
  return mesh;
}
function beam(g: THREE.Group, a: Point, b: Point, r: number, material: THREE.Material) {
  // Straw and fine twigs need a volume, not two invisible end caps per strand.
  // Three-sided open prisms retain their silhouette at every viewing angle.
  if (r < 0.06) {
    const start = v(a),
      end = v(b),
      direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.7, r, direction.length(), 3, 1, true),
      material,
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    g.add(mesh);
    return mesh;
  }
  return rod(g, v(a), v(b), r, material, 0.7, 4);
}

/** Ground-following ribbon: the lane is not a floating plane or another water surface. */
function lane(g: THREE.Group, points: [number, number][], width: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => v([x, 0, z])));
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = [];
  const segments = points.length * 5;
  for (let i = 0; i <= segments; i++) {
    const point = curve.getPoint(i / segments),
      tangent = curve.getTangent(i / segments);
    for (const side of [-1, 1]) {
      const x = point.x - (tangent.z * width * side) / 2;
      const z = point.z + (tangent.x * width * side) / 2;
      // Existing waterfront paving tops out at ground + 0.035. Separate the
      // branch lane vertically so its junction never z-fights with those strips.
      positions.push(x, cityGround(x, z) + 0.055, z);
      uvs.push(x * 0.12, z * 0.12);
    }
    if (i < segments) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  g.add(new THREE.Mesh(geometry, material));
}

function pack(g: THREE.Group, m: StreetMaterials, x: number, y: number, z: number) {
  box(g, [0.8, 0.48, 0.58], [x, y + 0.24, z], m.linen);
  for (const side of [-1, 1]) {
    box(g, [0.035, 0.49, 0.59], [x + side * 0.22, y + 0.245, z], m.wood);
  }
}

/** A modest roadside awning and trestles; no invented monumental architecture. */
function roadsideShelter(m: StreetMaterials): THREE.Group {
  const g = new THREE.Group();
  g.name = 'qingming-roadside-refreshment-shelter';
  for (const x of [-2.6, 2.6])
    for (const z of [-1.7, 1.7]) beam(g, [x, 0, z], [x, z < 0 ? 3.2 : 2.65, z], 0.085, m.wood);
  const awning = box(g, [5.8, 0.065, 4], [0, 2.94, 0], m.linen);
  awning.rotation.x = 0.16;
  for (const x of [-2.6, 0, 2.6]) beam(g, [x, 3.22, -1.8], [x, 2.65, 1.8], 0.04, m.wood);
  box(g, [3.7, 0.12, 0.9], [0, 0.9, -0.5], m.wood);
  for (const x of [-1.5, 1.5])
    for (const z of [-0.8, -0.2]) box(g, [0.09, 0.9, 0.09], [x, 0.45, z], m.wood);
  for (const x of [-0.95, 0.2, 1.25]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.1, 0.13, 6), m.clay);
    bowl.position.set(x, 1.03, -0.5);
    g.add(bowl);
  }
  for (const x of [-1.4, 1.3]) {
    box(g, [0.9, 0.12, 0.35], [x, 0.45, 0.75], m.wood);
    for (const s of [-1, 1]) box(g, [0.08, 0.4, 0.28], [x + s * 0.32, 0.2, 0.75], m.wood);
  }
  pack(g, m, 2, 0, -0.7);
  return g;
}

/** Overlapping straw courses have an irregular edge, unlike the urban tiled shop template. */
function thatchedHouse(m: StreetMaterials, width: number, depth: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'qingming-rural-thatched-house';
  const roofDrop = 0.12;
  box(g, [width, 2.6, depth], [0, 1.3, 0], m.earth);
  box(g, [1.05, 1.9, 0.05], [0.4, 0.95, depth / 2 + 0.04], m.dark);
  const openDoor = box(g, [0.8, 1.9, 0.09], [1.16, 0.95, depth / 2 + 0.32], m.wood);
  openDoor.rotation.y = 0.62;
  for (const side of [-1, 1]) {
    const gable = new THREE.BufferGeometry();
    gable.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          (side * width) / 2,
          2.6 - roofDrop,
          -depth / 2,
          (side * width) / 2,
          2.6 - roofDrop,
          depth / 2,
          (side * width) / 2,
          4 - roofDrop,
          0,
        ],
        3,
      ),
    );
    if (side > 0) gable.setIndex([0, 2, 1]);
    gable.computeVertexNormals();
    g.add(new THREE.Mesh(gable, m.earth));
  }
  for (const side of [-1, 1]) {
    box(g, [0.16, 2.7, 0.16], [side * (width / 2 - 0.16), 1.35, depth / 2], m.wood);
    const verts = [
      -width / 2 - 0.35,
      4 - roofDrop,
      0,
      width / 2 + 0.35,
      4 - roofDrop,
      0,
      -width / 2 - 0.45,
      2.65 - roofDrop,
      side * (depth / 2 + 0.55),
      width / 2 + 0.35,
      4 - roofDrop,
      0,
      width / 2 + 0.45,
      2.65 - roofDrop,
      side * (depth / 2 + 0.55),
      -width / 2 - 0.45,
      2.65 - roofDrop,
      side * (depth / 2 + 0.55),
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    if (side > 0) {
      // Consistent outward winding without an additional double-sided material batch.
      geo.setIndex([0, 2, 1, 3, 5, 4]);
    }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m.earth));
    for (let course = 0; course < 3; course++)
      for (let straw = 0; straw < 17; straw++) {
        const x = (straw / 16 - 0.5) * (width + 0.8);
        const t = course * 0.27;
        const end = Math.min(1.04, t + 0.43 + Math.sin(straw * 3.7 + course) * 0.035);
        beam(
          g,
          [x, 4.04 - roofDrop - t * 1.35, side * t * (depth / 2 + 0.55)],
          [
            x + Math.sin(straw) * 0.07,
            4.04 - roofDrop - end * 1.35,
            side * end * (depth / 2 + 0.55),
          ],
          0.026,
          (straw + course) % 3 ? m.linen : m.wood,
        );
      }
  }
  beam(
    g,
    [-width / 2 - 0.4, 4.06 - roofDrop, 0],
    [width / 2 + 0.4, 4.06 - roofDrop, 0],
    0.085,
    m.wood,
  );
  box(g, [0.85, 0.72, 0.04], [-width * 0.28, 1.6, depth / 2 + 0.04], m.dark);
  for (let i = 0; i < 5; i++)
    box(g, [0.04, 0.7, 0.05], [-width * 0.28 - 0.32 + i * 0.16, 1.6, depth / 2 + 0.08], m.wood);
  return g;
}

function sparseVillageTree(m: StreetMaterials, height: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'qingming-sparse-spring-branches';
  curveRod(
    g,
    [v([0, 0, 0]), v([0.3, height * 0.28, 0.1]), v([-0.12, height * 0.6, 0])],
    0.26,
    m.wood,
    6,
  );
  for (let root = 0; root < 3; root++) {
    const angle = root * 2.399 + height;
    beam(g, [0, 0.5, 0], [Math.cos(angle) * 0.65, 0.05, Math.sin(angle) * 0.65], 0.11, m.wood);
  }
  for (let arm = 0; arm < 4; arm++) {
    const a = arm * 2.399 + Math.sin(height) * 0.35;
    const end: Point = [
      Math.cos(a) * height * (0.2 + (arm % 2) * 0.06),
      height * (0.51 + arm * 0.04),
      Math.sin(a) * height * 0.25,
    ];
    curveRod(
      g,
      [v([0, height * 0.32, 0]), v([end[0] * 0.5, end[1] - height * 0.06, end[2] * 0.6]), v(end)],
      0.09,
      m.wood,
      4,
    );
    for (let twig = 0; twig < 8; twig++) {
      const angle = a + (twig - 3.5) * 0.46;
      const reach = height * (0.13 + (twig % 3) * 0.025);
      const tip: Point = [
        end[0] + Math.cos(angle) * reach,
        end[1] + height * (0.12 + Math.sin(twig * 1.7 + arm) * 0.11),
        end[2] + Math.sin(angle) * reach,
      ];
      beam(g, end, tip, 0.023, m.wood);
      beam(
        g,
        [end[0] * 0.3 + tip[0] * 0.7, end[1] * 0.3 + tip[1] * 0.7, end[2] * 0.3 + tip[2] * 0.7],
        [tip[0] + Math.sin(twig + arm) * 0.45, tip[1] + 0.42, tip[2] + Math.cos(twig + arm) * 0.45],
        0.011,
        m.dark,
      );
    }
  }
  return g;
}

/** References: complete Song scroll sections 01–02 and 06, not the Qing court remake. */
export function buildQingmingScrollDetails(m: StreetMaterials): THREE.Group {
  const steps = buildQingmingScrollSteps(m);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}
export function* buildQingmingScrollSteps(m: StreetMaterials): Generator<void, THREE.Group> {
  const g = new THREE.Group();
  g.name = 'qingming-full-scroll-episodes';
  let completed = false;
  try {
    const village = new THREE.Group();
    village.name = 'qingming-country-lanes';
    g.add(village);
    for (const [x, z, w, d, yaw] of QINGMING_RURAL_HOUSES) {
      const house = thatchedHouse(m, w!, d!);
      house.position.set(x!, cityGround(x!, z!), z!);
      house.rotation.y = yaw!;
      village.add(house);
      yield;
    }
    for (const [x, z, h] of [
      [-126, -26, 6.8],
      [-116, -27, 7.1],
      [-102, -37, 7.8],
      [-106, -60, 7],
      [-123, -58, 5.6],
    ]) {
      const tree = sparseVillageTree(m, h!);
      tree.position.set(x!, cityGround(x!, z!), z!);
      village.add(tree);
      yield;
    }
    // Low woven bounds leave the doors, the east-west road and the winding approach open.
    for (let i = 0; i < 15; i++) {
      const x = -125 + i * 1.2,
        z = -27 + Math.sin(i * 0.27) * 0.6;
      if (i > 6 && i < 10) continue;
      beam(village, [x, 2.8, z], [x, 3.8, z], 0.035, m.wood);
      for (let row = 0; row < 3; row++)
        beam(village, [x, 3 + row * 0.22, z], [x + 1.1, 3 + row * 0.22, z + 0.08], 0.024, m.linen);
    }
    const basket = wovenBasket(0.4, 0.5, m.linen);
    basket.position.set(-107.7, 2.8, -29.7);
    village.add(basket);
    const villager = qingmingCitizen(
      { robe: m.earth, skin: m.skin, hair: m.dark, trim: m.linen },
      3,
      true,
      { leftWrist: [-0.26, 0.87, 0.3], rightWrist: [0.3, 0.87, 0.3] },
    );
    villager.position.set(-108.5, 2.8, -29.5);
    villager.rotation.y = 1.2;
    village.add(villager);
    yield;

    // The right end of the Song scroll opens with bare/sparse trees and a winding
    // country approach. Preserve open ground rather than planting a lush forest.
    const approach = new THREE.Group();
    approach.name = 'qingming-rural-approach-and-grove';
    g.add(approach);
    lane(
      approach,
      [
        [-138, -65],
        [-130, -48],
        [-115, -44],
        [-99, -39],
        [-86, -23],
        [-78, -16],
      ],
      3.2,
      m.earth,
    );
    lane(
      approach,
      [
        [-125, -44],
        [-124, -34],
        [-112, -28],
        [-100, -26],
      ],
      1.4,
      m.earth,
    );
    for (const [x, z, h] of [
      [-137, -39, 8.8],
      [-132, -30, 7.1],
      [-129, -55, 8.1],
      [-119, -64, 6.8],
      [-99, -31, 8.2],
      [-93, -24, 7.4],
      [-87, -39, 6.4],
    ]) {
      const tree = sparseVillageTree(m, h!);
      tree.position.set(x!, cityGround(x!, z!), z!);
      tree.rotation.y = x! * 0.39;
      approach.add(tree);
      yield;
    }
    // A shallow dry ditch and short plank crossing evoke the small rural crossing
    // without adding a second river or changing the world's walkable ground.
    const crossing = new THREE.Group();
    crossing.name = 'qingming-country-plank-crossing';
    crossing.position.set(-130, 2.8, -48);
    crossing.rotation.y = -0.42;
    approach.add(crossing);
    box(crossing, [9, 0.025, 0.62], [0, 0.016, 0], m.dark);
    for (const z of [-0.49, 0.49]) box(crossing, [9.2, 0.12, 0.31], [0, 0.055, z], m.earth);
    for (let i = 0; i < 7; i++)
      box(crossing, [2.65, 0.14, 0.23], [0, 0.13, -0.75 + i * 0.25], m.wood);
    for (const x of [-1.05, 1.05]) box(crossing, [0.12, 0.1, 1.9], [x, 0.05, 0], m.wood);
    const shelter = roadsideShelter(m);
    shelter.position.set(-79, 2.8, -31.2);
    shelter.rotation.y = -0.09;
    g.add(shelter);
    const server = qingmingCitizen(
      { robe: m.linen, skin: m.skin, hair: m.dark, trim: m.wood },
      2,
      false,
    );
    server.position.set(-79.8, 2.8, -32.5);
    g.add(server);
    yield;

    const towpath = new THREE.Group();
    towpath.name = 'qingming-working-riverbank';
    g.add(towpath);
    // Cargo waits behind the quay rather than obstructing the narrow towpath.
    for (let i = 0; i < 7; i++) {
      const x = -88 + (i % 4) * 0.95;
      pack(towpath, m, x, 2.8 + Math.floor(i / 4) * 0.5, -20.8);
    }
    for (const x of [-101, -84]) {
      const z = qingmingRiver(x) - 13.2;
      beam(towpath, [x, 2.8, z], [x, 3.55, z], 0.13, m.wood);
      for (let ring = 0; ring < 3; ring++) {
        const coil = new THREE.Mesh(
          new THREE.TorusGeometry(0.25 + ring * 0.07, 0.025, 3, 8),
          m.linen,
        );
        coil.rotation.x = Math.PI / 2;
        coil.position.set(x + 0.55, 2.86 + ring * 0.025, z - 0.2);
        towpath.add(coil);
      }
    }
    yield;

    const landing = new THREE.Group();
    landing.name = 'qingming-quayside-cargo-handoff';
    landing.position.set(-91, 2.8, qingmingRiver(-91) - 14.6);
    g.add(landing);
    // Gangplank joins the existing jetty (y=2.15) to the bank, not a floating new pier.
    const plank = box(landing, [1.65, 0.12, 3.4], [0, -0.35, 1.35], m.wood);
    plank.rotation.x = 0.2;
    for (const x of [-0.52, 0, 0.52])
      box(landing, [0.028, 0.015, 3.36], [x, -0.278, 1.35], m.dark).rotation.x = 0.2;
    for (const side of [-1, 1]) {
      const worker = qingmingCitizen(
        { robe: side < 0 ? m.blue : m.linen, skin: m.skin, hair: m.dark, trim: m.wood },
        side < 0 ? 1 : 4,
        true,
        { leftWrist: [-0.23, 1.05, 0.4], rightWrist: [0.23, 1.05, 0.4] },
      );
      worker.position.set(side * 0.72, 0, 0);
      worker.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      landing.add(worker);
      yield;
    }
    box(landing, [0.65, 0.48, 0.6], [0, 1.04, 0], m.earth);
    for (const z of [-0.21, 0.21]) box(landing, [0.68, 0.025, 0.025], [0, 1.29, z], m.linen);
    for (let i = 0; i < 4; i++)
      box(
        landing,
        [0.8, 0.5, 0.62],
        [2.1 + (i % 2) * 0.82, 0.26 + Math.floor(i / 2) * 0.51, -0.8],
        m.linen,
      );

    const court = new THREE.Group();
    court.name = 'qingming-city-end-courtyard';
    court.position.set(113, 2.8, -68);
    g.add(court);
    for (const side of [-1, 1]) {
      box(court, [0.27, 1.7, 12], [side * 7, 0.85, 0], m.earth);
      box(court, [0.42, 0.13, 12.2], [side * 7, 1.76, 0], m.stone);
      box(court, [4.6, 1.7, 0.28], [side * 4.7, 0.85, 6], m.earth);
      box(court, [0.2, 2.8, 0.2], [side * 2.4, 1.4, 6], m.wood);
    }
    box(court, [14, 1.7, 0.25], [0, 0.85, -6], m.earth);
    box(court, [5.3, 0.2, 1.4], [0, 2.85, 6], m.wood);
    box(court, [3.6, 0.12, 0.8], [-3.6, 0.9, -3.4], m.wood);
    for (const x of [-5, -2.2])
      for (const z of [-3.7, -3.1]) box(court, [0.12, 0.9, 0.12], [x, 0.45, z], m.wood);
    for (let i = 0; i < 5; i++) {
      const jar = potteryJar(m.clay);
      jar.position.set(-4.8 + i * 0.55, 0.98, -3.4);
      court.add(jar);
    }
    for (const [x, z, yaw] of [
      [-3.6, -2.1, Math.PI],
      [0, -0.5, -1],
    ]) {
      const person = qingmingCitizen(
        { robe: m.linen, skin: m.skin, hair: m.dark, trim: m.wood },
        2,
        false,
      );
      person.position.set(x!, 0, z!);
      person.rotation.y = yaw!;
      court.add(person);
    }
    const tree = sparseVillageTree(m, 6);
    tree.position.set(4.5, 0, -3.7);
    court.add(tree);
    // The last section is a connected inhabited quarter, not an isolated court:
    // cross alleys open toward the main street and workshop frontage behind it.
    const lanes = new THREE.Group();
    lanes.name = 'qingming-city-back-lanes';
    g.add(lanes);
    lane(
      lanes,
      [
        [62, -66],
        [79, -68],
        [95, -69],
        [104, -68],
      ],
      2.8,
      m.earth,
    );
    lane(
      lanes,
      [
        [99, -45],
        [100, -57],
        [102, -69],
        [103, -79],
      ],
      2.4,
      m.earth,
    );
    lane(
      lanes,
      [
        [125, -45],
        [127, -59],
        [126, -74],
        [123, -78],
      ],
      2.1,
      m.earth,
    );
    for (const [x, z] of [
      [68, -71],
      [88, -72],
    ]) {
      const work = roadsideShelter(m);
      work.name = 'qingming-city-workshop-awning';
      work.position.set(x!, 2.8, z!);
      work.scale.set(0.84, 0.84, 0.84);
      lanes.add(work);
    }
    for (const [x, z, yaw] of [
      [99.7, -63, -0.2],
      [117, -61, 1.2],
    ]) {
      const resident = qingmingCitizen(
        { robe: m.earth, skin: m.skin, hair: m.dark, trim: m.linen },
        5,
        false,
      );
      resident.position.set(x!, 2.8, z!);
      resident.rotation.y = yaw!;
      lanes.add(resident);
    }
    yield;
    g.userData.foci = QINGMING_SCROLL_FOCI;
    completed = true;
    return g;
  } finally {
    if (!completed) disposeObject(g);
  }
}
