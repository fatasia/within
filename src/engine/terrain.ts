import * as THREE from 'three';
import type { Painting, Peak } from '../types';
import { clamp, fbm, noise, seededRandom } from './math';
import { landscapeGround } from './geography';
import { cityGround, qingmingRiver, qingmingMainStreet } from './cityLayout';
import { getWuhanGround } from './wuhanLayout';
import { blendXishanGround } from './xishanLayout';
import { chinesePeakHeight, colorChineseRock, isChineseLandscape } from './chineseLandscape';
import { rockLandformHeight, colorRockLandform, addRockSurface } from './rockLandforms';
import { empirePeakHeight, getEmpireGround } from './empireLandform';
import { snowHeight } from './featuredArctic';
import { duneHeight } from './featuredDunhuang';
import { kanasGroundY } from './featuredKanas';
import { bedHeight } from './featuredDeepsea';
import { bankHeight } from './featuredSakura';
import { xihuGroundY } from './featuredXihu';

const FEATURED_IDS = new Set([
  'roadster',
  'arctic',
  'dunhuang',
  'huangshan',
  'xihu',
  'kanas',
  'deepsea',
  'sakura',
]);

/**
 * Featured worlds own their relief: each entry delegates to the scene's own
 * surface function so walking matches the visible terrain exactly.  Scenes
 * without open water never return 0; lake/river scenes return 0 offshore.
 */
const FEATURED_GROUND: Record<string, (x: number, z: number) => number> = {
  roadster: () => .8,
  arctic: (x, z) => (z > -26 ? Math.max(snowHeight(x, z), 0.36) : 0),
  dunhuang: (x, z) => Math.max(duneHeight(x, z), 0.36),
  huangshan: () => 0.6,
  xihu: (x, z) => Math.max(0, xihuGroundY(x, z)),
  kanas: (x, z) => {
    const y = kanasGroundY(x, z);
    return y > 0.5 ? y : 0;
  },
  deepsea: bedHeight,
  sakura: (x, z) => {
    const y = bankHeight(x, z);
    return y > 0.4 ? y : 0;
  },
};

/** A continuous, deterministic height field shared by rendering and walking collision. */
export function peakHeight(peak: Peak, x: number, z: number): number {
  if (peak.profile === 'empire') return empirePeakHeight(peak, x, z);
  const rock = rockLandformHeight(peak, x, z);
  if (rock !== undefined) return rock;
  const authored = chinesePeakHeight(peak, x, z);
  if (authored !== undefined && z <= -24) return authored;
  const dx = (x - peak.x) / peak.radius,
    dz = (z - peak.z) / (peak.radius * (peak.stretch ?? 0.8));
  // Domain warping breaks circular coastlines without discontinuities at the summit.
  const warp = 1 + (noise(dx * 3 + 5, dz * 3 + 7, peak.seed) - 0.5) * 0.24;
  const distance = Math.sqrt(dx * dx + dz * dz) * warp;
  if (distance >= 1) return -0.25;
  const angle = Math.atan2(dz, dx);
  const ridges =
    (Math.sin(angle * 7 + distance * 4 + peak.seed) * 0.06 +
      Math.sin(angle * 13 - distance * 7) * 0.025) *
    Math.min(1, distance * 5);
  const surface = fbm(dx * 4.5 + 8, dz * 4.5 + 8, peak.seed);
  const power =
    peak.profile === 'guilin'
      ? 4
      : peak.profile === 'xishan' && peak.height > 90
        ? 6
        : peak.profile === 'qianli'
          ? 2.35
          : peak.profile === 'winter'
            ? 1.45
            : 2;
  const silhouette = Math.pow(
    1 - Math.pow(distance, power),
    peak.profile === 'guilin'
      ? 1.3
      : peak.height > 90
        ? 0.58
        : peak.profile === 'fuchun'
          ? 2.2
          : peak.profile === 'winter'
            ? 1.1
            : 1.65,
  );
  const detail =
    peak.profile === 'winter'
      ? 0.18
      : peak.profile === 'fuchun' || peak.profile === 'starry'
        ? 0.23
        : 0.28;
  const ridgeStrength = peak.profile === 'fuchun' ? 0.16 : peak.profile === 'winter' ? 0.28 : 0.35;
  const natural = Math.max(
    -0.25,
    peak.height * silhouette * (0.76 + surface * detail + ridges * ridgeStrength) - 0.25,
  );
  return authored === undefined
    ? natural
    : THREE.MathUtils.lerp(natural, authored, 1 - THREE.MathUtils.smoothstep(z, -24, -14));
}
export function groundHeight(painting: Painting, x: number, z: number): number {
  // Featured worlds own their relief (ice, cave, cloud sea, lake, forest and
  // seabed).  Do not leak the painting's generic peak field into those scenes;
  // it produces unrelated mountains behind the authored composition.
  const featured = FEATURED_GROUND[painting.id];
  if (featured) return featured(x, z);
  if (painting.id === 'empire') return getEmpireGround(x, z);
  if (painting.id === 'qingming') return cityGround(x, z, true);
  if (painting.id === 'wuhan') return getWuhanGround(x, z);
  let height = -0.25;
  for (const peak of painting.peaks) {
    const h = peakHeight(peak, x, z);
    if (h > 0.2 && height > 0.2) {
      const blend = Math.max(0, 1 - Math.abs(height - h) / 3);
      height = Math.max(height, h) + blend * blend * 0.75;
    } else height = Math.max(height, h);
  }
  if (painting.id === 'starry')
    height = Math.max(height, 0.6 + noise(x * 0.025, z * 0.025, 12) * 0.6);
  if (painting.id === 'winter') height = Math.max(height, 0.65);
  if (painting.id === 'zhangjiajie' || painting.id === 'guilin')
    return landscapeGround(painting, x, z, height);
  if (painting.id === 'xishan') return blendXishanGround(x, z, height);
  return height;
}
export function makePaperTexture(seed: number, style?: Painting['id']): THREE.CanvasTexture {
  const steps = makePaperTextureSteps(seed, style);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
function* makePaperTextureSteps(
  seed: number,
  style?: Painting['id'],
): Generator<void, THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isChineseLandscape(style) ? '#e1dfd4' : '#bdb9aa';
  ctx.fillRect(0, 0, 512, 512);
  const random = seededRandom(seed);
  for (let i = 0; i < 18000; i++) {
    if (i > 0 && i % 768 === 0) yield;
    const shade = Math.floor(95 + random() * 110);
    ctx.strokeStyle = `rgba(${shade},${shade},${shade},${0.1 + random() * 0.3})`;
    const x = random() * 512,
      y = random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 2, y + random() * 15);
    ctx.stroke();
  }
  if (isChineseLandscape(style)) {
    // Dry brush is separate from the pigment field. These strokes model surface character,
    // not a claim that each painted mark was traced from the reference.
    for (let i = 0; i < (style === 'xishan' ? 11500 : 2700); i++) {
      if (i > 0 && i % 768 === 0) yield;
      const x = random() * 512,
        y = random() * 512;
      ctx.strokeStyle = `rgba(72,69,52,${0.04 + random() * (style === 'fuchun' ? 0.14 : 0.1)})`;
      ctx.lineWidth = 0.45 + random() * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (style === 'xishan') ctx.lineTo(x + (random() - 0.5) * 1.2, y + 1 + random() * 3);
      else {
        const length = style === 'fuchun' ? 8 + random() * 28 : 5 + random() * 13;
        ctx.bezierCurveTo(
          x + length * 0.08,
          y + length * 0.3,
          x + length * 0.3,
          y + length * 0.7,
          x + length * 0.34,
          y + length,
        );
      }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.setScalar(style === 'qingming' ? 42 : 7);
  return texture;
}
/** One stitched surface, not intersecting radial islands. */
export interface TerrainResult {
  group: THREE.Group;
  texture: THREE.Texture;
}
export function buildTerrain(painting: Painting): TerrainResult {
  const steps = buildTerrainSteps(painting);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
/** Yield between bounded CPU batches; the caller owns resources only after completion. */
export function* buildTerrainSteps(painting: Painting): Generator<void, TerrainResult> {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  let texture: THREE.CanvasTexture | undefined;
  let completed = false;
  try {
    const group = new THREE.Group();
    group.name = 'Continuous painted landscape';
    const winter = painting.id === 'winter' || painting.id === 'arctic';
    const featuredFlat = FEATURED_IDS.has(painting.id);
    const rockLandscape = painting.id === 'zhangjiajie' || painting.id === 'guilin';
    texture = yield* makePaperTextureSteps(painting.seed, painting.id);
    yield;
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      bumpMap: winter || rockLandscape ? null : texture,
      map: winter || rockLandscape ? null : texture,
      bumpScale: painting.id === 'starry' ? 0.4 : painting.id === 'qingming' ? 0.045 : 0.18,
      side: THREE.DoubleSide,
    });
    materials.push(material);
    const winterRock = new THREE.Color('#48678b');
    const low = new THREE.Color(painting.id === 'qianli' ? '#54977e' : painting.palette.low);
    if (rockLandscape) addRockSurface(material, painting.id === 'zhangjiajie');
    const high = new THREE.Color(painting.id === 'qianli' ? '#216d8c' : painting.palette.high);
    const light = new THREE.Color(
      winter ? '#e9f1f6' : painting.id === 'fuchun' ? '#b0b19b' : '#a5b17b',
    );
    const bounds = painting.peaks.reduce(
      (b, p) => ({
        minX: Math.min(b.minX, p.x - p.radius * 1.17),
        maxX: Math.max(b.maxX, p.x + p.radius * 1.17),
        minZ: Math.min(b.minZ, p.z - p.radius * (p.stretch ?? 0.8) * 1.17),
        maxZ: Math.max(b.maxZ, p.z + p.radius * (p.stretch ?? 0.8) * 1.17),
      }),
      { minX: -140, maxX: 140, minZ: -115, maxZ: 80 },
    );
    const geometry = new THREE.PlaneGeometry(
      bounds.maxX - bounds.minX,
      bounds.maxZ - bounds.minZ,
      painting.id === 'qingming' ? 180 : 320,
      painting.id === 'qingming' ? 110 : 220,
    );
    geometries.push(geometry);
    yield;
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    const positions = geometry.attributes.position!;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      if (i > 0 && i % 640 === 0) yield;
      const x = positions.getX(i),
        z = positions.getZ(i);
      const height = painting.id === 'qingming' ? cityGround(x, z) : groundHeight(painting, x, z);
      positions.setY(i, featuredFlat ? -0.27 : winter && height <= 0.66 ? -0.25 : height);
      let summit = 30,
        strongest = -1;
      for (const peak of painting.peaks) {
        const h = peakHeight(peak, x, z);
        if (h > strongest) {
          strongest = h;
          summit = peak.height;
        }
      }
      const elevation = clamp(height / summit);
      const n = fbm(x * 0.1, z * 0.1, painting.seed);
      color.copy(low).lerp(high, clamp(elevation * 1.4));
      if (painting.id === 'qingming') {
        // Dry packed-earth paths, darker damp bank and mottled unused ground.
        // All colour stays on the terrain, with no coplanar decorative decals.
        const bankDistance = Math.abs(z - qingmingRiver(x));
        const laneDistance = Math.min(Math.abs(bankDistance - 17), Math.abs(z - qingmingMainStreet(x)));
        const dryLane = Math.exp(-laneDistance * laneDistance / 9);
        const wetBank = Math.exp(-((bankDistance - 12.3) ** 2) / 2);
        color.copy(low).multiplyScalar(0.84 + n * 0.27 + dryLane * 0.08 - wetBank * 0.2);
      } else if (isChineseLandscape(painting.id)) {
        colorChineseRock(color, painting.id, x, z, elevation, painting.seed);
      } else if (winter) {
        const slopeX = groundHeight(painting, x + 0.6, z) - height;
        const slopeZ = groundHeight(painting, x, z + 0.6) - height;
        // White snow sits on broad shoulders; steep cuts retain cold blue rock.
        const snow = clamp(1.05 - Math.hypot(slopeX, slopeZ) * 0.7) * clamp(height / 15);
        color.copy(winterRock).lerp(light, clamp(snow * 0.8 + elevation * 0.55));
      } else if (painting.id === 'zhangjiajie' || painting.id === 'guilin') {
        const gx = groundHeight(painting, x + 0.35, z) - height;
        const gz = groundHeight(painting, x, z + 0.35) - height;
        const steepness = clamp(Math.hypot(gx, gz));
        colorRockLandform(
          color,
          low,
          painting.id === 'zhangjiajie',
          x,
          z,
          height,
          steepness,
          painting.seed,
        );
      } else {
        color.lerp(light, (1 - elevation) * n * 0.23);
        color.multiplyScalar(0.88 + n * 0.22);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    yield;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    // Flat city ground receives buildings' shadows but must not self-shadow at sunset.
    if (painting.id === 'qingming') mesh.userData.receiveShadowOnly = true;
    group.add(mesh);
    yield;
    if (
      !winter &&
      painting.id !== 'starry' &&
      painting.id !== 'qingming' &&
      painting.id !== 'wuhan' &&
      !rockLandscape
    ) {
      const strokePositions: number[] = [];
      const random = seededRandom(painting.seed);
      for (let i = 0; i < 4800; i++) {
        if (i > 0 && i % 128 === 0) yield;
        const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
        const h = groundHeight(painting, x, z);
        if (h < 2) continue;
        const chinese = isChineseLandscape(painting.id);
        const steps = painting.id === 'fuchun' ? 9 : painting.id === 'xishan' ? 2 : chinese ? 4 : 3;
        const gx = groundHeight(painting, x + 0.45, z) - groundHeight(painting, x - 0.45, z);
        const gz = groundHeight(painting, x, z + 0.45) - groundHeight(painting, x, z - 0.45);
        const slopeLength = Math.max(0.3, Math.hypot(gx, gz));
        const flowX = isChineseLandscape(painting.id) ? -gx / slopeLength : 0;
        const flowZ = isChineseLandscape(painting.id) ? -gz / slopeLength : 1;
        let px = x,
          pz = z,
          py = h;
        for (let j = 0; j < steps; j++) {
          const length = !chinese
            ? 0
            : painting.id === 'xishan'
              ? 0.12 + random() * 0.16
              : 0.3 + random() * 0.4;
          const nx = isChineseLandscape(painting.id)
              ? px +
                flowX * length +
                Math.sin(z * 0.4 + j * 0.6) * (painting.id === 'fuchun' ? 0.14 : 0.06)
              : px + 0.16 * Math.sin(z + j),
            nz = isChineseLandscape(painting.id) ? pz + flowZ * length : pz + 0.25 + random() * 0.4;
          const ny = groundHeight(painting, nx, nz);
          if (ny > 1) strokePositions.push(px, py + 0.08, pz, nx, ny + 0.08, nz);
          px = nx;
          pz = nz;
          py = ny;
        }
      }
      if (painting.id === 'xishan') {
        const main = painting.peaks.find((peak) => peak.height > 90);
        if (main)
          for (let seam = 0; seam < 13; seam++) {
            yield;
            let previous: THREE.Vector3 | null = null;
            for (let step = 0; step <= 56; step++) {
              const t = step / 56;
              const x =
                main.x +
                (seam - 6) * main.radius * 0.105 +
                Math.sin(t * 8 + seam) * 0.5 +
                t * ((seam % 3) - 1) * 1.2;
              const z = main.z - 5 + t * main.radius * 0.72;
              const h = groundHeight(painting, x, z);
              const point = new THREE.Vector3(x, h + 0.1, z);
              if (previous && h > 3 && previous.y > 3 && step % 17 !== 0)
                strokePositions.push(previous.x, previous.y, previous.z, point.x, point.y, point.z);
              previous = point;
            }
          }
      }
      yield;
      const strokes = new THREE.BufferGeometry();
      geometries.push(strokes);
      strokes.setAttribute('position', new THREE.Float32BufferAttribute(strokePositions, 3));
      const strokeMaterial = new THREE.LineBasicMaterial({
        color: painting.palette.ink,
        transparent: true,
        opacity:
          painting.id === 'fuchun'
            ? 0.28
            : painting.id === 'xishan'
              ? 0.2
              : painting.id === 'qianli'
                ? 0.14
                : 0.12,
        depthWrite: false,
      });
      materials.push(strokeMaterial);
      group.add(new THREE.LineSegments(strokes, strokeMaterial));
    }
    completed = true;
    return { group, texture };
  } finally {
    // A superseded scene can stop at any yield before the result is attached.
    if (!completed) {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      texture?.dispose();
    }
  }
}
