import * as THREE from 'three';
import { expect, it } from 'vitest';
import { buildQingmingBridgeMarket, BRIDGE_MARKET_SITES } from './qingmingBridgeMarket';
import { cityGround, qingmingRiver } from './cityLayout';
import type { StreetMaterials } from './qingmingEpisodes';
import { disposeObject } from './resources';

it('frames the bridge with painted-market silhouettes without blocking its central approach', () => {
  const materials = Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((key) => [
      key,
      new THREE.MeshStandardMaterial(),
    ]),
  ) as unknown as StreetMaterials;
  const group = buildQingmingBridgeMarket(materials);
  try {
    const parasols = group.children.filter((c) => c.name === 'round-parasol-stall');
    expect(parasols).toHaveLength(8);
    expect(
      group.children.filter((c) => c.name === 'bridgehead-spreading-spring-tree'),
    ).toHaveLength(3);
    for (const [index, [x, offset, radius]] of BRIDGE_MARKET_SITES.entries()) {
      const z = qingmingRiver(x) + offset;
      expect(parasols[index]!.position.y).toBe(cityGround(x, z));
      expect(Math.abs(x + 20) - radius).toBeGreaterThan(4.2);
      expect(Math.abs(offset) - radius).toBeGreaterThan(12.9);
    }
    let triangles = 0;
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const p = object.geometry.getAttribute('position');
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
      triangles += (object.geometry.index?.count ?? p.count) / 3;
      expect(Object.values(materials)).toContain(object.material);
    });
    expect(triangles).toBeLessThan(12_000);
  } finally {
    disposeObject(group);
  }
});
