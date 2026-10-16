import type { PaintingId } from '../types';
import { wuhanPath } from './wuhanLayout';
import { landscapeRiverCenter } from './geography';
import { xishanPathCenter } from './xishanLayout';

/** Look along the route tangent so the first forward input follows dry ground. */
function alongPath(x: number, path: (x: number) => number, pitch = 0.04): WalkStart {
  return { x, z: path(x), yaw: Math.atan2(-3, path(x) - path(x + 3)), pitch };
}

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
  // Join the western trail before the pack train; the first three metres stay clear.
  xishan: alongPath(43.2, (x) => xishanPathCenter(x) - 0.7, 0.1),
  starry: { x: 0, z: 14, yaw: 0, pitch: 0.07 },
  // Quayside gap between civic buildings, rather than directly against a portico.
  empire: { x: 11, z: -0.5, yaw: 0.55, pitch: 0.18 },
  winter: { x: 0, z: 48, yaw: 0, pitch: 0.07 },
  // Southern approach, clear right-hand lane; no full-height figure against the camera.
  qingming: { x: -17.2, z: 29, yaw: 0, pitch: 0.08 },
  zhangjiajie: alongPath(-32, (x) => landscapeRiverCenter({ id: 'zhangjiajie' }, x) + 9, 0.12),
  guilin: alongPath(-32, (x) => landscapeRiverCenter({ id: 'guilin' }, x) + 28, 0.035),
  wuhan: alongPath(-14, wuhanPath, 0.025),
  arctic: { x: -34, z: 23, yaw: 0.18, pitch: 0.06 },
  dunhuang: { x: -42, z: 20, yaw: -0.1, pitch: 0.04 },
  huangshan: { x: -28, z: 28, yaw: 0.18, pitch: 0.12 },
  // Start on the stone approach so Leifeng Pagoda and the three legend
  // figures read at human scale instead of becoming a distant icon.
  xihu: { x: -18, z: 12, yaw: -0.18, pitch: 0.045 },
  kanas: { x: -35, z: 25, yaw: 0.12, pitch: 0.05 },
  deepsea: { x: -30, z: 20, yaw: 0.05, pitch: 0.03 },
  // West bank beside the cherry avenue, facing up the river towards the drum bridge.
  roadster: {x:-.38,z:.12,yaw:0,pitch:0},
  sakura: { x: -20, z: 16, yaw: -0.15, pitch: 0.05 },
} as const satisfies Record<PaintingId, WalkStart>;

export function getWalkStart(id: PaintingId): WalkStart {
  return WALK_STARTS[id];
}

/** Human-scale navigation needs peripheral vision; keep the cinematic lens for tours. */
export function walkFieldOfView(width: number, height: number): number {
  return width < height ? 66 : 62;
}
