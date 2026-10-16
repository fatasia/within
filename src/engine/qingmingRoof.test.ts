import { describe, expect, it } from 'vitest';
import { roofGeometry, roofTilesGeometry, roofGableGeometry, roofSurfaceY, type RoofProfile } from './qingmingRoof';

describe('Qingming roof construction', () => {
  for (const detailed of [false, true]) for (const width of [6.5, 6.7, 7.6]) {
    it(`seats tiles and gables on one surface (${width}, detail=${detailed})`, () => {
      const depth = 6.8, wallTop = 4.2, rise = width * 0.34;
      const wallT = (depth - 0.3) / (depth + 1.5);
      const profile: RoofProfile = { width: width + 1.3, depth: depth + 1.5, rise, base: wallTop + 0.065 - rise * (1 - wallT + 0.23 * wallT ** 4), detailed };
      const surface = roofGeometry(profile), tiles = roofTilesGeometry(profile);
      const gable = roofGableGeometry(profile, width - 0.3, depth - 0.3, wallTop);
      try {
        for (const geometry of [surface, tiles, gable]) {
          expect(geometry.getAttribute('position').array.every(Number.isFinite)).toBe(true);
          expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count);
        }
        const tileVertices = tiles.getAttribute('position');
        for (let i = 0; i < tileVertices.count; i++) {
          const separation = tileVertices.getY(i) - roofSurfaceY(profile, tileVertices.getX(i), tileVertices.getZ(i));
          expect(separation).toBeGreaterThan(0.0049);
          expect(separation).toBeLessThan(0.066);
        }
        // Both pitches face the sky; the old sheet inverted one half's normals.
        const normals = surface.getAttribute('normal');
        for (let i = 0; i < normals.count; i++) expect(normals.getY(i)).toBeGreaterThan(0);
        // The front wall must not cut through the shallow lower part of the roof.
        for (const x of [-width / 2 + 0.15, 0, width / 2 - 0.15])
          expect(roofSurfaceY(profile, x, (depth - 0.3) / 2)).toBeGreaterThan(wallTop + 0.035);
        const vertices = gable.getAttribute('position');
        for (let i = 1; i < vertices.count; i += 2)
          expect(roofSurfaceY(profile, vertices.getX(i), vertices.getZ(i)) - vertices.getY(i)).toBeCloseTo(0.035, 4);
      } finally { surface.dispose(); tiles.dispose(); gable.dispose(); }
    });
  }
});
