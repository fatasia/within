import { describe, expect, it } from 'vitest';
import { getWuhanGround, wuhanPath, wuhanShore, wuhanWalkHeight, WUHAN_PIER } from './wuhanLayout';

describe('East Lake waterfront interpretation', () => {
  it('varies the distance between the water edge and the established promenade', () => {
    expect(wuhanPath(-72) - wuhanShore(-72)).toBeCloseTo(15);
    expect(wuhanPath(78) - wuhanShore(78)).toBeCloseTo(5.2);
    expect(getWuhanGround(5, 127)).toBeGreaterThan(20);
    expect(getWuhanGround(5, -40)).toBeLessThan(0);
  });

  it('supports the pier surface without filling the water underneath it', () => {
    const z = wuhanShore(WUHAN_PIER.x) - 5;
    expect(getWuhanGround(WUHAN_PIER.x, z)).toBeLessThan(0);
    expect(wuhanWalkHeight(WUHAN_PIER.x, z)).toBe(WUHAN_PIER.height);
    expect(wuhanWalkHeight(WUHAN_PIER.x + 2, z)).toBeLessThan(0);
    expect(wuhanWalkHeight(-18, wuhanPath(-18))).toBe(getWuhanGround(-18, wuhanPath(-18)));
  });
});
