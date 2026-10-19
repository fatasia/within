import * as THREE from 'three';
import { expect, it } from 'vitest';
import { buildQingmingNarrativeSteps } from './qingmingNarrative';
import type { StreetMaterials } from './qingmingEpisodes';
import { disposeObject } from './resources';
it('immerses every narrative hull while keeping its deck above the water through heave', () => {
  const materials = Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((key) => [
      key,
      new THREE.MeshStandardMaterial(),
    ]),
  ) as unknown as StreetMaterials;
  const steps = buildQingmingNarrativeSteps(materials, materials.dark);
  let step = steps.next();
  while (!step.done) step = steps.next();
  const root = step.value;
  try {
    const boats = root.children.filter((o) => o.userData.riverCraft);
    expect(boats).toHaveLength(4);
    for (const boat of boats) {
      const bounds = new THREE.Box3().setFromObject(boat);
      expect(bounds.min.y + 0.035).toBeLessThan(0.04);
      expect(boat.position.y - 0.08 + 0.035 - 0.035).toBeGreaterThan(0.04);
    }
  } finally {
    disposeObject(root);
  }
});
