export type ViewRotation = 0 | 90;

/** Inverse of the clockwise quarter-turn used by the page-level orientation fallback. */
export function localPointer(
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  x: number,
  y: number,
  rotation: ViewRotation,
): { x: number; y: number } {
  return rotation === 90
    ? { x: y - bounds.top, y: bounds.width - (x - bounds.left) }
    : { x: x - bounds.left, y: y - bounds.top };
}

export function elementRotation(element: Element): ViewRotation {
  return element.ownerDocument.documentElement.dataset.viewRotation === '90' ? 90 : 0;
}

/** OrbitControls and the scene gestures share logical canvas coordinates. */
export function orientCanvasEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent | MouseEvent,
): void {
  if (elementRotation(canvas) !== 90) return;
  const bounds = canvas.getBoundingClientRect();
  const point = localPointer(bounds, event.clientX, event.clientY, 90);
  const x = bounds.left + point.x,
    y = bounds.top + point.y;
  Object.defineProperties(event, {
    clientX: { configurable: true, value: x },
    clientY: { configurable: true, value: y },
    pageX: { configurable: true, value: x + window.scrollX },
    pageY: { configurable: true, value: y + window.scrollY },
    movementX: { configurable: true, value: event.movementY },
    movementY: { configurable: true, value: -event.movementX },
  });
}
