import type { Peak } from '../types';
import { clamp, noise } from './math';

/** Shared interpretive harbour plan; the same rock and sites survive all five periods. */
export const EMPIRE_PEAKS: Peak[] = [
  { profile: 'empire', x: 82, z: -76, radius: 46, height: 43, stretch: 0.82, seed: 18360 },
  { profile: 'empire', x: -93, z: -89, radius: 49, height: 19, stretch: 1.02, seed: 18361 },
  { profile: 'empire', x: -52, z: -47, radius: 43, height: 12, stretch: 0.9, seed: 18362 },
  { profile: 'empire', x: 108, z: -42, radius: 35, height: 17, stretch: 0.8, seed: 18363 },
];

export const EMPIRE_SITES = [
  { id: 'western-portico', x: -55, z: -13, y: 1.05, kind: 0, yaw: -0.12, height: 5.8 },
  { id: 'western-civic-hall', x: -77, z: -35, y: 4.6, kind: 1, yaw: -0.25, height: 7.2 },
  { id: 'upper-rotunda', x: -54, z: -53, y: 10.5, kind: 2, yaw: 0, height: 9.5 },
  { id: 'inner-quay-portico', x: -29, z: -30, y: 3, kind: 0, yaw: -0.3, height: 5.1 },
  { id: 'distant-west-hall', x: -18, z: -59, y: 5.6, kind: 1, yaw: -0.45, height: 5.5 },
  { id: 'eastern-portico', x: 61, z: -15, y: 1.05, kind: 0, yaw: 0.35, height: 5.5 },
  { id: 'eastern-civic-hall', x: 87, z: -37, y: 5.5, kind: 1, yaw: 0.45, height: 7.5 },
  { id: 'headland-colonnade', x: 62, z: -43, y: 4.2, kind: 0, yaw: 0.65, height: 5.3 },
] as const;

const smooth = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function empirePeakHeight(peak: Peak, x: number, z: number): number {
  const dx = (x - peak.x) / peak.radius;
  const dz = (z - peak.z) / (peak.radius * (peak.stretch ?? 0.8));
  const distance = Math.hypot(dx, dz);
  if (distance >= 1) return -0.25;
  if (peak.seed === 18360) {
    // A steep left face and a long back-sloping shoulder, not a symmetric cone.
    const cliff = 1 - smooth(0.56, 1, distance);
    const shoulder = 1 - Math.max(-0.25, dx) * 0.31 + dz * 0.035;
    const ledges = Math.sin((x + z * 0.28) * 0.16) * 0.6;
    const cap = Math.exp(-(((x - 65) / 5) ** 4 + ((z + 80) / 4.4) ** 4)) * 4.8;
    return Math.max(0, peak.height * cliff * shoulder + ledges * cliff + cap);
  }
  const relief = (1 - distance * distance) ** 1.65;
  return peak.height * relief * (0.91 + noise(x * 0.035, z * 0.043, peak.seed) * 0.18);
}

export function getEmpireGround(x: number, z: number): number {
  const westEdge = 5 - Math.max(0, -z - 10) * 0.12;
  const eastEdge = 44 + Math.max(0, -z - 20) * 0.14;
  const west = smooth(0, 3.5, westEdge - x) * (1 - smooth(126, 145, -x));
  const east = smooth(0, 4, x - eastEdge) * (1 - smooth(130, 153, x));
  const land = Math.max(west, east) * (1 - smooth(1, 6, z));
  let height = -0.35 + land * 1.4;
  for (const peak of EMPIRE_PEAKS) {
    const relief = empirePeakHeight(peak, x, z);
    if (relief > 0) height = Math.max(height, relief);
  }
  // The existing walking entrance and foreground episodes remain on a narrow continuous quay.
  const promenade = (1 - smooth(2.5, 5, Math.abs(z + 1))) * (1 - smooth(79, 87, Math.abs(x)));
  height = Math.max(height, -0.35 + promenade * 1.4);
  let weightSum = 0,
    platformSum = 0,
    strongest = 0;
  for (const site of EMPIRE_SITES) {
    const dx = Math.abs(x - site.x),
      dz = Math.abs(z - site.z);
    // Rotated porticos fit within a small level foundation; feather its edge into the hill.
    const distance = Math.hypot(Math.max(0, dx - 10.8), Math.max(0, dz - 8.4));
    if (distance === 0) return site.y;
    const blend = 1 - smooth(0, 5.5, distance);
    const weight = blend / Math.max(1e-8, (1 - blend) ** 2);
    weightSum += weight;
    platformSum += site.y * weight;
    strongest = Math.max(strongest, blend);
  }
  if (weightSum > 0) height += (platformSum / weightSum - height) * strongest;
  return height;
}
