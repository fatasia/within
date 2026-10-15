/** Small authored clearings: a two-and-a-half-metre trail and one woodland house footing. */
import type { Vec3 } from '../types';

export const XISHAN_PATH = { start: 43, end: 61, halfWidth: 1.25, shoulder: 3.6 } as const;
export const XISHAN_HOUSE = { x: 37, z: 11, height: 4.8, halfX: 2.7, halfZ: 2.1 } as const;

export const xishanPathCenter = (x: number): number => 46.8 + Math.sin((x - 47.5) * 0.25) * 0.25;
export const xishanPathHeight = (x: number): number => 2.45 + (x - 50.3) * 0.035;
export const XISHAN_CARAVAN_FOCUS: Vec3 = [
  50.3,
  xishanPathHeight(50.3) + 1.05,
  xishanPathCenter(50.3),
];
export const XISHAN_EAVE_FOCUS: Vec3 = [
  XISHAN_HOUSE.x,
  XISHAN_HOUSE.height + 1.7,
  XISHAN_HOUSE.z + 1.2,
];
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const pathDistance = (x: number, z: number) => {
  const along = Math.max(XISHAN_PATH.start, Math.min(XISHAN_PATH.end, x));
  return Math.hypot(x - along, z - xishanPathCenter(along));
};
const houseDistance = (x: number, z: number) =>
  Math.hypot(
    Math.max(0, Math.abs(x - XISHAN_HOUSE.x) - XISHAN_HOUSE.halfX),
    Math.max(0, Math.abs(z - XISHAN_HOUSE.z) - XISHAN_HOUSE.halfZ),
  );

/** Applied after the natural height field; rendering, roots, hooves and walking share it. */
export function blendXishanGround(x: number, z: number, naturalHeight: number): number {
  const pathWeight =
    1 - smooth((pathDistance(x, z) - XISHAN_PATH.halfWidth) / XISHAN_PATH.shoulder);
  let height = naturalHeight + (xishanPathHeight(x) - naturalHeight) * pathWeight;
  const houseWeight = 1 - smooth(houseDistance(x, z) / 2.8);
  height += (XISHAN_HOUSE.height - height) * houseWeight;
  return height;
}

/** Radius includes the whole crown/stone footprint, not only the object's centre. */
export function isXishanClearing(x: number, z: number, radius = 0): boolean {
  return (
    pathDistance(x, z) < XISHAN_PATH.halfWidth + 0.35 + radius ||
    houseDistance(x, z) < 0.35 + radius
  );
}
