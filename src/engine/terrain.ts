import * as THREE from 'three';
import type { Painting, Peak } from '../types';
import { clamp, fbm, noise, seededRandom } from './math';
import { landscapeGround } from './geography';
import { cityGround } from './cityLayout';

/** A continuous, deterministic height field shared by rendering and walking collision. */
export function peakHeight(peak: Peak, x: number, z: number): number {
  const dx = (x - peak.x) / peak.radius,
    dz = (z - peak.z) / (peak.radius * (peak.stretch ?? 0.8));
  // Domain warping breaks circular coastlines without discontinuities at the summit.
  const warp = 1 + (noise(dx * 3 + 5, dz * 3 + 7, peak.seed) - 0.5) * 0.24;
  const distance = Math.sqrt(dx * dx + dz * dz) * warp;
  if (distance >= 1) return -0.25;
  if (peak.profile === 'zhangjiajie') {
    const cap = Math.pow(1 - Math.pow(distance, 8), 0.43);
    const lowFrequency = noise(dx * 1.6 + 5, dz * 1.6 + 7, peak.seed);
    const edgeDetail =
      noise(dx * 8 + 3, dz * 8 + 2, peak.seed) * 0.025 * Math.min(1, distance * distance * 2);
    return Math.max(-0.25, peak.height * cap * (0.91 + lowFrequency * 0.075 + edgeDetail) - 0.25);
  }
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
  return Math.max(
    -0.25,
    peak.height * silhouette * (0.76 + surface * detail + ridges * ridgeStrength) - 0.25,
  );
}
export function groundHeight(painting: Painting, x: number, z: number): number {
  if (painting.id === 'qingming') return cityGround(x, z, true);
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
  if (painting.id === 'empire' && z < 1 && x > -95 && x < 100) height = Math.max(height, 1.05);
  if (painting.id === 'zhangjiajie' || painting.id === 'guilin')
    return landscapeGround(painting, x, z, height);
  return height;
}
export function makePaperTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#bdb9aa';
  ctx.fillRect(0, 0, 512, 512);
  const random = seededRandom(seed);
  for (let i = 0; i < 18000; i++) {
    const shade = Math.floor(95 + random() * 110);
    ctx.strokeStyle = `rgba(${shade},${shade},${shade},${0.1 + random() * 0.3})`;
    const x = random() * 512,
      y = random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 2, y + random() * 15);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  return texture;
}
/** One stitched surface, not intersecting radial islands. */
export function buildTerrain(painting: Painting): { group: THREE.Group; texture: THREE.Texture } {
  const group = new THREE.Group();
  group.name = 'Continuous painted landscape';
  const winter = painting.id === 'winter';
  const texture = makePaperTexture(painting.seed);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    bumpMap: winter ? null : texture,
    map: winter ? null : texture,
    bumpScale: painting.id === 'starry' ? 0.4 : 0.18,
    side: THREE.DoubleSide,
  });
  const low = new THREE.Color(painting.id === 'qianli' ? '#54977e' : painting.palette.low);
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
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  const positions = geometry.attributes.position!;
  const colors: number[] = [];
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    const height = painting.id === 'qingming' ? cityGround(x, z) : groundHeight(painting, x, z);
    positions.setY(i, winter && height <= 0.66 ? -0.25 : height);
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
    if (winter) {
      const slopeX = groundHeight(painting, x + 0.6, z) - height;
      const slopeZ = groundHeight(painting, x, z + 0.6) - height;
      // White snow sits on broad shoulders; steep cuts retain cold blue rock.
      const snow = clamp(1.05 - Math.hypot(slopeX, slopeZ) * 0.7) * clamp(height / 15);
      color.copy(new THREE.Color('#48678b')).lerp(light, clamp(snow * 0.8 + elevation * 0.55));
    } else if (painting.id === 'zhangjiajie' || painting.id === 'guilin') {
      const gx = groundHeight(painting, x + 0.35, z) - height;
      const gz = groundHeight(painting, x, z + 0.35) - height;
      const steepness = clamp(Math.hypot(gx, gz));
      color
        .copy(new THREE.Color(painting.id === 'zhangjiajie' ? '#777164' : '#9a9b88'))
        .lerp(low, 1 - steepness);
      color.multiplyScalar(0.83 + n * 0.3);
      if (painting.id === 'zhangjiajie')
        color.multiplyScalar(0.94 + Math.sin(height * 1.7 + x * 0.16) * 0.045);
    } else {
      color.lerp(light, (1 - elevation) * n * 0.23);
      color.multiplyScalar(0.88 + n * 0.22);
    }
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  group.add(mesh);
  if (!winter && painting.id !== 'starry' && painting.id !== 'qingming') {
    const strokePositions: number[] = [];
    const random = seededRandom(painting.seed);
    for (let i = 0; i < 4800; i++) {
      const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
      const h = groundHeight(painting, x, z);
      if (h < 2) continue;
      const steps = painting.id === 'fuchun' ? 5 : 3;
      let px = x,
        pz = z,
        py = h;
      for (let j = 0; j < steps; j++) {
        const nx = px + 0.16 * Math.sin(z + j),
          nz = pz + 0.25 + random() * 0.4;
        const ny = groundHeight(painting, nx, nz);
        if (ny > 1) strokePositions.push(px, py + 0.08, pz, nx, ny + 0.08, nz);
        px = nx;
        pz = nz;
        py = ny;
      }
    }
    const strokes = new THREE.BufferGeometry();
    strokes.setAttribute('position', new THREE.Float32BufferAttribute(strokePositions, 3));
    group.add(
      new THREE.LineSegments(
        strokes,
        new THREE.LineBasicMaterial({
          color: painting.palette.ink,
          transparent: true,
          opacity: painting.id === 'fuchun' ? 0.21 : 0.12,
          depthWrite: false,
        }),
      ),
    );
  }
  return { group, texture };
}
