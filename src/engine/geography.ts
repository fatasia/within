import type { Painting } from '../types';
import { clamp, noise } from './math';

export function landscapeRiverCenter(painting: Pick<Painting, 'id'>, x: number): number {
  return painting.id === 'zhangjiajie'
    ? 14 + Math.sin(x * 0.022) * 5
    : -4 + Math.sin(x * 0.018) * 9;
}

/** A continuous valley floor, with a submerged channel rather than an ocean around peaks. */
export function landscapeBaseHeight(
  painting: Pick<Painting, 'id' | 'seed'>,
  x: number,
  z: number,
): number {
  if (painting.id !== 'zhangjiajie' && painting.id !== 'guilin') return -0.25;
  const center = landscapeRiverCenter(painting, x);
  const width = painting.id === 'zhangjiajie' ? 3.1 : 19;
  const distance = Math.abs(z - center);
  const shore = clamp((distance - width) / (painting.id === 'zhangjiajie' ? 3 : 5));
  const smooth = shore * shore * (3 - 2 * shore);
  return -1.2 + smooth * (2.35 + noise(x * 0.033, z * 0.033, painting.seed) * 0.65);
}

export function landscapeGround(
  painting: Pick<Painting, 'id' | 'seed'>,
  x: number,
  z: number,
  basePeakHeight: number,
): number {
  return Math.max(basePeakHeight, landscapeBaseHeight(painting, x, z));
}
