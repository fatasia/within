import type { PaintingId } from '../types';
import { wuhanPath } from './wuhanLayout';

export interface WalkStart {
  readonly x: number;
  readonly z: number;
  /** Radians; zero faces north (-Z), positive turns toward -X. */
  readonly yaw: number;
  readonly pitch: number;
}

/**
 * Authored clearings, not peak centres: the latter can be occupied by a house or tree.
 * Height remains terrain-relative (groundHeight + eye height) in the camera controller.
 */
export const WALK_STARTS = {
  // West bank: open water ahead, the near bank and pines frame the right edge.
  qianli: { x: -56, z: 16, yaw: 0.65, pitch: 0.05 },
  // A gentle clearing between the cottages, looking across the river to the east.
  fuchun: { x: -41.4, z: 10.4, yaw: -0.65, pitch: 0.04 },
  // Northeastern edge of the low foreground bank: bridge and waterfall remain visible.
  xishan: { x: -3.2, z: 28.9, yaw: 0, pitch: 0.18 },
  starry: { x: 0, z: 14, yaw: 0, pitch: 0.07 },
  // Quayside gap between civic buildings, rather than directly against a portico.
  empire: { x: 11, z: -0.5, yaw: 0.55, pitch: 0.18 },
  winter: { x: 0, z: 48, yaw: 0, pitch: 0.07 },
  qingming: { x: -20, z: 22.34, yaw: 0, pitch: 0.04 },
  zhangjiajie: { x: -32, z: 19.76, yaw: 0, pitch: 0.2 },
  guilin: { x: -32, z: 19.1, yaw: 0, pitch: 0.06 },
  wuhan: { x: -14, z: wuhanPath(-14), yaw: 0, pitch: 0.025 },
} as const satisfies Record<PaintingId, WalkStart>;

export function getWalkStart(id: PaintingId): WalkStart {
  return WALK_STARTS[id];
}

/** Human-scale navigation needs peripheral vision; keep the cinematic lens for tours. */
export function walkFieldOfView(width: number, height: number): number {
  return width < height ? 66 : 62;
}
