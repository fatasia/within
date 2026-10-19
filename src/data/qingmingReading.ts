/** The image index follows the six continuous crops of the same Northern Song scroll. */
export const QINGMING_READING_STOPS = [
  { imageIndex: 1, progress: 0.1, label: '郊野茅舍与疏林' },
  { imageIndex: 2, progress: 0.2, label: '河岸舟运与货埠' },
  { imageIndex: 3, progress: 0.4, label: '虹桥桥市与卧桅船' },
  { imageIndex: 4, progress: 0.56, label: '桥后街市' },
  { imageIndex: 5, progress: 0.65, label: '城门与舟车' },
  { imageIndex: 6, progress: 0.83, label: '城内酒肆与街坊' },
] as const;

export function qingmingReadingIndex(progress: number): number {
  if (!Number.isFinite(progress) || progress < 0.03) return 3;
  if (progress < 0.18) return 1;
  if (progress < 0.32) return 2;
  if (progress < 0.49) return 3;
  if (progress < 0.62) return 4;
  if (progress < 0.81) return 5;
  return 6;
}
