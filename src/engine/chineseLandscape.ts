import * as THREE from 'three';
import type { PaintingId, Peak } from '../types';
import { clamp, noise } from './math';

export type ChineseLandscapeId = 'qianli' | 'fuchun' | 'xishan';
export function isChineseLandscape(id: PaintingId | undefined): id is ChineseLandscapeId {
  return id === 'qianli' || id === 'fuchun' || id === 'xishan';
}

/** Only distant mountain masses change: authored banks, roots and close-up footings stay put. */
export function chinesePeakHeight(peak: Peak, x: number, z: number): number | undefined {
  if (!isChineseLandscape(peak.profile) || peak.height <= 22 || peak.z >= -15) return undefined;
  const dx = (x - peak.x) / peak.radius;
  const dz = (z - peak.z) / (peak.radius * (peak.stretch ?? 0.8));
  const warp = 1 + (noise(dx * 3 + 5, dz * 3 + 7, peak.seed) - 0.5) * 0.24;
  const radius = Math.hypot(dx, dz) * warp;
  if (radius >= 1) return -0.25;
  // Continuous coast edge prevents a visible vertical skirt where the range meets water.
  const edge = 1 - THREE.MathUtils.smoothstep(radius, 0.73, 1);
  const grain = noise(dx * 5 + 8, dz * 5 + 8, peak.seed);
  let shape: number;
  if (peak.profile === 'fuchun') {
    // A leaning, angular main ridge with unequal shoulders, rather than a radial bell.
    const lean = dx + dz * 0.32 - 0.1;
    const fold = Math.max(
      Math.abs(lean) * (lean > 0 ? 1.18 : 0.78),
      Math.abs(dz + dx * 0.14) * 0.82,
    );
    shape = Math.pow(Math.max(0, 1 - fold), 1.43);
    const seam = Math.sin((dx + dz * 0.34) * 17 + peak.seed * 0.2);
    shape *= 0.86 + grain * 0.1 + seam * 0.035 * Math.min(radius * 4, 1);
  } else if (peak.profile === 'qianli') {
    // Broad blue caps and a subsidiary shoulder share a slanted ridge line.
    const ridge = dx - dz * 0.27 + Math.sin(dz * 3 + peak.seed) * 0.09;
    const shoulder = 0.86 + Math.cos(ridge * 7 + peak.seed * 0.35) * 0.09;
    const profile = Math.pow(Math.max(0, 1 - Math.pow(radius, 2.3)), 1.3);
    const crease = Math.pow(Math.max(0, Math.sin(ridge * 14 + dz * 2)), 3);
    shape = profile * shoulder * (0.9 + grain * 0.12 - crease * 0.055);
  } else {
    // The central mountain reads as one broad wall, with lobed crown and long fissures.
    const front = Math.abs(dz + 0.035 * Math.sin(dx * 5));
    const wall = Math.max(Math.abs(dx) * 0.91, front * 1.06);
    const cap = Math.pow(Math.max(0, 1 - Math.pow(wall, peak.height > 90 ? 5.2 : 3.4)), 0.59);
    const crown =
      0.87 + Math.sin(dx * 8 + peak.seed * 0.3) * 0.043 + Math.cos(dx * 13 - dz * 3) * 0.024;
    const seam = Math.pow(Math.max(0, Math.cos((dx + dz * 0.14) * 24 + peak.seed)), 9);
    shape = cap * (crown + grain * 0.035 - seam * 0.027);
  }
  return Math.max(-0.25, peak.height * shape * edge - 0.25);
}

const azurite = new THREE.Color('#367fa2');
const malachite = new THREE.Color('#709678');
const ochre = new THREE.Color('#a98a57');
const silk = new THREE.Color('#b8a776');
const paper = new THREE.Color('#c3bca2');
const ink = new THREE.Color('#686c5e');
const rockInk = new THREE.Color('#686852');
const wallLight = new THREE.Color('#96917a');

/** Mineral pigment and ink wash are spatially separated, not one elevation gradient. */
export function colorChineseRock(
  target: THREE.Color,
  id: ChineseLandscapeId,
  x: number,
  z: number,
  elevation: number,
  seed: number,
): void {
  const wash = noise(x * 0.085, z * 0.11, seed);
  const grain = noise(x * 0.39 + z * 0.07, z * 0.27, seed + 3);
  if (id === 'qianli') {
    const strata = 0.5 + Math.sin(x * 0.13 + z * 0.17 + wash * 2) * 0.5;
    const blue = THREE.MathUtils.smoothstep(elevation + strata * 0.1, 0.45, 0.88);
    const exposed = (1 - THREE.MathUtils.smoothstep(elevation, 0.12, 0.65)) * (0.35 + wash * 0.65);
    target
      .copy(malachite)
      .lerp(azurite, blue)
      .lerp(ochre, exposed * 0.76);
    target.lerp(silk, (1 - elevation) * (1 - grain) * 0.12);
    target.multiplyScalar(0.92 + grain * 0.13);
  } else if (id === 'fuchun') {
    const fold = Math.pow(Math.max(0, Math.sin(x * 0.21 + z * 0.08 + wash)), 4);
    const inkLoad = 0.13 + elevation * 0.2 + fold * 0.21 + wash * 0.17;
    target
      .copy(paper)
      .lerp(ink, clamp(inkLoad))
      .multiplyScalar(0.96 + grain * 0.07);
  } else {
    const crack = Math.pow(Math.max(0, Math.cos(x * 0.48 + z * 0.065 + wash * 0.45)), 12);
    target.copy(wallLight).lerp(rockInk, 0.26 + wash * 0.28 + elevation * 0.16 + crack * 0.17);
    target.multiplyScalar(0.91 + grain * 0.14);
  }
}

/** Continuous forest grouping: an empty shoulder matters as much as a dense grove. */
export function chineseForestDensity(
  id: ChineseLandscapeId,
  x: number,
  z: number,
  height: number,
  summit: number,
  seed: number,
): number {
  const grove = noise(x * 0.075 + 8, z * 0.09, seed + 19);
  if (id === 'fuchun') return clamp((grove - 0.32) * 1.6 + (height < 8 ? 0.15 : 0));
  if (id === 'qianli') return clamp((grove - 0.16) * 1.35);
  const crown = THREE.MathUtils.smoothstep(height / summit, 0.7, 0.87);
  return clamp(0.2 + grove * 0.62 + crown * 0.6);
}
