import { describe, expect, it } from 'vitest';
import { pointerDistance, scrollZoom, walkInput, wheelPixels } from './interaction';

describe('navigation input units', () => {
  it('normalizes mouse wheel lines and trackpad horizontal motion', () => {
    expect(wheelPixels({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 800).dominant).toBe(48);
    expect(wheelPixels({ deltaX: -100, deltaY: 2, deltaMode: 0 }, 800).dominant).toBe(-100);
    expect(wheelPixels({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 800).dominant).toBe(800);
    expect(wheelPixels({ deltaX: NaN, deltaY: Infinity, deltaMode: 0 }, 800).dominant).toBe(0);
  });
  it('keeps gentle joystick movement gentle and limits diagonal speed', () => {
    expect(walkInput(0.15, 0.2)).toEqual({ x: 0.15, y: 0.2 });
    const diagonal = walkInput(1, 1);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(walkInput(NaN, Infinity)).toEqual({ x: 0, y: 0 });
  });
  it('bounds zoom and measures only the active pair of touches', () => {
    expect(scrollZoom(1, 100)).toBe(2.4);
    expect(scrollZoom(1, 0.01)).toBe(0.65);
    expect(scrollZoom(1, NaN)).toBe(1);
    expect(
      pointerDistance([
        { x: 0, y: 0 },
        { x: 30, y: 40 },
      ]),
    ).toBe(50);
    expect(pointerDistance([{ x: 0, y: 0 }])).toBe(0);
  });
});
