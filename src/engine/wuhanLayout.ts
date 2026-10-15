import { clamp, noise } from './math';

/** An authored outer twig, kept stable across quality tiers and botanical revisions. */
export const WUHAN_FLOWER_FOCUS = [
  -18.572144375617874, 5.378182582874633, 10.007394084830734,
] as const;

/** Garden composition inspired by East Lake, not geographic survey coordinates. */
export const WUHAN_HILLS = [
  { x: -134, z: -129, radius: 61, height: 7, seed: 61, stretch: 0.72 },
  { x: -83, z: -136, radius: 67, height: 9, seed: 62, stretch: 0.66 },
  { x: -32, z: -127, radius: 59, height: 6, seed: 63, stretch: 0.73 },
  { x: 17, z: -139, radius: 67, height: 8, seed: 64, stretch: 0.68 },
  { x: 72, z: -134, radius: 64, height: 7, seed: 65, stretch: 0.7 },
  { x: 123, z: -141, radius: 67, height: 9, seed: 66, stretch: 0.7 },
] as const;

/** Shallow bays and a grassy headland, informed by ATLAS waterfront aerials.
 * Distances are composed for this scene, not surveyed coordinates. */
export function wuhanShore(x: number): number {
  const base = 8 + Math.sin(x * 0.024) * 4 + Math.sin(x * 0.061) * 1.1;
  const headland = Math.max(0, 1 - ((x + 72) / 33) ** 2);
  const bay = Math.max(0, 1 - ((x - 78) / 30) ** 2);
  return base - headland ** 2 * 8 + bay ** 2 * 1.8;
}

/** A wooded slope rises behind the promenade; the opposite bank stays low. */
export const WUHAN_BACK_SLOPES = [
  { x: -96, z: 114, radius: 83, height: 24, seed: 71, stretch: 0.8 },
  { x: 5, z: 127, radius: 91, height: 33, seed: 72, stretch: 0.8 },
  { x: 111, z: 112, radius: 80, height: 27, seed: 73, stretch: 0.8 },
] as const;

export function wuhanPath(x: number): number {
  // Keep the established hero trees and walking route stable while reshaping the water edge.
  return 15 + Math.sin(x * 0.024) * 4 + Math.sin(x * 0.061) * 1.1;
}

const ALL_HILLS = [...WUHAN_HILLS, ...WUHAN_BACK_SLOPES];

export function getWuhanGround(x: number, z: number): number {
  const shoreDistance = z - wuhanShore(x);
  const t = clamp((shoreDistance + 1.6) / 5.5);
  let height = -1.1 + t * t * (3 - 2 * t) * (2.4 + noise(x * 0.026, z * 0.026, 4301) * 0.32);
  // A broad, gently undulating far shore keeps the lake enclosed without mountain towers.
  for (const hill of ALL_HILLS) {
    const dx = (x - hill.x) / hill.radius;
    const dz = (z - hill.z) / (hill.radius * hill.stretch);
    const r = Math.sqrt(dx * dx + dz * dz);
    if (r < 1) {
      const undulation = 0.78 + noise(x * 0.055, z * 0.046, hill.seed) * 0.28;
      height = Math.max(height, Math.pow(1 - r * r, 2) * hill.height * undulation - 0.5);
    }
  }
  return height;
}

/** A small low pier is composed after the short timber landings visible in the aerials. */
export const WUHAN_PIER = { x: -69, width: 3.2, length: 9, height: 0.96 } as const;
export function wuhanWalkHeight(x: number, z: number): number {
  const ground = getWuhanGround(x, z);
  const edge = wuhanShore(WUHAN_PIER.x) + 2.1;
  if (
    Math.abs(x - WUHAN_PIER.x) < WUHAN_PIER.width * 0.5 &&
    z >= edge - WUHAN_PIER.length &&
    z <= edge
  )
    return Math.max(ground, WUHAN_PIER.height);
  return ground;
}
