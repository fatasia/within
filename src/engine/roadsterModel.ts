import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface RoadsterModel {
  group: THREE.Group;
  wheels: THREE.Group[];
  frontWheels: THREE.Group[];
  paint: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  wing: THREE.Group;
  steering: THREE.Group;
}
type P = [number, number, number];
const V = (p: P) => new THREE.Vector3(...p);
function panel(points: P[], material: THREE.Material, indices?: number[]): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const ix = indices ?? points.slice(2).flatMap((_, i) => [0, i + 1, i + 2]);
  g.setIndex(ix);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}
function tube(points: P[], r: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(V)),
      Math.max(8, points.length * 4),
      r,
      6,
      false,
    ),
    mat,
  );
}
function box(size: P, pos: P, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  m.position.set(...pos);
  return m;
}

/** Fine strips follow each wheel opening; no long fan triangle crosses a non-planar side skin. */
export function roadsterBodySide(side: number): THREE.BufferGeometry {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [],
    columns = 144,
    rows = 8;
  for (let i = 0; i <= columns; i++) {
    const z = THREE.MathUtils.lerp(-2.23, 2.19, i / columns),
      top = bodyProfile(z).outerY;
    let bottom = 0.225;
    for (const axle of [-1.43, 1.43]) {
      const dz = z - axle;
      if (Math.abs(dz) < 0.431) bottom = Math.max(bottom, 0.37 + Math.sqrt(0.431 ** 2 - dz ** 2));
    }
    for (let j = 0; j <= rows; j++) {
      const v = j / rows,
        y = THREE.MathUtils.lerp(bottom, top, v),
        width = bodyProfile(z).outerX;
      const x = side * (width - 0.027 * (1 - v) + Math.sin(v * Math.PI) * 0.012);
      positions.push(x, y, z);
      uv.push(i / columns, v);
      if (i < columns && j < rows) {
        const a = i * (rows + 1) + j;
        indices.push(a, a + 1, a + rows + 1, a + 1, a + rows + 2, a + rows + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function bodyProfile(z: number): {
  outerX: number;
  outerY: number;
  innerX: number;
  innerY: number;
} {
  const sections = [
    [-2.23, 0.9, 0.59, 0.84, 0.59],
    [-1.9, 0.965, 0.75, 0.84, 0.68],
    [-1.65, 1.005, 0.866, 0.84, 0.75],
    [-1.18, 1.003, 0.9, 0.83, 0.88],
    [-0.95, 0.992, 0.914, 0.835, 0.908],
    [0.2, 0.98, 0.936, 0.83, 0.948],
    [0.7, 1.0, 0.976, 0.825, 0.974],
    [1.03, 1.015, 1.016, 0.825, 1.005],
    [1.43, 1.03, 1.028, 0.79, 1.005],
    [1.75, 1.0, 1.004, 0.845, 0.977],
    [2.19, 0.9, 0.94, 0.89, 0.94],
  ];
  let i = 0;
  while (i < sections.length - 2 && z > sections[i + 1]![0]!) i++;
  const a = sections[i]!,
    b = sections[i + 1]!,
    t = THREE.MathUtils.clamp((z - a[0]!) / (b[0]! - a[0]!), 0, 1);
  return {
    outerX: THREE.MathUtils.lerp(a[1]!, b[1]!, t),
    outerY: THREE.MathUtils.lerp(a[2]!, b[2]!, t),
    innerX: THREE.MathUtils.lerp(a[3]!, b[3]!, t),
    innerY: THREE.MathUtils.lerp(a[4]!, b[4]!, t),
  };
}

function shoulderGeometry(side: number): THREE.BufferGeometry {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [],
    columns = 100,
    rows = 6;
  for (let i = 0; i <= columns; i++) {
    const z = THREE.MathUtils.lerp(-2.23, 2.19, i / columns),
      p = bodyProfile(z);
    for (let j = 0; j <= rows; j++) {
      const t = j / rows;
      positions.push(
        side * THREE.MathUtils.lerp(p.innerX, p.outerX, t),
        THREE.MathUtils.lerp(p.innerY, p.outerY, t) + Math.sin(t * Math.PI) * 0.008,
        z,
      );
      uv.push(t, i / columns);
      if (i < columns && j < rows) {
        const a = i * (rows + 1) + j;
        indices.push(a, a + 1, a + rows + 1, a + 1, a + rows + 2, a + rows + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
/** New angular 2026 exterior reconstructed from user-supplied official four-view images; not CAD. Nose is -Z. */
export function buildRoadsterModel(): RoadsterModel {
  const group = new THREE.Group();
  group.name = 'Roadster 2026 · reference-built';
  const paint = new THREE.MeshPhysicalMaterial({
    color: '#c4c7cc',
    metalness: 0.82,
    roughness: 0.13,
    clearcoat: 1,
    clearcoatRoughness: 0.055,
    side: THREE.DoubleSide,
  });
  const black = new THREE.MeshStandardMaterial({
    color: '#101316',
    roughness: 0.45,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const carbon = new THREE.MeshStandardMaterial({
    color: '#171a1e',
    roughness: 0.4,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#424850',
    metalness: 0.3,
    roughness: 0.12,
    transparent: true,
    opacity: 0.94,
    clearcoat: 1,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: '#abb1b9',
    metalness: 0.95,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });
  const white = new THREE.MeshStandardMaterial({ color: '#d6d5ce', roughness: 0.8 });
  const led = new THREE.MeshStandardMaterial({
    color: '#d8eeff',
    emissive: '#c6e3ff',
    emissiveIntensity: 2.3,
  });
  const red = new THREE.MeshStandardMaterial({
    color: '#a40013',
    emissive: '#fc102a',
    emissiveIntensity: 1.5,
  });
  const amber = new THREE.MeshStandardMaterial({
    color: '#ff9c2f',
    emissive: '#ff7a0a',
    emissiveIntensity: 0.5,
  });
  // The side panels are true cut-out silhouettes: wheels do not overlap a solid body box.
  for (const side of [-1, 1]) {
    const skin = new THREE.Mesh(roadsterBodySide(side), paint);
    skin.name = `body-side-${side}`;
    group.add(skin);
    const shoulder = new THREE.Mesh(shoulderGeometry(side), paint);
    shoulder.name = `continuous-shoulder-${side}`;
    group.add(shoulder);
    for (const axle of [-1.43, 1.43]) {
      const arch: P[] = [];
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI;
        const z = axle + Math.cos(a) * 0.431;
        arch.push([side * (bodyProfile(z).outerX + 0.002), 0.37 + Math.sin(a) * 0.431, z]);
      }
      group.add(tube(arch, 0.008, paint));
      // A recessed wheel well blocks the old bright slit through the body.
      const wellPositions: number[] = [],
        wellIndices: number[] = [];
      for (let i = 0; i <= 48; i++) {
        const angle = (i / 48) * Math.PI;
        const z = axle + Math.cos(angle) * 0.428,
          y = 0.37 + Math.sin(angle) * 0.428;
        // The inner edge stays outside the broad hood; a full-width cylinder pierced it.
        wellPositions.push(side * 0.87, y, z, side * (bodyProfile(z).outerX - 0.006), y, z);
        if (i < 48) {
          const a = i * 2;
          wellIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const wellGeometry = new THREE.BufferGeometry();
      wellGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wellPositions, 3));
      wellGeometry.setIndex(wellIndices);
      wellGeometry.computeVertexNormals();
      group.add(new THREE.Mesh(wellGeometry, black));
    }
    group.add(box([0.09, 0.095, 2.05], [side * 0.98, 0.19, 0], carbon));
    // Door shut line, flush pull and small fender indicator.
    group.add(
      tube(
        [
          [side * 1.017, 0.86, -0.95],
          [side * 1.017, 0.7, -0.91],
          [side * 1.017, 0.24, -0.74],
        ],
        0.005,
        black,
      ),
    );
    group.add(
      tube(
        [
          [side * 1.017, 0.93, 0.48],
          [side * 1.017, 0.62, 0.41],
          [side * 1.017, 0.24, 0.32],
        ],
        0.005,
        black,
      ),
    );
    group.add(box([0.012, 0.018, 0.14], [side * 1.018, 0.82, 0.34], black));
    group.add(box([0.014, 0.026, 0.18], [side * 1.018, 0.78, -1.02], black));
    group.add(box([0.016, 0.012, 0.055], [side * 1.027, 0.78, -1.08], amber));
    // Slim painted A-pillar, black roof rail and pointed side glazing.
    group.add(
      panel(
        [
          [side * 0.83, 0.9, -1.2],
          [side * 0.7, 1.25, -0.27],
          [side * 0.714, 1.215, -0.23],
          [side * 0.85, 0.926, -1.08],
        ],
        paint,
      ),
    );
    group.add(
      panel(
        [
          [side * 0.7, 1.24, 0.52],
          [side * 0.83, 0.99, 1.15],
          [side * 0.831, 1.005, 0.97],
          [side * 0.717, 1.205, 0.48],
        ],
        paint,
      ),
    );
    group.add(
      panel(
        [
          [side * 0.843, 0.926, -1.08],
          [side * 0.713, 1.215, -0.23],
          [side * 0.717, 1.205, 0.48],
          [side * 0.831, 1.005, 0.97],
          [side * 0.855, 0.96, 0.7],
        ],
        glass,
      ),
    );
    // Close the sail panel between the small side window and sloped rear glazing.
    group.add(
      panel(
        [
          [side * 0.7, 1.24, 0.52],
          [side * 0.69, 1.23, 0.56],
          [side * 0.79, 1.005, 1.41],
          [side * 0.85, 1.005, 1.43],
          [side * 0.83, 0.99, 1.15],
        ],
        paint,
      ),
    );
    group.add(
      tube(
        [
          [side * 0.853, 0.94, -1.04],
          [side * 0.725, 1.21, -0.23],
        ],
        0.012,
        black,
      ),
    );
    group.add(
      tube(
        [
          [side * 0.846, 0.97, 0.41],
          [side * 0.717, 1.21, 0.48],
        ],
        0.008,
        black,
      ),
    );
    group.add(
      tube(
        [
          [side * 0.714, 1.232, -0.26],
          [side * 0.713, 1.232, 0.24],
          [side * 0.726, 1.214, 0.54],
          [side * 0.832, 1.0, 1.0],
        ],
        0.012,
        paint,
      ),
    );
  }
  // Faceted hood: broad clean centre and narrow raised wings, straight front light edge.
  group.add(
    panel(
      [
        [-0.84, 0.59, -2.23],
        [0.84, 0.59, -2.23],
        [0.83, 0.88, -1.18],
        [-0.83, 0.88, -1.18],
      ],
      paint,
    ),
  );
  group.add(
    tube(
      [
        [-0.84, 0.595, -2.235],
        [0, 0.596, -2.25],
        [0.84, 0.595, -2.235],
      ],
      0.009,
      led,
    ),
  );
  group.add(
    panel(
      [
        [-0.9, 0.57, -2.225],
        [0.9, 0.57, -2.225],
        [0.91, 0.24, -2.24],
        [-0.91, 0.24, -2.24],
      ],
      black,
    ),
  );
  group.add(
    panel(
      [
        [-0.94, 0.24, -2.25],
        [0.94, 0.24, -2.25],
        [0.91, 0.16, -2.3],
        [-0.91, 0.16, -2.3],
      ],
      carbon,
    ),
  );
  // Splitter intake has real inset mouth and vertical aero vanes, no fake radiator grille.
  group.add(box([1.48, 0.13, 0.04], [0, 0.29, -2.18], black));
  for (const x of [-0.65, -0.35, 0.35, 0.65])
    group.add(box([0.025, 0.14, 0.19], [x, 0.27, -2.17], carbon));
  // Continuous black windshield and roof, bounded by the silver shoulder rails.
  group.add(
    panel(
      [
        [-0.825, 0.902, -1.19],
        [0.825, 0.902, -1.19],
        [0.69, 1.245, -0.27],
        [-0.69, 1.245, -0.27],
      ],
      glass,
    ),
  );
  group.add(
    panel(
      [
        [-0.69, 1.245, -0.27],
        [0.69, 1.245, -0.27],
        [0.69, 1.23, 0.56],
        [-0.69, 1.23, 0.56],
      ],
      glass,
    ),
  );
  group.add(
    panel(
      [
        [-0.69, 1.23, 0.56],
        [0.69, 1.23, 0.56],
        [0.79, 1.005, 1.41],
        [-0.79, 1.005, 1.41],
      ],
      glass,
    ),
  );
  group.add(
    panel(
      [
        [-0.79, 1.005, 1.41],
        [0.79, 1.005, 1.41],
        [0.9, 0.94, 2.19],
        [-0.9, 0.94, 2.19],
      ],
      paint,
    ),
  );
  group.add(box([1.8, 0.12, 0.055], [0, 0.85, 2.19], black));
  group.add(box([1.74, 0.012, 0.065], [0, 0.86, 2.226], red));
  group.add(
    panel(
      [
        [-0.9, 0.78, 2.2],
        [0.9, 0.78, 2.2],
        [0.76, 0.27, 2.05],
        [-0.76, 0.27, 2.05],
      ],
      carbon,
    ),
  );
  const wing = new THREE.Group();
  wing.position.set(0, 0.95, 2.08);
  wing.name = 'active-rear-aero';
  wing.add(box([1.73, 0.035, 0.19], [0, 0, 0], paint));
  group.add(wing);
  for (const x of [-0.62, -0.31, 0, 0.31, 0.62])
    group.add(box([0.018, 0.19, 0.5], [x, 0.2, 1.94], carbon));
  const plate = box([0.28, 0.12, 0.012], [0, 0.62, 2.206], chrome);
  plate.rotation.x = 0.25;
  group.add(plate);
  // Rear cold-gas outlets and central fan housing are visible hardware, not exhaust flames.
  for (const x of [-0.58, 0.58]) {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.09, 0.13, 18, 1, true),
      chrome,
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(x, 0.39, 2.15);
    group.add(nozzle);
  }
  group.add(box([0.68, 0.21, 0.09], [0, 0.34, 2.1], black));
  for (let i = 0; i < 8; i++)
    group.add(box([0.018, 0.18, 0.025], [-0.27 + i * 0.078, 0.34, 2.16], carbon));
  group.add(box([1.46, 0.06, 3.5], [0, 0.17, 0], black));
  for (const side of [-1, 1]) {
    group.add(box([0.07, 0.48, 1.83], [side * 0.75, 0.47, -0.02], carbon));
    group.add(box([0.09, 0.065, 0.57], [side * 0.7, 0.55, 0.02], black));
    group.add(box([0.03, 0.038, 0.12], [side * 0.703, 0.65, -0.24], chrome));
  }
  group.add(box([1.45, 0.16, 0.38], [0, 0.65, -0.73], carbon));
  // White bolstered two-seat cockpit, dash, steering yoke and central floating display.
  for (const side of [-1, 1]) {
    const seatBox = (size: P, pos: P) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, 0.045), white);
      m.position.set(...pos);
      return m;
    };
    const seat = new THREE.Group();
    seat.position.set(side * 0.39, 0.25, 0.18);
    seat.add(seatBox([0.43, 0.12, 0.48], [0, 0.12, 0.05]));
    const back = seatBox([0.43, 0.57, 0.13], [0, 0.42, 0.32]);
    back.rotation.x = -0.18;
    seat.add(back);
    for (const x of [-0.23, 0.23]) seat.add(seatBox([0.09, 0.17, 0.46], [x, 0.18, 0.05]));
    seat.add(seatBox([0.29, 0.17, 0.1], [0, 0.76, 0.35]));
    group.add(seat);
  }
  group.add(
    panel(
      [
        [-0.77, 0.73, -0.93],
        [0.77, 0.73, -0.93],
        [0.72, 0.77, -0.58],
        [-0.72, 0.77, -0.58],
      ],
      carbon,
    ),
  );
  group.add(box([0.15, 0.24, 0.76], [0, 0.36, -0.12], carbon));
  const screen = box([0.33, 0.23, 0.018], [0.16, 0.75, -0.57], black);
  screen.rotation.x = -0.15;
  group.add(screen);
  const screenFace = box(
    [0.29, 0.19, 0.005],
    [0.16, 0.755, -0.555],
    new THREE.MeshStandardMaterial({
      color: '#172b3b',
      emissive: '#254561',
      emissiveIntensity: 0.6,
    }),
  );
  group.add(screenFace);
  const steering = new THREE.Group();
  steering.position.set(-0.38, 0.73, -0.48);
  steering.rotation.x = -0.15;
  steering.add(
    tube(
      [
        [-0.17, -0.06, 0],
        [-0.18, 0.06, 0],
        [-0.12, 0.12, 0],
        [0.12, 0.12, 0],
        [0.18, 0.06, 0],
        [0.17, -0.06, 0],
        [0.1, -0.12, 0],
        [-0.1, -0.12, 0],
        [-0.17, -0.06, 0],
      ],
      0.024,
      black,
    ),
  );
  steering.add(box([0.15, 0.14, 0.04], [0, 0, 0], black));
  group.add(steering);
  for (const s of [-1, 1])
    group.add(
      tube(
        [
          [s * 0.75, 0.61, -0.55],
          [s * 0.76, 0.62, 0],
          [s * 0.77, 0.66, 0.61],
        ],
        0.007,
        red,
      ),
    );
  const wheels: THREE.Group[] = [],
    frontWheels: THREE.Group[] = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: '#151619', roughness: 0.84 });
  const brakeMat = new THREE.MeshStandardMaterial({
    color: '#4b4d50',
    metalness: 0.8,
    roughness: 0.38,
  });
  for (const z of [-1.43, 1.43])
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.955, 0.37, z);
      group.add(pivot);
      if (z < 0) frontWheels.push(pivot);
      const wheel = new THREE.Group();
      wheel.name = `wheel-${z < 0 ? 'front' : 'rear'}-${side}`;
      pivot.add(wheel);
      wheels.push(wheel);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.302, 0.068, 12, 48), tireMat);
      tire.rotation.y = Math.PI / 2;
      tire.scale.z = 2.3;
      wheel.add(tire);
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.286, 0.286, 0.23, 40, 1, true),
        black,
      );
      barrel.rotation.z = Math.PI / 2;
      wheel.add(barrel);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.013, 32), brakeMat);
      disc.rotation.z = Math.PI / 2;
      disc.position.x = side * 0.055;
      wheel.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.278, 0.014, 6, 48), chrome);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = side * 0.133;
      wheel.add(rim);
      for (let spoke = 0; spoke < 5; spoke++) {
        const a = (spoke * Math.PI * 2) / 5;
        const shape = panel(
          [
            [side * 0.143, Math.cos(a) * 0.06, Math.sin(a) * 0.06],
            [side * 0.143, Math.cos(a + 0.13) * 0.27, Math.sin(a + 0.13) * 0.27],
            [side * 0.143, Math.cos(a + 0.34) * 0.26, Math.sin(a + 0.34) * 0.26],
            [side * 0.143, Math.cos(a + 0.55) * 0.09, Math.sin(a + 0.55) * 0.09],
          ],
          chrome,
        );
        wheel.add(shape);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.024, 16), black);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = side * 0.15;
      wheel.add(hub);
      for (let bolt = 0; bolt < 5; bolt++) {
        const a = (bolt * Math.PI * 2) / 5;
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.009, 5, 3), chrome);
        stud.position.set(side * 0.167, Math.sin(a) * 0.033, Math.cos(a) * 0.033);
        wheel.add(stud);
      }
      const caliper = box(
        [0.05, 0.15, 0.075],
        [side * 0.065, 0.11, -0.13],
        new THREE.MeshStandardMaterial({ color: '#a28043', metalness: 0.6, roughness: 0.4 }),
      );
      pivot.add(caliper);
    }
  // Bake stationary same-material parts; keep articulated wheels, wing and steering independent.
  const articulated = new Set<THREE.Object3D>([wing, steering, ...wheels.map((w) => w.parent!)]);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.updateMatrixWorld(true);
  const loose: THREE.Object3D[] = [];
  for (const child of [...group.children]) {
    if (articulated.has(child)) continue;
    child.traverse((o) => {
      if (o instanceof THREE.Mesh && !Array.isArray(o.material)) {
        const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (!geo.index) {
          const idx = Array.from({ length: geo.getAttribute('position').count }, (_, i) => i);
          geo.setIndex(idx);
        }
        if (!geo.getAttribute('uv'))
          geo.setAttribute(
            'uv',
            new THREE.Float32BufferAttribute(
              new Float32Array(geo.getAttribute('position').count * 2),
              2,
            ),
          );
        const parts = buckets.get(o.material) ?? [];
        parts.push(geo);
        buckets.set(o.material, parts);
        o.geometry.dispose();
      }
    });
    loose.push(child);
  }
  loose.forEach((o) => o.removeFromParent());
  for (const [material, parts] of buckets) {
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  // Wheel spokes and bolts share a draw call instead of rendering five separate pieces each.
  for (const wheel of wheels) {
    const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
    wheel.updateMatrix();
    for (const child of [...wheel.children]) {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
      child.updateMatrix();
      const g = child.geometry.clone().applyMatrix4(child.matrix);
      if (!g.index)
        g.setIndex(Array.from({ length: g.getAttribute('position').count }, (_, i) => i));
      if (!g.getAttribute('uv'))
        g.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute(
            new Float32Array(g.getAttribute('position').count * 2),
            2,
          ),
        );
      const list = byMaterial.get(child.material) ?? [];
      list.push(g);
      byMaterial.set(child.material, list);
      child.geometry.dispose();
      child.removeFromParent();
    }
    for (const [material, list] of byMaterial) {
      const g = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (g) {
        const mesh = new THREE.Mesh(g, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wheel.add(mesh);
      }
    }
  }
  group.userData.reference = '2026 official four-view screenshots';
  return { group, wheels, frontWheels, paint, glass, wing, steering };
}
