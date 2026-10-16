const ease = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};
/** The river recedes from the city-end streets rather than bisecting the whole scroll. */
export const qingmingRiver = (x: number): number =>
  5 + Math.sin(x * 0.012) * 7 + 52 * ease((x - 30) / 110);
/** Bridgehead market converges on the existing gate/cart axis; city streets remain at -45. */
export const qingmingMainStreet = (x: number): number => -19 - 26 * ease((x + 20) / 65);
export const qingmingRiverTangent = (x: number): number =>
  (qingmingRiver(x + 0.1) - qingmingRiver(x - 0.1)) / 0.2;
export const qingmingBridgeHeight = (z: number): number =>
  2.8 + Math.max(0, 1 - ((z - qingmingRiver(-20)) / 22) ** 2) * 6.7;

export function cityGround(x: number, z: number, includeBridge = false): number {
  if (includeBridge && Math.abs(x + 20) < 4.1 && Math.abs(z - qingmingRiver(-20)) < 22)
    return qingmingBridgeHeight(z);
  const shore = Math.min(1, Math.max(0, (Math.abs(z - qingmingRiver(x)) - 11.8) / 1.1));
  return -1 + shore * 3.8;
}
