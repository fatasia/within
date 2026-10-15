import * as THREE from 'three';
import { curveRod, rod } from './modelGeometry';
import { qingmingCitizen, wovenBasket } from './qingmingDetails';

type Point = [number, number, number];
const v = (point: Point) => new THREE.Vector3(...point);
export interface StreetMaterials {
  wood: THREE.Material;
  dark: THREE.Material;
  linen: THREE.Material;
  earth: THREE.Material;
  stone: THREE.Material;
  blue: THREE.Material;
  clay: THREE.Material;
  skin: THREE.Material;
}
const box = (group: THREE.Group, size: Point, point: Point, material: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...point);
  group.add(mesh);
  return mesh;
};

/** An earthen wall tapers inward; thin lift lines are distinct from gate brick joints. */
export function rammedWallSegment(materials: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rammed-earth-wall';
  const geometry = new THREE.BoxGeometry(5.5, 7.2, 12.2);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 3.6;
    p.setXYZ(i, p.getX(i) * (1 - (y / 7.2) * 0.22), y, p.getZ(i));
  }
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, materials.earth));
  for (let row = 1; row < 14; row++)
    for (const side of [-1, 1]) {
      const y = row * 0.5,
        x = side * (2.75 * (1 - (y / 7.2) * 0.22) + 0.012);
      box(group, [0.028, 0.036, 12.1], [x, y, 0], materials.clay);
    }
  box(group, [4.35, 0.14, 12.25], [0, 7.2, 0], materials.clay);
  return group;
}

function huanmen(materials: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'wine-shop-huanmen';
  // Light timber and tied cloth, not a monumental tile-roofed palace gateway.
  for (const side of [-1, 1])
    for (const depth of [-0.3, 0.3]) {
      rod(
        group,
        v([side * 2.7, 0, depth]),
        v([side * 2.7, 3.65, depth]),
        0.1,
        materials.wood,
        1,
        7,
      );
      box(group, [0.43, 0.16, 0.43], [side * 2.7, 0.08, depth], materials.stone);
      rod(
        group,
        v([side * 2.7, 2.7, depth]),
        v([side * 2.1, 3.5, depth]),
        0.055,
        materials.wood,
        1,
        5,
      );
    }
  for (const y of [2.85, 3.5]) box(group, [5.7, 0.13, 0.16], [0, y, 0], materials.wood);
  curveRod(
    group,
    [v([-2.8, 3.5, 0]), v([-1.7, 4.05, 0]), v([0, 4.65, 0]), v([1.7, 4.05, 0]), v([2.8, 3.5, 0])],
    0.085,
    materials.wood,
    18,
  );
  for (const side of [-1, 1]) {
    curveRod(
      group,
      [
        v([side * 2.6, 3.5, 0.05]),
        v([side * 1.8, 4.2, 0.05]),
        v([side * 0.5, 3.78, 0.05]),
        v([0, 4.62, 0.05]),
      ],
      0.08,
      materials.linen,
      18,
    );
    curveRod(
      group,
      [
        v([side * 2.6, 3.48, 0.11]),
        v([side * 1.9, 3.95, 0.11]),
        v([side * 0.6, 3.55, 0.11]),
        v([0, 4.5, 0.11]),
      ],
      0.045,
      materials.clay,
      18,
    );
    for (let j = 0; j < 6; j++)
      box(
        group,
        [0.09, 0.36 + (j % 2) * 0.12, 0.035],
        [side * (0.45 + j * 0.34), 3.4, 0.08],
        j % 2 ? materials.linen : materials.clay,
      );
    for (let y = 0.65; y < 3.5; y += 0.42) {
      const binding = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 3, 10), materials.linen);
      binding.rotation.x = Math.PI / 2;
      binding.position.set(side * 2.7, y, 0.3);
      group.add(binding);
    }
  }
  return group;
}

function servingCounter(materials: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'counter-serving-interaction';
  box(group, [1.8, 0.09, 0.65], [0, 0.9, 0.8], materials.wood);
  for (const x of [-0.7, 0.7])
    for (const z of [0.56, 1.04]) box(group, [0.09, 0.86, 0.09], [x, 0.43, z], materials.wood);
  const seller = qingmingCitizen(
    { robe: materials.blue, skin: materials.skin, hair: materials.dark, trim: materials.linen },
    2,
    true,
    { leftWrist: [-0.3, 1.01, 0.5], rightWrist: [0.2, 1.04, 0.62] },
  );
  seller.name = 'server';
  group.add(seller);
  const patron = qingmingCitizen(
    { robe: materials.linen, skin: materials.skin, hair: materials.dark, trim: materials.wood },
    3,
    true,
    { leftWrist: [-0.18, 1.04, 0.45], rightWrist: [0.3, 1.04, 0.69] },
  );
  patron.position.set(0.5, 0, 1.4);
  patron.rotation.y = Math.PI;
  patron.name = 'patron';
  group.add(patron);
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.02, 0],
        [0.09, 0.025],
        [0.11, 0.075],
        [0.095, 0.075],
        [0.075, 0.035],
        [0.025, 0.02],
      ].map(([r, y]) => new THREE.Vector2(r!, y!)),
      12,
    ),
    materials.clay,
  );
  bowl.name = 'shared-bowl';
  bowl.position.set(0.2, 0.96, 0.67);
  group.add(bowl);
  for (let j = 0; j < 3; j++) {
    const saucer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.11, 0.025, 12),
      materials.clay,
    );
    saucer.position.set(-0.46, 0.97 + j * 0.027, 0.82);
    group.add(saucer);
  }
  const basket = wovenBasket(0.23, 0.34, materials.linen);
  basket.position.set(-0.9, 0, 0.25);
  group.add(basket);
  return group;
}

/** One donkey-drawn load approaches the gate; exact vehicle classification is unverified. */
function gateTransport(materials: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'gate-donkey-cart';
  const body = (at: Point, scale: Point, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), material);
    mesh.position.set(...at);
    mesh.scale.set(...scale);
    group.add(mesh);
    return mesh;
  };
  box(group, [2.8, 0.16, 1.45], [0, 0.96, 0], materials.wood);
  for (let j = 0; j < 9; j++)
    box(group, [0.27, 0.06, 1.4], [-1.2 + j * 0.3, 1.08, 0], materials.linen);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.075, 5, 20), materials.dark);
    wheel.position.set(0, 0.8, side * 0.9);
    group.add(wheel);
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      rod(
        group,
        v([0, 0.8, side * 0.9]),
        v([Math.cos(a) * 0.69, 0.8 + Math.sin(a) * 0.69, side * 0.9]),
        0.025,
        materials.wood,
        1,
        4,
      );
    }
    rod(group, v([0, 0.9, side * 0.5]), v([3.9, 1.05, side * 0.42]), 0.055, materials.wood, 1, 6);
    curveRod(
      group,
      [v([3.9, 1.05, side * 0.42]), v([4.0, 1.04, side * 0.35]), v([4.2, 0.97, side * 0.25])],
      0.032,
      materials.dark,
      5,
    );
    box(group, [2.8, 0.15, 0.08], [0, 1.35, side * 0.7], materials.wood);
    for (let j = 0; j < 5; j++)
      box(group, [0.06, 0.3, 0.06], [-1.2 + j * 0.6, 1.2, side * 0.7], materials.wood);
  }
  rod(group, v([0, 0.8, -1]), v([0, 0.8, 1]), 0.09, materials.wood, 1, 6);
  for (let j = 0; j < 4; j++) {
    body(
      [-0.85 + (j % 2) * 1.15, 1.32, Math.floor(j / 2) * 0.55 - 0.27],
      [0.48, 0.23, 0.27],
      materials.linen,
    ).userData.livingPart = 'load';
    curveRod(
      group,
      [
        v([-0.85 + (j % 2) * 1.15, 1.1, Math.floor(j / 2) * 0.55 - 0.55]),
        v([-0.85 + (j % 2) * 1.15, 1.57, Math.floor(j / 2) * 0.55 - 0.27]),
        v([-0.85 + (j % 2) * 1.15, 1.1, Math.floor(j / 2) * 0.55 + 0.02]),
      ],
      0.018,
      materials.dark,
      6,
    );
  }
  const animalX = 3.8;
  body([animalX, 1.2, 0], [0.98, 0.43, 0.34], materials.clay).name = 'donkey-body';
  body([animalX + 0.76, 1.6, 0], [0.24, 0.54, 0.25], materials.clay).rotation.z = -0.35;
  body([animalX + 1.02, 1.96, 0], [0.36, 0.2, 0.19], materials.clay);
  body([animalX + 1.3, 1.86, 0], [0.22, 0.14, 0.15], materials.linen);
  for (const side of [-1, 1]) {
    const ear = body([animalX + 0.9, 2.27, side * 0.1], [0.065, 0.3, 0.06], materials.clay);
    ear.rotation.z = -0.1;
    ear.userData.livingPart = 'ear';
    body([animalX + 1.1, 2.0, side * 0.18], [0.025, 0.026, 0.014], materials.dark);
    for (const fore of [-1, 1]) {
      const x = animalX + fore * 0.58,
        knee = x + fore * 0.06;
      rod(
        group,
        v([x, 1.14, side * 0.23]),
        v([knee, 0.58, side * 0.27]),
        0.085,
        materials.clay,
        0.65,
        7,
      );
      rod(
        group,
        v([knee, 0.58, side * 0.27]),
        v([x + 0.1, 0.12, side * 0.27]),
        0.05,
        materials.clay,
        0.8,
        6,
      );
      body([x + 0.12, 0.08, side * 0.27], [0.1, 0.08, 0.075], materials.dark);
    }
    curveRod(
      group,
      [
        v([animalX + 0.62, 1.75, side * 0.23]),
        v([animalX + 0.65, 1.08, side * 0.35]),
        v([animalX + 0.4, 0.97, side * 0.25]),
      ],
      0.04,
      materials.dark,
      8,
    );
  }
  const tail = curveRod(
    group,
    [v([animalX - 0.92, 1.25, 0]), v([animalX - 1.2, 0.95, 0.08]), v([animalX - 1.22, 0.6, 0.12])],
    0.035,
    materials.dark,
    8,
  );
  tail.userData.livingPart = 'tail';
  curveRod(
    group,
    [v([animalX + 0.8, 2.03, -0.17]), v([animalX + 1.37, 1.89, 0]), v([animalX + 0.8, 2.03, 0.17])],
    0.023,
    materials.dark,
    8,
  );
  const handler = qingmingCitizen(
    { robe: materials.blue, skin: materials.skin, hair: materials.dark, trim: materials.linen },
    4,
    true,
    { leftWrist: [-0.23, 1.05, 0.3], rightWrist: [0.23, 1.1, 0.3] },
  );
  handler.name = 'donkey-handler';
  handler.userData.livingPart = 'handler';
  handler.position.set(5.8, 0, 1.1);
  handler.rotation.y = -Math.PI / 2;
  group.add(handler);
  handler.updateMatrix();
  const hand = v([0.23, 1.045, 0.325]).applyMatrix4(handler.matrix);
  const lead = curveRod(
    group,
    [v([animalX + 1.28, 1.89, 0.12]), v([5.5, 1.3, 0.55]), hand],
    0.014,
    materials.dark,
    10,
  );
  lead.userData.livingPart = 'lead';
  return group;
}

export function buildQingmingEpisodes(materials: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-street-episodes';
  const entry = huanmen(materials);
  entry.position.set(84.4, 2.8, -48.2);
  group.add(entry);
  const counter = servingCounter(materials);
  counter.position.set(76.1, 2.8, -49.5);
  group.add(counter);
  const transport = gateTransport(materials);
  transport.position.set(43, 2.8, -45.2);
  group.add(transport);
  return group;
}
