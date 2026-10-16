import { describe, expect, it } from 'vitest';
import { roadsterBodySide } from './roadsterModel';
import { buildArcticBear, buildPolarPenguin } from './arcticWildlife';

describe('reference-built body panels', () => {
  it('keeps wheel cutouts and uses short strips rather than diagonal full-body triangles', () => {
    for (const side of [-1, 1]) {
      const geometry = roadsterBodySide(side);
      const position = geometry.getAttribute('position');
      const indices = geometry.index!;
      for (let i = 0; i < indices.count; i += 3) {
        const z = [0, 1, 2].map((n) => position.getZ(indices.getX(i + n)));
        expect(Math.max(...z) - Math.min(...z)).toBeLessThan(0.032);
      }
      for (let i = 0; i < position.count; i++) {
        expect(side * position.getX(i)).toBeGreaterThan(0.85);
        for (const axle of [-1.43, 1.43]) {
          const dz = position.getZ(i) - axle;
          if (Math.abs(dz) < 0.431)
            expect(position.getY(i)).toBeGreaterThanOrEqual(
              0.37 + Math.sqrt(0.431 ** 2 - dz ** 2) - 0.00001,
            );
        }
      }
      geometry.dispose();
    }
  });
});

describe('animal encounter selection', () => {
  it('retains selectable root identity after per-animal geometry batching', () => {
    const bear = buildArcticBear(),
      penguin = buildPolarPenguin();
    expect(bear.root.userData.encounterId).toBe('arctic-bear');
    expect(penguin.root.userData.encounterId).toBe('arctic-penguin');
    expect(bear.head.parent).toBe(bear.root);
    expect(penguin.head.parent).toBe(penguin.root);
    expect(bear.root.children.length).toBeGreaterThan(4);
    expect(penguin.root.children.length).toBeGreaterThan(4);
  });
});
