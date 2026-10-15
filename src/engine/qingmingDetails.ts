import * as THREE from 'three';
import { curveRod, rod } from './modelGeometry';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);

/** Rings describe a clothed adult silhouette, with an elliptical torso and an uneven hem. */
function robeGeometry(detail: boolean): THREE.BufferGeometry {
  const rings = [
    [0.28, 0.265, 0.17],
    [0.38, 0.26, 0.16],
    [0.65, 0.225, 0.14],
    [0.92, 0.165, 0.12],
    [1.09, 0.18, 0.12],
    [1.29, 0.225, 0.135],
    [1.36, 0.14, 0.105],
    [1.4, 0.07, 0.065],
  ];
  if (!detail) {
    rings.splice(1, 1);
    rings.splice(2, 1);
    rings.splice(3, 1);
  }
  const sides = detail ? 12 : 8,
    points: number[] = [],
    indices: number[] = [];
  rings.forEach(([height, width, depth], row) => {
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const fold = 1 + Math.sin(a * 7 + 0.2) * (row < 3 ? 0.075 : 0.025);
      points.push(
        Math.cos(a) * width! * fold,
        height! + (row < 2 ? Math.sin(a * 3) * 0.022 : 0),
        Math.sin(a) * depth! * fold,
      );
      if (row < rings.length - 1 && i < sides) {
        const n = row * (sides + 1) + i;
        indices.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export interface CitizenMaterials {
  robe: THREE.Material;
  skin: THREE.Material;
  hair: THREE.Material;
  trim: THREE.Material;
}
export interface CitizenPose {
  leftWrist: Point;
  rightWrist: Point;
}

export function qingmingCitizen(
  materials: CitizenMaterials,
  variant: number,
  detail: boolean,
  pose?: CitizenPose,
): THREE.Group {
  const g = new THREE.Group(),
    { robe, skin, hair, trim } = materials;
  const ellipsoid = (p: Point, scale: Point, material: THREE.Material, segments = 8) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, detail ? 7 : 5), material);
    mesh.position.set(...p);
    mesh.scale.set(...scale);
    g.add(mesh);
    return mesh;
  };
  g.add(new THREE.Mesh(robeGeometry(detail), robe));
  if (!detail) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 4), skin);
    head.position.set(0, 1.575, 0.015);
    head.scale.set(0.112, 0.145, 0.105);
    g.add(head);
    rod(g, v([0, 1.38, 0]), v([0, 1.48, 0]), 0.06, skin, 1, 5);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2),
      hair,
    );
    cap.scale.set(0.12, 0.08, 0.11);
    cap.position.set(0, 1.65, 0);
    g.add(cap);
    rod(g, v([-0.07, 1.39, 0.09]), v([0.09, 1.18, 0.13]), 0.016, trim, 1, 3);
    for (const side of [-1, 1]) {
      const wrist: Point = [side * 0.3, variant % 4 === 0 ? 1.23 : 0.88, 0.17];
      rod(g, v([side * 0.19, 1.29, 0]), v(wrist), 0.09, robe, 1.25, 5);
      rod(g, v(wrist), v([wrist[0], wrist[1] - 0.07, wrist[2]]), 0.045, skin, 0.7, 5);
      rod(g, v([side * 0.1, 0.33, 0]), v([side * 0.1, 0.06, side * 0.05]), 0.06, trim, 0.75, 5);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 3), hair);
      shoe.scale.set(0.07, 0.05, 0.13);
      shoe.position.set(side * 0.1, 0.05, 0.05 + side * 0.05);
      g.add(shoe);
    }
    return g;
  }
  rod(g, v([0, 1.36, 0]), v([0, 1.48, 0]), 0.06, skin, 0.9, 6);
  const head = ellipsoid([0, 1.575, 0.015], [0.112, 0.145, 0.105], skin, detail ? 12 : 8);
  head.rotation.z = Math.sin(variant * 2.3) * 0.07;
  // Cloth cap or bound hair, never a rectangular hat balanced on a spherical head.
  if (variant % 3 === 0) {
    ellipsoid([0, 1.66, -0.018], [0.115, 0.085, 0.103], hair);
    ellipsoid([0, 1.735, -0.035], [0.045, 0.045, 0.044], hair);
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      hair,
    );
    cap.scale.set(0.124, 0.083, 0.117);
    cap.position.set(0, 1.645, 0.005);
    g.add(cap);
    if (variant % 3 === 1)
      curveRod(
        g,
        [v([-0.08, 1.65, -0.09]), v([-0.1, 1.59, -0.12]), v([-0.12, 1.49, -0.11])],
        0.025,
        hair,
        4,
      );
  }
  if (detail) {
    ellipsoid([0, 1.58, 0.117], [0.025, 0.037, 0.025], skin, 6);
    for (const s of [-1, 1]) {
      ellipsoid([s * 0.11, 1.57, 0.005], [0.021, 0.038, 0.022], skin, 6);
      rod(g, v([s * 0.061, 1.61, 0.105]), v([s * 0.028, 1.615, 0.113]), 0.006, hair, 1, 4);
    }
  }
  // Overlapping collar, belt and restrained garment folds.
  curveRod(
    g,
    [v([-0.075, 1.4, 0.07]), v([0.035, 1.25, 0.14]), v([0.13, 1.11, 0.105])],
    0.018,
    trim,
    5,
  );
  rod(g, v([0.075, 1.39, 0.075]), v([-0.045, 1.25, 0.135]), 0.016, trim, 1, 4);
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.173, 0.174, 0.038, detail ? 14 : 10),
    trim,
  );
  belt.scale.z = 0.72;
  belt.position.y = 0.94;
  g.add(belt);
  if (detail)
    for (let i = -2; i <= 2; i++)
      curveRod(
        g,
        [v([i * 0.05, 0.9, 0.116]), v([i * 0.074, 0.6, 0.146]), v([i * 0.093, 0.31, 0.158])],
        0.005,
        trim,
        4,
      );
  for (const s of [-1, 1]) {
    const carrying = variant % 7 === 0;
    const gesture = !carrying && (variant + (s > 0 ? 1 : 0)) % 4 === 0;
    const elbow: Point = [s * 0.31, carrying ? 1.21 : gesture ? 1.1 : 1.02, carrying ? 0.04 : 0.08];
    const wrist: Point = pose
      ? s < 0
        ? pose.leftWrist
        : pose.rightWrist
      : [
          s * (gesture ? 0.42 : 0.29),
          carrying ? 1.43 : gesture ? 1.25 : 0.84,
          carrying ? 0.02 : gesture ? 0.3 : 0.15,
        ];
    rod(g, v([s * 0.19, 1.29, 0]), v(elbow), 0.105, robe, 1.04, detail ? 8 : 6);
    rod(g, v(elbow), v(wrist), 0.112, robe, 1.12, detail ? 8 : 6);
    const hand = v(wrist).add(
      new THREE.Vector3(0, pose ? -0.055 : gesture || carrying ? 0.04 : -0.055, 0.025),
    );
    ellipsoid([hand.x, hand.y, hand.z], [0.045, 0.068, 0.035], skin, 6);
    const step = s * Math.sin(variant * 1.7) * 0.1;
    rod(g, v([s * 0.105, 0.34, 0]), v([s * 0.11, 0.07, step]), 0.065, trim, 0.7, 6);
    ellipsoid([s * 0.11, 0.055, step + 0.045], [0.072, 0.05, 0.14], hair, 8);
  }
  return g;
}

/** A thin draped textile with a hanging scalloped front edge. */
export function clothCanopy(width: number, depth: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, depth, 16, 8);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getY(i),
      t = (z + depth / 2) / depth;
    p.setXYZ(
      i,
      x,
      -Math.sin((x / width + 0.5) * Math.PI) * 0.1 - t * 0.13 + Math.sin(x * 15) * 0.025 * t,
      z,
    );
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

export function wovenBasket(radius: number, height: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  // Open cavity with a thick lip, horizontal weft and visible vertical stakes.
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.74, height, 12, 1, true),
    material,
  );
  shell.position.y = height / 2;
  g.add(shell);
  for (let row = 0; row <= 5; row++) {
    const y = (height * row) / 5,
      r = radius * (0.74 + (row / 5) * 0.26);
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(r, row === 5 ? 0.022 : 0.01, 3, 12),
      material,
    );
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    g.add(hoop);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    rod(
      g,
      v([Math.cos(a) * radius * 0.74, 0, Math.sin(a) * radius * 0.74]),
      v([Math.cos(a) * radius, height, Math.sin(a) * radius]),
      0.009,
      material,
      1,
      3,
    );
  }
  return g;
}

export function potteryJar(material: THREE.Material): THREE.Mesh {
  const profile = [
    [0, 0],
    [0.11, 0],
    [0.15, 0.07],
    [0.17, 0.2],
    [0.12, 0.29],
    [0.075, 0.31],
    [0.08, 0.35],
    [0.065, 0.35],
    [0.06, 0.32],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  return new THREE.Mesh(new THREE.LatheGeometry(profile, 12), material);
}

export interface PassageBoatMaterials {
  timber: THREE.Material;
  dark: THREE.Material;
  cloth: THREE.Material;
  robe: THREE.Material;
  skin: THREE.Material;
}

/** A fixed, lowered-rig passage scene. Specific ship fittings remain interpretive. */
export function qingmingPassageBoat(materials: PassageBoatMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-bridge-passage-boat';
  const { timber, dark, cloth, robe, skin } = materials;
  const box = (name: string, size: Point, at: Point, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...at);
    group.add(mesh);
    return mesh;
  };
  // Wide, working cargo hull with a continuous sheer and a shallow physical draft.
  const hullGeometry = new THREE.SphereGeometry(
    1,
    28,
    10,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  const hull = new THREE.Mesh(hullGeometry, timber);
  hull.name = 'passage-hull';
  hull.scale.set(6.4, 0.68, 1.4);
  hull.position.y = 0.18;
  group.add(hull);
  for (let i = 0; i < 9; i++) {
    const z = (i - 4) * 0.27;
    const length = Math.min(9.8, 12.8 * Math.sqrt(1 - ((Math.abs(z) + 0.13) / 1.4) ** 2) * 0.94);
    box('passage-deck-plank', [length, 0.1, 0.26], [0, 0.22, z], timber);
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Group();
    rail.name = 'passage-gunwale';
    group.add(rail);
    curveRod(
      rail,
      [
        v([-6.3, 0.22, 0]),
        v([-4, 0.24, side * 1.18]),
        v([0, 0.27, side * 1.4]),
        v([4, 0.34, side * 1.14]),
        v([6.3, 0.5, 0]),
      ],
      0.07,
      dark,
      22,
    );
    // Inside hull frames sit below the deck rather than crossing the workers' feet.
    for (let i = -4; i <= 4; i += 2)
      rod(group, v([i, -0.22, side * 0.65]), v([i, 0.21, side * 1.1]), 0.045, dark, 1, 5);
  }
  box('mast-step', [0.55, 0.16, 0.55], [-1, 0.35, 0], dark);
  for (const side of [-1, 1])
    box('mast-cheek', [0.18, 0.42, 0.12], [-1, 0.57, side * 0.21], timber);
  rod(group, v([-1, 0.64, -0.31]), v([-1, 0.64, 0.31]), 0.055, dark, 1, 6).name = 'mast-pivot';
  const rig = new THREE.Group();
  rig.name = 'lowered-mast-and-furled-yard';
  group.add(rig);
  rod(rig, v([-1, 0.64, 0]), v([5.35, 1.22, 0]), 0.085, timber, 0.6, 9).name = 'lowered-mast';
  rod(rig, v([-0.4, 0.69, 0.15]), v([4.7, 1.155, 0.15]), 0.14, cloth, 0.8, 10).name = 'furled-sail';
  rod(rig, v([-0.75, 0.68, -0.12]), v([4.95, 1.2, -0.12]), 0.045, dark, 1, 6).name = 'lowered-yard';
  // Short lashings actually wrap around the lowered spar and the bundled sail.
  for (let i = 0; i < 8; i++) {
    const x = -0.15 + i * 0.64,
      y = 0.715 + (x + 0.15) * 0.091;
    const binding = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 3, 10), dark);
    binding.name = 'sail-binding';
    binding.rotation.y = Math.PI / 2;
    binding.rotation.z = 0.091;
    binding.position.set(x, y, 0.08);
    rig.add(binding);
  }
  for (const x of [1.8, 4.5]) {
    const y = 0.64 + (x + 1) * 0.091;
    rod(group, v([x, 0.27, -0.34]), v([x, y - 0.06, 0]), 0.055, timber, 1, 5);
    rod(group, v([x, 0.27, 0.34]), v([x, y - 0.06, 0]), 0.055, timber, 1, 5);
  }
  const wristPose: CitizenPose = { leftWrist: [-0.22, 1.08, 0.34], rightWrist: [0.22, 1.08, 0.34] };
  // Two crew share the lowering lines. A third steadies the spar from its side.
  for (let i = 0; i < 3; i++) {
    const worker = qingmingCitizen(
      { robe: i === 1 ? cloth : robe, skin, hair: dark, trim: dark },
      i + 2,
      true,
      wristPose,
    );
    worker.name = `passage-crew-${i + 1}`;
    worker.position.set(i < 2 ? -3.25 : 2.7, 0.27, i === 0 ? -0.65 : i === 1 ? 0.65 : 0.82);
    worker.rotation.y = i < 2 ? Math.PI / 2 : -Math.PI / 2;
    group.add(worker);
    worker.updateMatrix();
    for (const [handIndex, wrist] of [wristPose.leftWrist, wristPose.rightWrist].entries()) {
      const hand = v(wrist)
        .add(new THREE.Vector3(0, -0.055, 0.025))
        .applyMatrix4(worker.matrix);
      const anchor =
        i < 2
          ? v([4.5, 1.14, (i === 0 ? -1 : 1) * 0.12])
          : v([2.2, 0.94, handIndex ? 0.19 : -0.07]);
      const rope = new THREE.Group();
      rope.name = 'crew-handling-line';
      group.add(rope);
      const middle = hand.clone().lerp(anchor, 0.5);
      middle.y -= 0.06;
      curveRod(rope, [hand, middle, anchor], 0.012, dark, 6);
    }
  }
  // Coil beside the step; all rope remains inside the gunwales.
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16 + i * 0.035, 0.012, 3, 14), dark);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(-1.7, 0.29, -0.68);
    coil.name = 'handling-line-coil';
    group.add(coil);
  }
  group.userData.deckHeight = 0.27;
  group.userData.pose = 'fixed-lowered-rig';
  return group;
}
