import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Painting } from '../types';
import { seededRandom, noise } from './math';
import { groundHeight } from './terrain';

interface GroundPoint {
  x: number;
  y: number;
  z: number;
  slope: number;
}

/** Test the whole footprint, not only its centre, before placing bank-side objects. */
function dryGround(painting: Painting, x: number, z: number, radius: number): GroundPoint | null {
  const y = groundHeight(painting, x, z);
  const samples = [
    groundHeight(painting, x - radius, z),
    groundHeight(painting, x + radius, z),
    groundHeight(painting, x, z - radius),
    groundHeight(painting, x, z + radius),
  ];
  if (Math.min(y, ...samples) < 0.2) return null;
  return { x, y, z, slope: (Math.max(...samples) - Math.min(...samples)) / (2 * radius) };
}

function rockGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];
  const stone = new THREE.Color('#8a8771');
  const moss = new THREE.Color('#58654a');
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const weathering = noise(x * 4.1 + y, z * 4.1 - y, 701);
    const scale = 0.79 + weathering * 0.3;
    // Broad fractured shelves rather than spherical pebbles; flat buried foot.
    positions.setXYZ(i, x * scale, Math.max(-0.42, y * scale), z * scale);
    color.copy(stone).lerp(moss, y > 0.15 ? weathering * 0.7 : 0.04);
    color.multiplyScalar(0.8 + noise(x * 13 + y, z * 13, 9) * 0.3);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Five tapered, curved blades: solid geometry, with no alpha-texture overdraw. */
function grassGeometry(reed: boolean): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const random = seededRandom(reed ? 471 : 643);
  for (let blade = 0; blade < (reed ? 4 : 7); blade++) {
    const angle = random() * Math.PI * 2;
    const h = (reed ? 1.5 : 0.36) * (0.6 + random() * 0.65);
    const width = reed ? 0.042 : 0.065;
    const start = positions.length / 3;
    for (let segment = 0; segment <= 5; segment++) {
      const t = segment / 5;
      const bend = t * t * (reed ? 0.44 : 0.25);
      for (const side of [-1, 1]) {
        positions.push(
          Math.sin(angle) * bend + Math.cos(angle) * width * (1 - t) * side,
          t * h,
          Math.cos(angle) * bend - Math.sin(angle) * width * (1 - t) * side,
        );
      }
      if (segment < 5) {
        const n = start + segment * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    if (reed) {
      // A narrow tawny panicle at the tip, characteristic of riverside reeds.
      const n = positions.length / 3;
      const x = Math.sin(angle) * 0.44,
        z = Math.cos(angle) * 0.44;
      positions.push(x - 0.065, h - 0.06, z, x + 0.065, h - 0.06, z, x + 0.03, h + 0.29, z);
      indices.push(n, n + 1, n + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addInstances(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  matrices: THREE.Matrix4[],
  colors: THREE.Color[],
  name: string,
): void {
  if (!matrices.length) {
    geometry.dispose();
    material.dispose();
    return;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  mesh.name = name;
  matrices.forEach((matrix, i) => {
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, colors[i]!);
  });
  mesh.computeBoundingSphere();
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addFootpaths(group: THREE.Group, painting: Painting): void {
  const positions: number[] = [];
  const colors: number[] = [];
  const tint = new THREE.Color(painting.id === 'fuchun' ? '#b2ad92' : '#9b9678');
  for (const peak of painting.peaks.filter((p) => p.z > -8)) {
    const count = 100;
    const width = painting.id === 'xishan' ? 0.52 : 0.38;
    const edge = (t: number, side: number): THREE.Vector3 => {
      const x = peak.x + (t - 0.5) * peak.radius * 1.65;
      const z = peak.z + Math.sin(t * Math.PI * 1.25 + 0.3) * peak.radius * 0.4 + side * width;
      return new THREE.Vector3(x, groundHeight(painting, x, z) + 0.025, z);
    };
    for (let i = 0; i < count; i++) {
      const a = edge(i / count, -1),
        b = edge(i / count, 1);
      const c = edge((i + 1) / count, -1),
        d = edge((i + 1) / count, 1);
      if (Math.min(a.y, b.y, c.y, d.y) < 0.3 || Math.abs(a.y - c.y) > 0.8) continue;
      for (const vertex of [a, b, c, b, d, c]) {
        positions.push(vertex.x, vertex.y, vertex.z);
        const grain = 0.9 + noise(vertex.x * 2, vertex.z * 2, painting.seed) * 0.16;
        colors.push(tint.r * grain, tint.g * grain, tint.b * grain);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  mesh.name = 'Narrow earth paths following the bank';
  group.add(mesh);
}

/** Small woven creels and bamboo poles: restrained riverbank storytelling, not modern props. */
function addFishingGear(group: THREE.Group, painting: Painting, point: GroundPoint): void {
  const geometries: THREE.BufferGeometry[] = [];
  const basketRadius = 0.29;
  for (let ring = 0; ring < 8; ring++) {
    const radius = basketRadius * (0.78 + Math.sin((ring / 9) * Math.PI) * 0.25);
    const hoop = new THREE.TorusGeometry(radius, 0.012, 3, 18);
    hoop.rotateX(Math.PI / 2);
    hoop.translate(0, 0.06 + ring * 0.065, 0);
    geometries.push(hoop);
  }
  for (let rib = 0; rib < 16; rib++) {
    const angle = (rib / 16) * Math.PI * 2;
    const pole = new THREE.CylinderGeometry(0.009, 0.012, 0.53, 3);
    pole.translate(Math.cos(angle) * basketRadius * 0.9, 0.3, Math.sin(angle) * basketRadius * 0.9);
    geometries.push(pole);
  }
  // Slender planted bamboo rod, a gently sagging line, no oversized decorative net.
  const rodCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.7, 0, 0),
    new THREE.Vector3(0.78, 1.2, 0),
    new THREE.Vector3(1.12, 2.4, 0.15),
    new THREE.Vector3(1.72, 3.2, 0.45),
  ]);
  geometries.push(new THREE.TubeGeometry(rodCurve, 12, 0.021, 4, false));
  const geometry = mergeGeometries(geometries);
  geometries.forEach((part) => part.dispose());
  if (!geometry) return;
  const gear = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: '#8e7d53', roughness: 1 }),
  );
  gear.position.set(point.x, point.y, point.z);
  gear.name = 'Woven fishing creel and bamboo rod';
  group.add(gear);
  const linePoints = [new THREE.Vector3(point.x + 1.72, point.y + 3.2, point.z + 0.45)];
  const lineEndX = point.x + 2.6,
    lineEndZ = point.z + 0.8;
  linePoints.push(
    new THREE.Vector3(
      lineEndX,
      Math.max(0.23, groundHeight(painting, lineEndX, lineEndZ) + 0.15),
      lineEndZ,
    ),
  );
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(linePoints),
      new THREE.LineBasicMaterial({ color: '#746d54', transparent: true, opacity: 0.6 }),
    ),
  );
}

/** Grounded close-up vocabulary for the three Chinese landscape paintings. */
export function buildNearDetails(painting: Painting): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Grounded riverbank details';
  if (!['qianli', 'fuchun', 'xishan'].includes(painting.id)) return group;
  const random = seededRandom(painting.seed + 881);
  const rocks: THREE.Matrix4[] = [],
    rockColors: THREE.Color[] = [];
  const grasses: THREE.Matrix4[] = [],
    grassColors: THREE.Color[] = [];
  const reeds: THREE.Matrix4[] = [],
    reedColors: THREE.Color[] = [];
  const dummy = new THREE.Object3D();
  const fishingSpots: GroundPoint[] = [];
  const leaf = new THREE.Color(painting.palette.leaf);
  for (const peak of painting.peaks) {
    if (peak.z < -10) continue;
    for (let i = 0; i < 420; i++) {
      const x = peak.x + (random() - 0.5) * peak.radius * 2;
      const z = peak.z + (random() - 0.5) * peak.radius * 1.7;
      const point = dryGround(painting, x, z, 0.32);
      if (!point || point.y > 15 || point.slope > 1.65) continue;
      const bank = point.y < 2.1;
      const scale = 0.25 + random() * (painting.id === 'xishan' ? 1.8 : 0.75);
      dummy.rotation.set(0, random() * Math.PI * 2, 0);
      if (i % (painting.id === 'xishan' ? 3 : 5) === 0) {
        const footprint = dryGround(painting, x, z, scale * 0.8);
        if (footprint && footprint.slope < 1.4) {
          // Slightly buried bases leave no hovering stones even on irregular ground.
          dummy.position.set(x, point.y + scale * 0.12, z);
          dummy.scale.set(scale * (1.1 + random() * 0.8), scale * (0.45 + random() * 0.6), scale);
          dummy.updateMatrix();
          rocks.push(dummy.matrix.clone());
          rockColors.push(new THREE.Color().setScalar(0.85 + random() * 0.3));
        }
      } else {
        if (point.slope > 0.8 || noise(x * 0.27, z * 0.27, 31) < 0.35) continue;
        dummy.position.set(x, point.y + 0.025, z);
        dummy.scale.setScalar(0.6 + random() * 0.9);
        dummy.updateMatrix();
        const isReed = bank && painting.id !== 'xishan';
        (isReed ? reeds : grasses).push(dummy.matrix.clone());
        (isReed ? reedColors : grassColors).push(
          isReed
            ? new THREE.Color('#aaa078').multiplyScalar(0.8 + random() * 0.25)
            : leaf.clone().lerp(new THREE.Color('#96956a'), random() * 0.5),
        );
      }
      if (
        bank &&
        point.y > 0.6 &&
        point.slope < 0.16 &&
        fishingSpots.length < 2 &&
        fishingSpots.every((p) => Math.hypot(p.x - x, p.z - z) > 35)
      ) {
        fishingSpots.push(point);
      }
    }
  }
  addInstances(
    group,
    rockGeometry(),
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
    }),
    rocks,
    rockColors,
    'Weathered mossy bank stones',
  );
  addInstances(
    group,
    grassGeometry(false),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    grasses,
    grassColors,
    'Sparse fine grass tufts',
  );
  addInstances(
    group,
    grassGeometry(true),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    reeds,
    reedColors,
    'Dry-bank reed clusters',
  );
  addFootpaths(group, painting);
  if (painting.id !== 'xishan')
    fishingSpots.forEach((point) => addFishingGear(group, painting, point));
  return group;
}
