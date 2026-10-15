import { clamp } from './math';

/** DOM wheel deltas use pixels, text lines, or pages depending on the device. */
export function wheelPixels(
  event: { deltaX: number; deltaY: number; deltaMode: number },
  pageHeight: number,
): { x: number; y: number; dominant: number } {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, pageHeight) : 1;
  const x = Number.isFinite(event.deltaX) ? event.deltaX * unit : 0;
  const y = Number.isFinite(event.deltaY) ? event.deltaY * unit : 0;
  return { x, y, dominant: Math.abs(x) > Math.abs(y) ? x : y };
}

/** Preserve analogue stick magnitude while capping diagonal keyboard/stick combinations. */
export function walkInput(x: number, y: number): { x: number; y: number } {
  const side = Number.isFinite(x) ? clamp(x, -1, 1) : 0;
  const forward = Number.isFinite(y) ? clamp(y, -1, 1) : 0;
  const length = Math.max(1, Math.hypot(side, forward));
  return { x: side / length, y: forward / length };
}

export function scrollZoom(current: number, factor: number): number {
  if (!Number.isFinite(factor) || factor <= 0) return current;
  return clamp(current * factor, 0.65, 2.4);
}

export interface PointerPoint {
  x: number;
  y: number;
}
export function pointerDistance(points: Iterable<PointerPoint>): number {
  const [a, b] = [...points];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}
