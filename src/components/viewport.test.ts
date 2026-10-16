import { describe, expect, it } from 'vitest';
import { localPointer } from './viewport';

describe('rotated viewport coordinates', () => {
  const bounds = { left: 10, top: 20, width: 390, height: 844 };
  it('maps physical points to the landscape canvas without swapping drag direction', () => {
    expect(localPointer(bounds, 400, 20, 90)).toEqual({ x: 0, y: 0 });
    expect(localPointer(bounds, 10, 864, 90)).toEqual({ x: 844, y: 390 });
    const a = localPointer(bounds, 220, 400, 90);
    const b = localPointer(bounds, 220, 440, 90);
    expect(b.x - a.x).toBe(40);
    expect(b.y - a.y).toBe(0);
  });
  it('leaves native portrait and landscape input axes unchanged', () => {
    expect(localPointer(bounds, 80, 120, 0)).toEqual({ x: 70, y: 100 });
  });
});
