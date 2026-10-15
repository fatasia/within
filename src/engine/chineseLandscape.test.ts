import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PAINTINGS, getPainting } from '../data/paintings';
import {
  chineseForestDensity,
  chinesePeakHeight,
  colorChineseRock,
  isChineseLandscape,
} from './chineseLandscape';
import { peakHeight, groundHeight } from './terrain';
import { buildForest } from './props';
import { disposeObject } from './resources';

describe('Chinese landscape composition', () => {
  it('limits authored mountains to the three paintings and leaves foreground profiles alone', () => {
    for (const painting of PAINTINGS)
      for (const peak of painting.peaks) {
        if (!isChineseLandscape(painting.id) || peak.height <= 22 || peak.z >= -15)
          expect(chinesePeakHeight(peak, peak.x, peak.z)).toBeUndefined();
      }
    // Near-bank interpolation must resolve exactly to the original profile.
    for (const id of ['qianli', 'fuchun', 'xishan'] as const) {
      const painting = getPainting(id);
      for (const peak of painting.peaks)
        for (let x = -120; x < 130; x += 9) {
          for (const z of [-14, -13, 0, 12, 35, 47]) {
            // Translating both sample and peak preserves the legacy local profile,
            // but places it outside the distant-mountain authoring region.
            expect(peakHeight(peak, x, z)).toBeCloseTo(
              peakHeight({ ...peak, z: 100 }, x, z + 100 - peak.z),
              10,
            );
            expect(Number.isFinite(groundHeight(painting, x, z))).toBe(true);
          }
        }
    }
  });

  it('keeps authored silhouettes bounded and continuous at the bank transition', () => {
    for (const id of ['qianli', 'fuchun', 'xishan'] as const)
      for (const peak of getPainting(id).peaks) {
        for (let dx = -1; dx <= 1; dx += 0.1)
          for (let dz = -1; dz <= 1; dz += 0.1) {
            const height = peakHeight(peak, peak.x + dx * peak.radius, peak.z + dz * peak.radius);
            expect(height).toBeGreaterThanOrEqual(-0.25);
            expect(height).toBeLessThan(peak.height * 1.1);
          }
        for (const z of [-24, -14])
          for (let x = -120; x < 130; x += 7)
            expect(
              Math.abs(peakHeight(peak, x, z - 0.0001) - peakHeight(peak, x, z + 0.0001)),
            ).toBeLessThan(0.02);
      }
  });

  it('gives Xishan a broad wall crown and Fuchun unequal slanting shoulders', () => {
    const wall = getPainting('xishan').peaks.find((peak) => peak.height > 90)!;
    for (const side of [-0.35, 0, 0.35])
      expect(chinesePeakHeight(wall, wall.x + wall.radius * side, wall.z)!).toBeGreaterThan(
        wall.height * 0.75,
      );
    const ridge = getPainting('fuchun').peaks.find((peak) => peak.height > 22)!;
    const left = chinesePeakHeight(
      ridge,
      ridge.x - ridge.radius * 0.4,
      ridge.z + ridge.radius * 0.2,
    )!;
    const right = chinesePeakHeight(
      ridge,
      ridge.x + ridge.radius * 0.4,
      ridge.z + ridge.radius * 0.2,
    )!;
    expect(Math.abs(left - right)).toBeGreaterThan(ridge.height * 0.03);
  });

  it('separates Qianli blue caps from ochre banks and places darker Xishan crown woods', () => {
    const low = new THREE.Color(),
      high = new THREE.Color();
    colorChineseRock(low, 'qianli', 12, -30, 0.05, 1113);
    colorChineseRock(high, 'qianli', 12, -30, 0.95, 1113);
    expect(high.b).toBeGreaterThan(high.r);
    expect(low.r).toBeGreaterThan(high.r);
    expect(high.b).toBeGreaterThan(low.b);
    const sparse = chineseForestDensity('xishan', 10, -40, 12, 100, 1000);
    const crown = chineseForestDensity('xishan', 10, -40, 90, 100, 1000);
    expect(crown).toBeGreaterThan(sparse);
  });

  it('roots the instanced groves in the shared collision surface', () => {
    for (const id of ['qianli', 'fuchun', 'xishan'] as const) {
      const painting = getPainting(id),
        forest = buildForest(painting);
      const trunks = forest.getObjectByName('Bent pine trunks') as THREE.InstancedMesh;
      expect(trunks.count).toBeGreaterThan(10);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < trunks.count; i++) {
        trunks.getMatrixAt(i, matrix);
        const e = matrix.elements;
        expect(e[13]! - e[5]! * 1.65).toBeCloseTo(groundHeight(painting, e[12]!, e[14]!), 3);
      }
      disposeObject(forest);
    }
  });
});
