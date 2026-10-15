import * as THREE from 'three';
import type { Painting } from '../types';
import { groundHeight, peakHeight } from './terrain';
import { seededRandom, noise } from './math';
import { chineseForestDensity, isChineseLandscape } from './chineseLandscape';
import { curveRod, gableGeometry, pineCrownGeometry, rod } from './modelGeometry';
import { EMPIRE_SITES, getEmpireGround } from './empireLandform';
import {
  isXishanClearing,
  XISHAN_HOUSE,
  XISHAN_CARAVAN_FOCUS,
  XISHAN_EAVE_FOCUS,
  xishanPathCenter,
} from './xishanLayout';

function material(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 1 });
}
function box(
  group: THREE.Group,
  size: [number, number, number],
  at: [number, number, number],
  mat: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...at);
  group.add(mesh);
  return mesh;
}
function chineseRoof(width: number, depth: number, height: number, color: string): THREE.Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let s = 0; s < 2; s++)
    for (let i = 0; i <= 12; i++)
      for (let j = 0; j <= 8; j++) {
        const x = (i / 12 - 0.5) * width,
          t = j / 8,
          z = t * depth * 0.5 * (s === 0 ? 1 : -1);
        const y =
          height * (1 - t) +
          Math.pow(t, 4) * height * 0.37 +
          Math.pow(Math.abs(x) / (width * 0.5), 5) * height * 0.17;
        vertices.push(x, y, z);
        if (i < 12 && j < 8) {
          const a = s * 13 * 9 + i * 9 + j;
          indices.push(a, a + 9, a + 1, a + 1, a + 9, a + 10);
        }
      }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const roof = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }),
  );
  return roof;
}
export function pavilion(
  painting: Painting,
  x: number,
  z: number,
  scale = 1,
  open = true,
): THREE.Group {
  const group = new THREE.Group();
  const wood = material('#554936'),
    stone = material('#b9ad92');
  const tile = material(painting.id === 'qianli' ? '#415a4a' : '#585747');
  const plaster = material('#d4c8ac');
  // Raised plinth and real stair treads make the pavilion legible at human height.
  box(group, [5, 0.35, 4], [0, 0.2, 0], stone);
  box(group, [4.6, 0.17, 3.7], [0, 0.46, 0], stone);
  for (let i = 0; i < 3; i++)
    box(group, [1.65, 0.12, 0.32], [0, 0.1 + i * 0.12, 2.7 - i * 0.28], stone);
  if (!open) box(group, [3.9, 2.55, 2.9], [0, 1.78, 0], plaster);
  for (const dx of [-1.8, 1.8])
    for (const dz of [-1.3, 1.3]) {
      rod(group, new THREE.Vector3(dx, 0.48, dz), new THREE.Vector3(dx, 3.97, dz), 0.11, wood);
      box(group, [0.38, 0.16, 0.38], [dx, 0.58, dz], stone);
      box(group, [0.65, 0.13, 0.3], [dx, 3.7, dz], wood);
      box(group, [0.35, 0.14, 0.56], [dx, 3.84, dz], wood);
    }
  for (const sign of [-1, 1]) {
    box(group, [3.8, 0.16, 0.16], [0, 3.7, sign * 1.3], wood);
    box(group, [0.16, 0.16, 2.7], [sign * 1.8, 3.7, 0], wood);
    if (open) {
      box(group, [0.12, 0.1, 2.7], [sign * 1.8, 1.2, 0], wood);
      for (let j = -2; j <= 2; j++)
        box(group, [0.075, 0.6, 0.075], [sign * 1.8, 0.9, j * 0.5], wood);
    }
  }
  for (const xx of [-1.8, 1.8])
    for (const sign of [-1, 1])
      rod(
        group,
        new THREE.Vector3(xx, 3.85, sign * 1.3),
        new THREE.Vector3(xx, 4.7, 0),
        0.065,
        wood,
      );
  const roof = chineseRoof(5.7, 4.7, 1.6, painting.id === 'qianli' ? '#314b43' : '#4e5146');
  roof.position.y = 3.2;
  group.add(roof);
  // Clay tile barrel rows follow the concave roof profile; restrained Song-era eaves.
  for (let i = 0; i <= 22; i++) {
    const xx = -2.8 + (i * 5.6) / 22;
    for (const sign of [-1, 1]) {
      const points = Array.from({ length: 7 }, (_, j) => {
        const t = j / 6;
        return new THREE.Vector3(
          xx,
          3.24 + 1.6 * (1 - t) + Math.pow(t, 4) * 0.592 + Math.pow(Math.abs(xx) / 2.85, 5) * 0.272,
          sign * t * 2.35,
        );
      });
      curveRod(group, points, 0.045, tile, 8);
    }
  }
  curveRod(
    group,
    [
      new THREE.Vector3(-2.9, 5.06, 0),
      new THREE.Vector3(0, 4.87, 0),
      new THREE.Vector3(2.9, 5.06, 0),
    ],
    0.09,
    tile,
  );
  if (!open) {
    const shade = material('#3f493a');
    for (const dx of [-1.05, 1.05]) {
      box(group, [0.84, 0.95, 0.035], [dx, 1.95, 1.47], shade);
      for (const edge of [-1, 1]) {
        box(group, [0.06, 1.04, 0.06], [dx + edge * 0.46, 1.95, 1.51], wood);
        box(group, [0.98, 0.06, 0.06], [dx, 1.95 + edge * 0.5, 1.51], wood);
      }
      for (let j = -1; j <= 1; j++) {
        box(group, [0.035, 0.94, 0.05], [dx + j * 0.23, 1.95, 1.51], wood);
        box(group, [0.85, 0.035, 0.05], [dx, 1.95 + j * 0.24, 1.51], wood);
      }
    }
    box(group, [0.7, 1.8, 0.07], [0, 1.45, 1.5], wood);
    box(group, [0.035, 1.7, 0.03], [0, 1.45, 1.55], tile);
  }
  if (painting.id !== 'fuchun') {
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({
        color: '#ddbf79',
        emissive: '#ffb754',
        emissiveIntensity: 1.8,
      }),
    );
    lantern.scale.y = 1.35;
    lantern.position.set(1.8, 2.65, 1.4);
    group.add(lantern);
    rod(group, new THREE.Vector3(1.8, 2.9, 1.4), new THREE.Vector3(1.8, 3.2, 1.4), 0.025, wood);
  }
  group.scale.setScalar(scale);
  group.position.set(x, Math.max(0.45, groundHeight(painting, x, z)), z);
  return group;
}
export function boat(style: 'river' | 'classical' = 'river'): THREE.Group {
  if (style === 'classical') return classicalBoat();
  const group = new THREE.Group();
  const wood = material('#685137'),
    dark = material('#473e2d');
  // The hull is open upward, with narrow gunwales and longitudinal deck boards.
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    wood,
  );
  hull.scale.set(3.4, 0.65, 0.75);
  group.add(hull);
  for (let i = 0; i < 5; i++)
    box(group, [5.5, 0.08, 0.22], [0, 0.05, (i - 2) * 0.24], i % 2 ? wood : dark);
  for (const sign of [-1, 1])
    curveRod(
      group,
      [
        new THREE.Vector3(-3.3, 0.2, 0),
        new THREE.Vector3(-2, 0.12, sign * 0.63),
        new THREE.Vector3(1.7, 0.14, sign * 0.66),
        new THREE.Vector3(3.3, 0.3, 0),
      ],
      0.065,
      dark,
      20,
    );
  rod(group, new THREE.Vector3(0.2, 0, 0), new THREE.Vector3(0.2, 5.9, 0), 0.065, dark, 0.65);
  const sailGeometry = new THREE.PlaneGeometry(2.2, 3.7, 8, 12);
  const position = sailGeometry.attributes.position!;
  for (let i = 0; i < position.count; i++) {
    const xx = position.getX(i),
      yy = position.getY(i);
    position.setXYZ(
      i,
      xx * (0.9 + (yy + 1.85) * 0.035),
      yy,
      0.33 * Math.sin(((xx + 1.1) / 2.2) * Math.PI) * Math.sin(((yy + 1.85) / 3.7) * Math.PI),
    );
  }
  sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(
    sailGeometry,
    new THREE.MeshStandardMaterial({ color: '#d5c7a0', side: THREE.DoubleSide, roughness: 1 }),
  );
  sail.position.set(-0.75, 3.4, 0);
  group.add(sail);
  for (let i = 0; i < 6; i++) {
    const yy = 1.55 + i * 0.74;
    curveRod(
      group,
      [
        new THREE.Vector3(-1.8, yy, 0.03),
        new THREE.Vector3(-0.75, yy, 0.3 * Math.sin((i / 5) * Math.PI)),
        new THREE.Vector3(0.3, yy, 0.03),
      ],
      0.025,
      wood,
      8,
    );
  }
  for (const xx of [-2.9, 2.9])
    rod(group, new THREE.Vector3(xx, 0.2, 0), new THREE.Vector3(0.2, 5.65, 0), 0.015, dark, 1, 4);
  // A woven, arched stern shelter rather than a flat rectangular canopy.
  const shelter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 1.45, 14, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#a49469', roughness: 1, side: THREE.DoubleSide }),
  );
  shelter.rotation.z = Math.PI / 2;
  shelter.scale.x = 1.4;
  shelter.position.set(1.46, 0.12, 0);
  group.add(shelter);
  for (let i = 0; i < 7; i++) {
    const xx = 0.8 + i * 0.22;
    const points = Array.from(
      { length: 9 },
      (_, j) =>
        new THREE.Vector3(
          xx,
          0.12 + Math.sin((j / 8) * Math.PI) * 0.9,
          Math.cos((j / 8) * Math.PI) * 0.63,
        ),
    );
    curveRod(group, points, 0.055, i % 2 ? wood : dark, 8);
  }
  rod(group, new THREE.Vector3(2.4, 0.4, 0.3), new THREE.Vector3(4.2, -0.15, 1.4), 0.045, wood);
  return group;
}
/** A square-rigged classical harbour vessel, without the river boat's bamboo canopy. */
function classicalBoat(): THREE.Group {
  const group = new THREE.Group();
  const timber = material('#71503a'),
    edge = material('#4a382c');
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    timber,
  );
  hull.scale.set(4.5, 0.9, 1.1);
  group.add(hull);
  box(group, [7.3, 0.13, 1.7], [0, 0.03, 0], timber);
  for (const sign of [-1, 1]) {
    curveRod(
      group,
      [
        new THREE.Vector3(-4.3, 0.4, 0),
        new THREE.Vector3(-2.5, 0.25, sign * 0.92),
        new THREE.Vector3(2.6, 0.25, sign * 0.93),
        new THREE.Vector3(4.3, 0.55, 0),
      ],
      0.095,
      edge,
      22,
    );
    for (let i = 0; i < 6; i++) {
      const x = -2.5 + i * 0.95;
      rod(
        group,
        new THREE.Vector3(x, 0.3, sign * 0.75),
        new THREE.Vector3(x - 0.7, -0.2, sign * 2.55),
        0.035,
        timber,
      );
    }
  }
  curveRod(
    group,
    [
      new THREE.Vector3(4.2, 0.2, 0),
      new THREE.Vector3(4.8, 0.9, 0),
      new THREE.Vector3(4.65, 1.8, 0),
      new THREE.Vector3(4.35, 2, 0),
    ],
    0.11,
    edge,
    14,
  );
  rod(group, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 6.6, 0), 0.08, edge, 0.65);
  rod(group, new THREE.Vector3(-2.5, 5.9, 0), new THREE.Vector3(2.5, 5.9, 0), 0.055, timber);
  const sailGeometry = new THREE.PlaneGeometry(4.8, 3.7, 14, 12),
    positions = sailGeometry.attributes.position!;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      t = (y + 1.85) / 3.7;
    positions.setXYZ(
      i,
      x * (0.84 + t * 0.16),
      y,
      Math.sin(((x + 2.4) / 4.8) * Math.PI) * Math.sin(t * Math.PI) * 0.65,
    );
  }
  sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(
    sailGeometry,
    new THREE.MeshStandardMaterial({ color: '#d4c5a2', roughness: 1, side: THREE.DoubleSide }),
  );
  sail.position.y = 4.05;
  group.add(sail);
  for (const x of [-3.9, 3.9])
    rod(group, new THREE.Vector3(x, 0.3, 0), new THREE.Vector3(0, 6.2, 0), 0.015, edge, 1, 4);
  return group;
}
export function bridge(_painting: Painting, x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const stone = material('#b0a48a'),
    wood = material('#64563d');
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const y = 1 + Math.sin(t * Math.PI) * 2.7;
    box(group, [0.8, 0.3, 2.2], [-8 + t * 16, y, 0], stone);
    for (const sign of [-1, 1]) {
      box(group, [0.1, 1.1, 0.1], [-8 + t * 16, y + 0.7, sign * 1.1], wood);
      const rail = box(group, [0.85, 0.09, 0.09], [-8 + t * 16, y + 1.2, sign * 1.1], wood);
      rail.rotation.z = Math.cos(t * Math.PI) * 0.45;
    }
    if (i % 5 === 0) box(group, [0.35, y, 0.35], [-8 + t * 16, y / 2, 0], stone);
  }
  group.position.set(x, 0.1, z);
  group.rotation.y = 0.2;
  return group;
}
export function buildForest(painting: Painting): THREE.Group {
  const group = new THREE.Group();
  // Snow-laden conifers belong to the winter scene's own model builder.
  if (painting.id === 'winter' || painting.id === 'starry') return group;
  const random = seededRandom(painting.seed + 40);
  const transforms: { x: number; y: number; z: number; s: number; r: number }[] = [];
  for (const peak of painting.peaks) {
    const count =
      painting.id === 'empire'
        ? 110
        : painting.id === 'fuchun'
          ? 48
          : painting.id === 'xishan' && peak.height > 90
            ? 150
            : 70;
    for (let i = 0; i < count; i++) {
      const x = peak.x + (random() - 0.5) * peak.radius * 1.75,
        z = peak.z + (random() - 0.5) * peak.radius * 1.4;
      const y =
        painting.id === 'empire'
          ? getEmpireGround(x, z)
          : isChineseLandscape(painting.id)
            ? groundHeight(painting, x, z)
            : peakHeight(peak, x, z);
      const slope = Math.hypot(
        peakHeight(peak, x + 0.6, z) - peakHeight(peak, x - 0.6, z),
        peakHeight(peak, x, z + 0.6) - peakHeight(peak, x, z - 0.6),
      );
      if (
        y < 0.6 ||
        y > peak.height * 0.98 ||
        slope > 2.7 ||
        groundHeight(painting, x, z) > y + 0.5
      )
        continue;
      if (
        painting.id === 'empire' &&
        (y > 21 ||
          slope > 1.05 ||
          EMPIRE_SITES.some((site) => Math.abs(x - site.x) < 13 && Math.abs(z - site.z) < 11))
      )
        continue;
      const s = 0.7 + random() * 1.2,
        r = random() * Math.PI * 2;
      if (painting.id === 'xishan' && isXishanClearing(x, z, s * 3)) continue;
      if (
        isChineseLandscape(painting.id) &&
        noise(x * 1.7, z * 1.7, painting.seed + 53) >
          chineseForestDensity(painting.id, x, z, y, peak.height, painting.seed)
      )
        continue;
      transforms.push({ x, y, z, s, r });
    }
  }
  const sparse = painting.id === 'fuchun',
    dense = painting.id === 'xishan';
  // Placement remains stable; the shape stream varies branching without moving the forest.
  const shapeRandom = seededRandom(painting.seed + 840);
  const trees = transforms.map((tree) => ({
    ...tree,
    crowns: (sparse ? 3 : dense ? 5 : 4) + Math.floor(shapeRandom() * 3),
    height: 0.83 + shapeRandom() * 0.38,
    width: 0.77 + shapeRandom() * 0.45,
    bend: (shapeRandom() - 0.5) * 0.17,
  }));
  const crownCount = trees.reduce((count, tree) => count + tree.crowns, 0);
  const bark = material(sparse ? '#6c6656' : dense ? '#49483b' : '#514a35');
  const trunkGeometry = new THREE.CylinderGeometry(0.045, 0.14, 3.3, 6, 3);
  const trunkCenter = (t: number) => [
    0.2 * t * t + Math.sin(t * Math.PI) * 0.13,
    Math.sin(t * Math.PI * 1.3) * 0.06,
  ];
  const trunkPositions = trunkGeometry.getAttribute('position');
  for (let i = 0; i < trunkPositions.count; i++) {
    const y = trunkPositions.getY(i),
      t = (y + 1.65) / 3.3;
    const [x, z] = trunkCenter(t);
    trunkPositions.setXYZ(i, trunkPositions.getX(i) + x!, y, trunkPositions.getZ(i) + z!);
  }
  trunkGeometry.computeVertexNormals();
  const branchGeometry = new THREE.CylinderGeometry(0.018, 0.065, 1, 5, 2);
  const branchPositions = branchGeometry.getAttribute('position');
  for (let i = 0; i < branchPositions.count; i++) {
    const y = branchPositions.getY(i);
    branchPositions.setX(i, branchPositions.getX(i) + Math.sin((y + 0.5) * Math.PI) * 0.09);
  }
  branchGeometry.computeVertexNormals();
  const trunk = new THREE.InstancedMesh(trunkGeometry, bark, trees.length);
  const branches = new THREE.InstancedMesh(branchGeometry, bark, crownCount);
  // Instance colors are the leaf pigment; a white base avoids multiplying that pigment twice.
  const canopy = new THREE.InstancedMesh(
    painting.id === 'empire' ? new THREE.IcosahedronGeometry(0.83, 1) : pineCrownGeometry(),
    material('#ffffff'),
    crownCount,
  );
  trunk.name = 'Bent pine trunks';
  branches.name = 'Irregular pine branches';
  canopy.name = painting.id === 'empire' ? 'Harbour broadleaf crowns' : 'Broken needle sprays';
  const dummy = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3(),
    end = new THREE.Vector3(),
    direction = new THREE.Vector3();
  const leafColor = new THREE.Color(painting.palette.leaf);
  if (sparse) leafColor.lerp(new THREE.Color('#a5a18b'), 0.23);
  if (dense) leafColor.multiplyScalar(0.76);
  let crownIndex = 0;
  trees.forEach((t, i) => {
    dummy.position.set(t.x, t.y + t.s * t.height * 1.65, t.z);
    dummy.scale.set(t.s * t.width, t.s * t.height, t.s * t.width);
    dummy.rotation.set(0, t.r, 0);
    dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < t.crowns; j++) {
      const level = (j + 0.22 + shapeRandom() * 0.54) / t.crowns;
      const attachment = 0.38 + level * 0.58;
      const [localX, localZ] = trunkCenter(attachment);
      const sx = localX! * t.s * t.width,
        sz = localZ! * t.s * t.width;
      const angle = t.r + (j % 2 ? Math.PI : 0) + (shapeRandom() - 0.5) * 1.65;
      const spread = (0.66 + shapeRandom() * 0.68) * (1 - level * 0.42) * t.s * t.width;
      start.set(
        t.x + sx * Math.cos(t.r) + sz * Math.sin(t.r),
        t.y + attachment * 3.3 * t.s * t.height,
        t.z - sx * Math.sin(t.r) + sz * Math.cos(t.r),
      );
      end
        .copy(start)
        .add(
          new THREE.Vector3(
            Math.cos(angle) * spread,
            (0.11 + shapeRandom() * 0.25 + t.bend) * t.s,
            Math.sin(angle) * spread,
          ),
        );
      direction.copy(end).sub(start);
      dummy.position.copy(start).add(end).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      dummy.scale.set(t.s, direction.length(), t.s);
      dummy.updateMatrix();
      branches.setMatrixAt(crownIndex, dummy.matrix);
      dummy.position.copy(end);
      dummy.rotation.set((shapeRandom() - 0.5) * 0.22, angle, (shapeRandom() - 0.5) * 0.3);
      const size = t.s * (0.77 + shapeRandom() * 0.3) * (1 - level * 0.35);
      dummy.scale.set(
        size * t.width * (sparse ? 0.8 : 1),
        size * (dense ? 1.25 : sparse ? 0.75 : 1),
        size * (0.65 + shapeRandom() * 0.27) * (sparse ? 0.78 : 1),
      );
      dummy.updateMatrix();
      canopy.setMatrixAt(crownIndex, dummy.matrix);
      canopy.setColorAt(crownIndex, leafColor.clone().multiplyScalar(0.84 + shapeRandom() * 0.23));
      crownIndex++;
    }
  });
  group.add(trunk, branches, canopy);
  return group;
}
function westernHouse(x: number, z: number, random: () => number): THREE.Group {
  const group = new THREE.Group();
  const height = 2 + random() * 2,
    width = 2.6 + random() * 1.5;
  const plaster = material(random() > 0.5 ? '#637991' : '#8e98a0');
  const roofMat = material(random() > 0.5 ? '#35445d' : '#46516b');
  const trim = material('#28394b');
  box(group, [width + 0.15, 0.18, 3.25], [0, 0.1, 0], material('#7c7e73'));
  const wallGeometry = new THREE.BoxGeometry(width, height, 3.1, 12, 12, 12);
  const wallPosition = wallGeometry.getAttribute('position');
  const wallColors: number[] = [];
  for (let i = 0; i < wallPosition.count; i++) {
    const px = wallPosition.getX(i),
      py = wallPosition.getY(i),
      pz = wallPosition.getZ(i);
    const brush = noise(px * 7, py * 2 + pz * 3, 1889);
    const shade = 0.91 + brush * 0.14 + (py / height) * 0.035;
    const color = plaster.color.clone().multiplyScalar(shade);
    wallColors.push(color.r, color.g, color.b);
  }
  wallGeometry.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
  const paintedMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    roughness: 1,
  });
  const walls = new THREE.Mesh(wallGeometry, paintedMaterial);
  walls.name = 'Broken blue plaster brushwork';
  walls.position.y = height / 2;
  group.add(walls);
  const roof = new THREE.Mesh(gableGeometry(width + 0.5, 3.7, 1.5), roofMat);
  roof.position.y = height;
  group.add(roof);
  // Thin slate edges replace thick dark ladder-like roof bars.
  for (const sign of [-1, 1])
    for (let row = 1; row <= 8; row++) {
      const t = row / 8;
      box(
        group,
        [0.018, 0.018, 3.72],
        [sign * (width + 0.5) * 0.5 * t, height + 1.5 * (1 - t) + 0.03, 0],
        roofMat,
      );
    }
  const tileVertices: number[] = [],
    tileColors: number[] = [];
  for (const side of [-1, 1])
    for (let row = 0; row < 8; row++)
      for (let column = 0; column < 10; column++) {
        const shade = 0.88 + noise(column * 2.1, row * 1.7, side + 1889) * 0.32;
        const color = roofMat.color.clone().multiplyScalar(shade);
        const a = row / 8 + 0.004,
          b = (row + 1) / 8 - 0.004;
        const z1 = -1.845 + column * 0.369 + 0.012;
        const z2 = z1 + 0.345;
        for (const [t, zz] of [
          [a, z1],
          [b, z1],
          [a, z2],
          [b, z1],
          [b, z2],
          [a, z2],
        ]) {
          tileVertices.push(side * (width + 0.5) * 0.5 * t!, height + 1.5 * (1 - t!) + 0.012, zz!);
          tileColors.push(color.r, color.g, color.b);
        }
      }
  const tiles = new THREE.BufferGeometry();
  tiles.setAttribute('position', new THREE.Float32BufferAttribute(tileVertices, 3));
  tiles.setAttribute('color', new THREE.Float32BufferAttribute(tileColors, 3));
  // Both slopes wind outward; the right slope's triangle winding is reversed.
  const tilePoints = tiles.getAttribute('position');
  for (let i = tilePoints.count / 2; i < tilePoints.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(tilePoints, i);
    const b = new THREE.Vector3().fromBufferAttribute(tilePoints, i + 1);
    tilePoints.setXYZ(i, b.x, b.y, b.z);
    tilePoints.setXYZ(i + 1, a.x, a.y, a.z);
  }
  tiles.computeVertexNormals();
  const tileSkin = new THREE.Mesh(tiles, paintedMaterial);
  tileSkin.name = 'Individual blue slate courses';
  group.add(tileSkin);
  box(group, [0.12, 0.1, 3.85], [0, height + 1.54, 0], roofMat);
  box(group, [0.34, 0.95, 0.4], [-width * 0.25, height + 0.95, -0.65], plaster);
  box(group, [0.45, 0.12, 0.5], [-width * 0.25, height + 1.47, -0.65], trim);
  const windowMat = new THREE.MeshStandardMaterial({
    color: '#e9c170',
    emissive: '#ffc35b',
    emissiveIntensity: 1.25,
  });
  for (const dx of [-width * 0.28, width * 0.28]) {
    box(group, [0.48, 0.71, 0.05], [dx, height * 0.65, 1.58], random() > 0.62 ? windowMat : trim);
    for (const side of [-1, 1]) {
      box(group, [0.05, 0.81, 0.09], [dx + side * 0.28, height * 0.65, 1.62], trim);
      box(group, [0.61, 0.06, 0.09], [dx, height * 0.65 + side * 0.39, 1.62], trim);
    }
    box(group, [0.035, 0.71, 0.08], [dx, height * 0.65, 1.62], trim);
    box(group, [0.48, 0.035, 0.08], [dx, height * 0.65, 1.62], trim);
  }
  box(group, [0.55, 1.3, 0.06], [0, 0.65, 1.58], trim);
  box(group, [0.82, 0.14, 0.45], [0, 0.1, 1.72], plaster);
  group.position.set(x, 0.8, z);
  group.rotation.y = (random() - 0.5) * 0.45;
  return group;
}

/** Twisting vertical lobes reproduce the cypress' flame silhouette. */
function cypressLobe(height: number, radius: number, phase: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.025, radius, height, 16, 44);
  const positions = geometry.attributes.position!;
  const colors: number[] = [];
  const deep = new THREE.Color('#172c2b'),
    green = new THREE.Color('#3c5141');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i),
      t = (y + height / 2) / height;
    const angle = Math.atan2(positions.getZ(i), positions.getX(i));
    const brush = Math.sin(angle * 9 + t * 7 + phase) * 0.5 + 0.5;
    const fullness = 0.75 + Math.sin(t * Math.PI) * 0.48;
    const edge = 1 + Math.sin(t * 79 + angle * 5 + phase) * 0.045;
    positions.setXYZ(
      i,
      positions.getX(i) * fullness * edge + Math.sin(t * 5 + phase) * radius * t * 0.75,
      y + height / 2,
      positions.getZ(i) * fullness * edge + Math.cos(t * 6 + phase) * radius * t * 0.35,
    );
    const color = deep.clone().lerp(green, brush * 0.55 + Math.sin(t * 31 + angle) ** 6 * 0.2);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
export function buildVillage(painting: Painting): THREE.Group {
  const group = new THREE.Group(),
    random = seededRandom(painting.seed);
  if (String(painting.id) === 'winter') return group;
  if (painting.id === 'starry') {
    const sites: { x: number; z: number; radius: number }[] = [];
    // Small, irregular neighbourhoods leave a winding lane to the central steeple.
    const clusters = [
      [-24, -13, 15, 10],
      [22, -13, 17, 11],
      [-19, -29, 17, 10],
      [23, -31, 18, 10],
    ];
    for (const [cx, cz, width, depth] of clusters) {
      let placed = 0;
      for (let attempt = 0; attempt < 130 && placed < 12; attempt++) {
        const x = cx! + (random() - 0.5) * width! * 2;
        const z = cz! + (random() - 0.5) * depth!;
        const street = Math.sin(z * 0.11) * 3;
        const scale = 0.68 + random() * 0.44;
        const radius = scale * 2.5;
        if (
          Math.abs(x - street) < 5.5 ||
          sites.some((site) => Math.hypot(site.x - x, site.z - z) < site.radius + radius)
        )
          continue;
        const house = westernHouse(x, z, random);
        house.scale.set(scale, scale * (0.85 + random() * 0.5), scale);
        house.rotation.y += (random() - 0.5) * 0.8;
        house.position.y = groundHeight(painting, x, z) + 0.08;
        group.add(house);
        sites.push({ x, z, radius });
        placed++;
      }
    }
    const church = westernHouse(0, -22, random);
    church.scale.set(1.45, 1.25, 2);
    church.position.y = groundHeight(painting, 0, -22);
    const masonry = material('#728393'),
      slate = material('#243b56');
    box(church, [1.8, 8.6, 1.9], [0, 4.3, 0.35], masonry);
    for (const dx of [-0.92, 0.92]) box(church, [0.15, 8.4, 2], [dx, 4.2, 0.35], slate);
    box(church, [0.42, 1.4, 0.04], [0, 7.2, 1.32], slate);
    const steeple = new THREE.Mesh(new THREE.ConeGeometry(1.45, 7.8, 4), slate);
    steeple.position.set(0, 12.4, 0.35);
    steeple.rotation.y = Math.PI / 4;
    church.add(steeple);
    group.add(church);
    // A connected silhouette, one tall flame with smaller curling lobes at its foot.
    const cypressForms = [
      [-44, 21, 45, 2.7],
      [-47, 22, 34, 2.3],
      [-41, 20, 31, 2.4],
      [-49, 24, 23, 2.1],
      [-42, 24, 20, 2.2],
      [-46, 25, 28, 2.6],
      [-39, 22, 17, 1.9],
    ];
    for (const [x, z, height, radius] of cypressForms) {
      const cypress = new THREE.Mesh(
        cypressLobe(height!, radius!, random() * 6),
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          vertexColors: true,
          emissive: random() > 0.65 ? '#203735' : '#11272d',
          emissiveIntensity: 0.16,
          roughness: 1,
        }),
      );
      cypress.name = 'Broken-brush cypress flame';
      cypress.position.set(x!, groundHeight(painting, x!, z!), z!);
      cypress.rotation.y = random() * Math.PI;
      group.add(cypress);
    }
  } else if (painting.id === 'xishan') {
    const caravan = new THREE.Group();
    caravan.name = 'Xishan pack caravan';
    const cloth = material('#686453'),
      darkCloth = material('#4d4a3f'),
      hide = material('#716b59'),
      muzzle = material('#49483d'),
      rope = material('#8c8067'),
      skin = material('#a39173');
    const sphere = (
      parent: THREE.Group,
      at: [number, number, number],
      scale: [number, number, number],
      mat: THREE.Material,
    ) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), mat);
      mesh.position.set(...at);
      mesh.scale.set(...scale);
      parent.add(mesh);
      return mesh;
    };
    const beasts: { x: number; y: number; z: number }[] = [];
    for (let index = 0; index < 3; index++) {
      const x = 47.5 + index * 2.8,
        z = xishanPathCenter(x);
      const y = groundHeight(painting, x, z);
      const animal = new THREE.Group();
      animal.name = 'Small laden pack animal';
      animal.userData.role = 'pack-animal';
      animal.position.set(x, y, z);
      // Head faces +X. Separate haunches, neck and muzzle keep it legible without blocks.
      sphere(animal, [0, 0.92, 0], [0.64, 0.29, 0.23], hide);
      sphere(animal, [-0.37, 0.9, 0], [0.28, 0.3, 0.235], hide);
      curveRod(
        animal,
        [
          new THREE.Vector3(0.41, 0.92, 0),
          new THREE.Vector3(0.58, 1.18, 0),
          new THREE.Vector3(0.67, 1.38, 0),
        ],
        0.15,
        hide,
        6,
      );
      sphere(animal, [0.76, 1.39, 0], [0.22, 0.16, 0.135], hide);
      sphere(animal, [0.94, 1.29, 0], [0.2, 0.105, 0.12], muzzle);
      for (const side of [-1, 1]) {
        const ear = sphere(animal, [0.68, 1.67, side * 0.085], [0.045, 0.2, 0.036], hide);
        ear.rotation.z = -0.12 + side * 0.12;
        sphere(animal, [0.79, 1.44, side * 0.127], [0.018, 0.018, 0.012], muzzle);
        for (const front of [-1, 1]) {
          const hipX = front * 0.4,
            footX = hipX + (side === front ? 0.11 : -0.12);
          const footZ = side * 0.19;
          const floor = groundHeight(painting, x + footX, z + footZ) - y;
          const hip = new THREE.Vector3(hipX, 0.83, side * 0.17);
          const knee = new THREE.Vector3(hipX - front * 0.08, (0.83 + floor) / 2, side * 0.19);
          const ankle = new THREE.Vector3(footX, floor + 0.12, footZ);
          rod(animal, hip, knee, 0.065, hide, 0.72);
          rod(animal, knee, ankle, 0.046, hide, 0.7);
          sphere(animal, [footX + 0.025, floor + 0.06, footZ], [0.085, 0.06, 0.065], muzzle);
        }
        // Coarse paired panniers sit on a dark saddle cloth, not oversized decorative cargo.
        const bag = sphere(animal, [-0.09, 1.06, side * 0.29], [0.33, 0.29, 0.18], cloth);
        bag.rotation.x = side * 0.16;
        curveRod(
          animal,
          [
            new THREE.Vector3(-0.29, 0.98, side * 0.42),
            new THREE.Vector3(-0.23, 1.34, side * 0.24),
            new THREE.Vector3(-0.2, 1.38, 0),
          ],
          0.017,
          rope,
          6,
        );
        curveRod(
          animal,
          [
            new THREE.Vector3(0.97, 1.3, side * 0.12),
            new THREE.Vector3(0.78, 1.34, side * 0.145),
            new THREE.Vector3(0.61, 1.49, side * 0.1),
          ],
          0.018,
          darkCloth,
          5,
        );
      }
      box(animal, [0.64, 0.07, 0.55], [-0.08, 1.19, 0], darkCloth);
      curveRod(
        animal,
        [
          new THREE.Vector3(-0.57, 0.99, 0),
          new THREE.Vector3(-0.75, 0.64, 0.035),
          new THREE.Vector3(-0.72, 0.33, 0.08),
        ],
        0.027,
        muzzle,
        7,
      );
      caravan.add(animal);
      beasts.push({ x, y, z });
    }
    const adults: { hand: THREE.Vector3; x: number; y: number; z: number }[] = [];
    for (const [index, x, z] of [
      [0, 57.1, xishanPathCenter(57.1) + 0.25],
      [1, 46.1, xishanPathCenter(46.1) + 0.35],
    ]) {
      const y = groundHeight(painting, x!, z!);
      const person = new THREE.Group();
      person.name = 'Adult caravan traveler';
      person.userData = { role: 'adult-traveler', height: 1.68 };
      person.position.set(x!, y, z!);
      const robe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.25, 0.81, 9),
        index ? darkCloth : cloth,
      );
      robe.position.set(0, 0.96, 0);
      person.add(robe);
      sphere(person, [0, 1.51, 0], [0.12, 0.15, 0.12], skin);
      sphere(person, [-0.015, 1.625, 0], [0.125, 0.055, 0.125], darkCloth);
      rod(person, new THREE.Vector3(0, 1.28, 0), new THREE.Vector3(0, 1.41, 0), 0.055, skin);
      for (const side of [-1, 1]) {
        const footX = side * 0.14,
          footZ = side * 0.09;
        const floor = groundHeight(painting, x! + footX, z! + footZ) - y;
        rod(
          person,
          new THREE.Vector3(0, 0.7, side * 0.08),
          new THREE.Vector3(footX, floor + 0.1, footZ),
          0.065,
          darkCloth,
          0.8,
        );
        sphere(person, [footX + 0.045, floor + 0.055, footZ], [0.12, 0.055, 0.067], darkCloth);
        const hand = new THREE.Vector3(
          side === 1 ? -0.31 : 0.16,
          side === 1 ? 1.02 : 0.84,
          side * 0.17,
        );
        curveRod(
          person,
          [
            new THREE.Vector3(0, 1.24, side * 0.15),
            new THREE.Vector3(-0.11, 1.05, side * 0.21),
            hand,
          ],
          0.075,
          index ? darkCloth : cloth,
          5,
        );
        sphere(person, [hand.x, hand.y, hand.z], [0.05, 0.065, 0.047], skin);
      }
      caravan.add(person);
      adults.push({ x: x!, y, z: z!, hand: new THREE.Vector3(x! - 0.31, y + 1.02, z! + 0.17) });
    }
    beasts.forEach((beast, index) => {
      const start = new THREE.Vector3(beast.x + 0.93, beast.y + 1.29, beast.z + 0.12);
      const next = beasts[index + 1];
      const end = next
        ? new THREE.Vector3(next.x - 0.18, next.y + 1.29, next.z + 0.2)
        : adults[0]!.hand;
      const middle = start.clone().lerp(end, 0.5);
      middle.y = Math.max(middle.y - 0.18, groundHeight(painting, middle.x, middle.z) + 0.12);
      curveRod(caravan, [start, middle, end], 0.012, rope, 8).name = 'Slack caravan lead rope';
    });
    caravan.userData.focus = [...XISHAN_CARAVAN_FOCUS];
    group.add(caravan);

    // A single modest eave behind the right woodland; no signboard or lit lantern.
    const dwelling = new THREE.Group();
    dwelling.name = 'Xishan secluded woodland eave';
    const site = XISHAN_HOUSE;
    const floor = groundHeight(painting, site.x, site.z);
    const wall = material('#8a816a'),
      timber = material('#4c493b');
    // Wall tops follow the actual curved roof at the wall perimeter, including the gables.
    const roofHeight = (x: number, z: number) => {
      const t = Math.abs(z) / 1.625;
      return (
        1.65 + 0.84 * (1 - t) + t ** 4 * 0.84 * 0.37 + (Math.abs(x) / 2.025) ** 5 * 0.84 * 0.17
      );
    };
    const wallVertices: number[] = [];
    const corners = [
      [-1.65, -1.25],
      [-1.65, 1.25],
      [1.65, 1.25],
      [1.65, -1.25],
    ];
    for (let side = 0; side < 4; side++) {
      const a = corners[side]!,
        b = corners[(side + 1) % 4]!;
      for (let segment = 0; segment < 12; segment++) {
        const x1 = a[0]! + ((b[0]! - a[0]!) * segment) / 12,
          z1 = a[1]! + ((b[1]! - a[1]!) * segment) / 12;
        const x2 = a[0]! + ((b[0]! - a[0]!) * (segment + 1)) / 12,
          z2 = a[1]! + ((b[1]! - a[1]!) * (segment + 1)) / 12;
        const y1 = roofHeight(x1, z1) + 0.01,
          y2 = roofHeight(x2, z2) + 0.01;
        wallVertices.push(
          x1,
          -0.08,
          z1,
          x2,
          -0.08,
          z2,
          x1,
          y1,
          z1,
          x2,
          -0.08,
          z2,
          x2,
          y2,
          z2,
          x1,
          y1,
          z1,
        );
      }
    }
    const wallGeometry = new THREE.BufferGeometry();
    wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallVertices, 3));
    wallGeometry.computeVertexNormals();
    const walls = new THREE.Mesh(wallGeometry, wall);
    walls.name = 'Continuous ground-to-eave walls';
    dwelling.add(walls);
    box(dwelling, [3.4, 0.16, 2.6], [0, 0.02, 0], material('#77715f'));
    box(dwelling, [0.6, 1.35, 0.04], [0.3, 0.675, 1.27], timber);
    box(dwelling, [0.5, 0.55, 0.04], [-0.78, 1.08, 1.27], timber);
    const roof = chineseRoof(4.05, 3.25, 0.84, '#535448');
    roof.position.y = 1.65;
    dwelling.add(roof);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const localGround = groundHeight(painting, site.x + sx * 1.5, site.z + sz * 1.1) - floor;
        rod(
          dwelling,
          new THREE.Vector3(sx * 1.5, localGround, sz * 1.1),
          new THREE.Vector3(sx * 1.5, 1.8, sz * 1.1),
          0.08,
          timber,
        );
      }
    dwelling.position.set(site.x, floor, site.z);
    dwelling.userData.focus = [...XISHAN_EAVE_FOCUS];
    group.add(dwelling);
  } else if (painting.id !== 'empire') {
    painting.peaks
      .filter((p) => p.height < 20)
      .forEach((peak) => {
        for (let i = 0; i < 4; i++) {
          const x = peak.x + (random() - 0.5) * peak.radius,
            z = peak.z + (random() - 0.5) * peak.radius * 0.7;
          const scale = 0.65 + random() * 0.25;
          if (painting.id !== 'fuchun' || i < 2)
            group.add(pavilion(painting, x, z, scale, i === 0));
        }
      });
    group.add(pavilion(painting, 22, -13, 0.85, true));
    const robe = material('#756c4e');
    const skin = material('#b69b77');
    for (let i = 0; i < 7; i++) {
      const traveler = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.9, 7), robe);
      body.position.y = 0.62;
      traveler.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), skin);
      head.position.y = 1.2;
      traveler.add(head);
      const peak =
        painting.peaks.find((p) => p.height < 20) ?? painting.peaks[painting.peaks.length - 1]!;
      const x = peak.x - 4 + i * 1.1,
        z = peak.z + 3;
      traveler.position.set(x, Math.max(0.3, groundHeight(painting, x, z)), z);
      group.add(traveler);
    }
  }
  return group;
}
/** Doric-inspired shafts, capitals and three-step stylobates, kept texture-free. */
function classicalColumn(
  group: THREE.Group,
  x: number,
  z: number,
  base: number,
  height: number,
  stone: THREE.Material,
  ruined = false,
): void {
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.39, height, 12), stone);
  shaft.position.set(x, base + height / 2, z);
  group.add(shaft);
  if (!ruined) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.32, 0.25, 12), stone);
    neck.position.set(x, base + height, z);
    group.add(neck);
    box(group, [0.94, 0.2, 0.94], [x, base + height + 0.2, z], stone);
  }
  box(group, [0.85, 0.17, 0.85], [x, base + 0.06, z], stone);
}

export function buildEmpire(period: number): THREE.Group {
  const group = new THREE.Group(),
    random = seededRandom(136);
  if (period === 0) return group;
  const stone = material(period > 2 ? '#a6a18e' : '#d9d5be');
  const roof = material('#a7a08c'),
    shade = material('#6b7268');
  if (period === 1) {
    for (const site of EMPIRE_SITES.filter(
      (_, index) => index !== 2 && index !== 4 && index !== 6,
    )) {
      const hut = new THREE.Group();
      box(hut, [3.3, 2, 2.8], [0, 1, 0], material('#b4a98c'));
      const thatch = new THREE.Mesh(gableGeometry(4.1, 3.7, 1.6), material('#8d815b'));
      thatch.position.y = 1.9;
      hut.add(thatch);
      box(hut, [0.7, 1.35, 0.05], [0, 0.68, 1.43], shade);
      hut.position.set(site.x, site.y, site.z);
      hut.rotation.y = site.yaw;
      hut.userData.site = site.id;
      group.add(hut);
    }
    stone.dispose();
    roof.dispose();
    return group;
  }
  const ruin = period >= 3;
  // An asymmetric terraced harbour: one upper rotunda, lower porticos, a smaller opposite shore.
  for (const [index, site] of EMPIRE_SITES.entries()) {
    const { kind, x, z } = site;
    if (period === 4 && [1, 4, 6].includes(index)) continue;
    const building = new THREE.Group();
    const h = site.height;
    const width = kind === 1 ? 14 : 11;
    for (let step = 0; step < 3; step++)
      box(
        building,
        [width + 1.8 - step * 0.7, 0.22, 10.5 - step * 0.65],
        [0, 1.2 + step * 0.22, 0],
        stone,
      );
    if (kind === 2) {
      // Circular peristyle and a shallow dome echo the painting's harbour rotunda.
      for (let c = 0; c < 12; c++) {
        const angle = (c / 12) * Math.PI * 2;
        if (ruin && random() > 0.62) continue;
        classicalColumn(
          building,
          Math.cos(angle) * 4,
          Math.sin(angle) * 4,
          1.8,
          ruin ? h * (0.3 + random() * 0.65) : h,
          stone,
          ruin,
        );
      }
      if (!ruin) {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.65, 0.65, 32), stone);
        drum.position.y = h + 2.3;
        building.add(drum);
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(4.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          roof,
        );
        dome.scale.y = 0.48;
        dome.position.y = h + 2.62;
        building.add(dome);
        box(building, [0.8, 1, 0.8], [0, h + 5.1, 0], stone);
      }
    } else {
      const columns = kind === 1 ? 8 : 6;
      for (let c = 0; c < columns; c++)
        for (const back of [-1, 1]) {
          if (ruin && random() > 0.6) continue;
          classicalColumn(
            building,
            -width / 2 + 0.6 + (c * (width - 1.2)) / (columns - 1),
            back * 3.6,
            1.8,
            ruin ? 1.5 + random() * h : h,
            stone,
            ruin,
          );
        }
      if (!ruin) {
        // Recessed sanctuary with dark entrance behind the portico.
        box(building, [width - 3, h - 0.6, 4], [0, 1.8 + (h - 0.6) / 2, -0.7], stone);
        box(building, [1.5, 3.2, 0.06], [0, 3.4, 1.33], shade);
        box(building, [width + 0.4, 0.45, 8.6], [0, h + 2.4, 0], stone);
        box(building, [width + 0.8, 0.18, 9], [0, h + 2.75, 0], stone);
        const pediment = new THREE.Mesh(
          gableGeometry(width + 0.9, 9.1, kind === 1 ? 2.2 : 1.7),
          roof,
        );
        pediment.position.y = h + 2.85;
        building.add(pediment);
        // Measured frieze rhythm instead of ornament at every surface.
        for (let c = 0; c < columns * 2 - 1; c++)
          box(
            building,
            [0.14, 0.35, 0.08],
            [-width / 2 + (c * width) / (columns * 2 - 2), h + 2.4, 4.35],
            shade,
          );
        if (kind === 1) {
          box(building, [4.8, 3.4, 5], [0, h + 4.8, -1], stone);
          const upperRoof = new THREE.Mesh(gableGeometry(5.4, 5.8, 1.6), roof);
          upperRoof.position.set(0, h + 6.5, -1);
          building.add(upperRoof);
        }
      }
    }
    if (ruin) {
      for (let i = 0; i < 8; i++) {
        const rubble = box(
          building,
          [0.8 + random(), 0.7, 1.1 + random()],
          [(random() - 0.5) * width, 1.9, (random() - 0.5) * 8],
          stone,
        );
        rubble.rotation.set(random(), random() * 3, random());
      }
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 4.4, 12), stone);
      fallen.rotation.set(Math.PI / 2, 0.4, random() * 3);
      fallen.position.set(2, 2.1, 4.2);
      building.add(fallen);
    }
    building.position.set(x, site.y - 1.09, z);
    building.rotation.y = site.yaw;
    building.name = site.id;
    building.userData.site = site.id;
    group.add(building);
  }
  // Quay paving and a classical balustrade put articulated details in the foreground.
  for (let i = 0; i < 28; i++) {
    const xx = -72 + i * 5.3;
    box(group, [5.18, 0.18, 8], [xx, 1.05, 1], stone);
    if (period === 4 && i % 3 !== 0) continue;
    for (let j = 0; j < 4; j++) {
      const x = xx - 2 + j * 1.25;
      box(group, [0.22, 1, 0.22], [x, 1.64, 4.5], stone);
      box(group, [0.4, 0.14, 0.4], [x, 2.2, 4.5], stone);
    }
    if (!ruin || i % 3 === 0) box(group, [5.3, 0.14, 0.4], [xx, 2.34, 4.5], stone);
  }
  return group;
}
