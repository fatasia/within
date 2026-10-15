export const qingmingRiver = (x: number): number => 5 + Math.sin(x * 0.012) * 7;
export const qingmingBridgeHeight = (z: number): number =>
  2.8 + Math.max(0, 1 - ((z - qingmingRiver(-20)) / 22) ** 2) * 6.7;

export function cityGround(x: number, z: number, includeBridge = false): number {
  if (includeBridge && Math.abs(x + 20) < 4.1 && Math.abs(z - qingmingRiver(-20)) < 22)
    return qingmingBridgeHeight(z);
  const shore = Math.min(1, Math.max(0, (Math.abs(z - qingmingRiver(x)) - 11.8) / 1.1));
  return -1 + shore * 3.8;
}
