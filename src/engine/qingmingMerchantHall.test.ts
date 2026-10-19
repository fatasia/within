import * as THREE from 'three';
import { expect, it } from 'vitest';
import { buildQingmingMerchantHallSteps } from './qingmingMerchantHall';
import { roofSurfaceY } from './qingmingRoof';
import type { StreetMaterials } from './qingmingEpisodes';
import { disposeObject } from './resources';

it('closes the upper wall to the curved roof and attaches the rafters', () => {
  const material = new THREE.MeshStandardMaterial();
  const m = Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((k) => [k, material]),
  ) as unknown as StreetMaterials;
  const steps = buildQingmingMerchantHallSteps(m, material, material);
  let next = steps.next();
  while (!next.done) next = steps.next();
  const hall = next.value;
  try {
    const caps = hall.children.filter((o) => o.name === 'merchant-upper-wall-cap');
    expect(caps).toHaveLength(2);
    const profile = { width: 15.7, depth: 7.2, base: 6.21, rise: 1.85, detailed: true };
    for (const cap of caps) {
      expect(cap.position.y - 0.4).toBeLessThan(6.2);
      expect(cap.position.y + 0.4).toBeGreaterThan(roofSurfaceY(profile, 7, 2.7));
    }
    const rafters = hall.children.filter((o) => o.name === 'merchant-attached-rafter');
    expect(rafters).toHaveLength(29);
    expect(rafters.every((o) => Math.abs(o.quaternion.x) > 0.01)).toBe(true);
  } finally {
    disposeObject(hall);
  }
});
