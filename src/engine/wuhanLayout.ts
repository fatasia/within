import { clamp, noise } from './math';

/** Garden composition inspired by East Lake, not geographic survey coordinates. */
export const WUHAN_HILLS = [
  { x: -105, z: -126, radius: 57, height: 14, seed: 61, stretch: 0.72 },
  { x: -27, z: -139, radius: 64, height: 19, seed: 62, stretch: 0.7 },
  { x: 63, z: -133, radius: 69, height: 16, seed: 63, stretch: 0.65 },
] as const;

export function wuhanShore(x: number): number {
  return 8 + Math.sin(x * 0.024) * 4 + Math.sin(x * 0.061) * 1.1;
}

export function wuhanPath(x: number): number {
  return wuhanShore(x) + 7;
}

export function getWuhanGround(x: number, z: number): number {
  const shoreDistance = z - wuhanShore(x);
  const t = clamp((shoreDistance + 1.6) / 5.5);
  let height = -1.1 + t * t * (3 - 2 * t) * (2.4 + noise(x * 0.026, z * 0.026, 4301) * 0.32);
  // A broad, gently undulating far shore keeps the lake enclosed without mountain towers.
  for (const hill of WUHAN_HILLS) {
    const dx = (x - hill.x) / hill.radius;
    const dz = (z - hill.z) / (hill.radius * hill.stretch);
    const r = Math.sqrt(dx * dx + dz * dz);
    if (r < 1) height = Math.max(height, Math.pow(1 - r * r, 2) * hill.height - 0.5);
  }
  return height;
}
