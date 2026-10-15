import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PAINTINGS, getPainting } from '../data/paintings';
import { rockLandformHeight, colorRockLandform, addRockSurface } from './rockLandforms';
import { groundHeight, peakHeight } from './terrain';
import { landscapeBaseHeight, landscapeRiverCenter } from './geography';

describe('separated rock landforms', () => {
  it('adds world-space surface detail without textures or extra geometry', () => {
    for (const sandstone of [false, true]) {
      const material = new THREE.MeshStandardMaterial();
      addRockSurface(material, sandstone);
      const shader = {
        uniforms: {} as Record<string, { value: unknown }>,
        vertexShader: '#include <common>\n#include <worldpos_vertex>',
        fragmentShader:
          '#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>',
      };
      material.onBeforeCompile(
        shader as unknown as Parameters<typeof material.onBeforeCompile>[0],
        {} as THREE.WebGLRenderer,
      );
      expect(shader.vertexShader).toContain('vRockWorld =');
      expect(shader.fragmentShader).toContain('rockRelief');
      expect(shader.uniforms.uSandstone!.value).toBe(sandstone ? 1 : 0);
      expect(material.map).toBeNull();
      material.dispose();
    }
  });
  it('leaves unrelated worlds untouched', () => {
    for (const painting of PAINTINGS.filter((p) => !['guilin', 'zhangjiajie'].includes(p.id)))
      for (const peak of painting.peaks)
        expect(rockLandformHeight(peak, peak.x, peak.z)).toBeUndefined();
  });

  it('keeps tall crowns but opens low gaps between adjacent footprints', () => {
    for (const id of ['guilin', 'zhangjiajie'] as const)
      for (const peak of getPainting(id).peaks) {
        expect(peakHeight(peak, peak.x, peak.z)).toBeGreaterThan(peak.height * 0.85);
        for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
          const x = peak.x + Math.cos(angle) * peak.radius * 0.86;
          const z = peak.z + Math.sin(angle) * peak.radius * (peak.stretch ?? 0.8) * 0.86;
          expect(peakHeight(peak, x, z)).toBeLessThan(peak.height * 0.03);
        }
        for (let dx = -1.1; dx < 1.1; dx += 0.05) {
          const height = peakHeight(peak, peak.x + peak.radius * dx, peak.z);
          expect(height).toBeGreaterThanOrEqual(-0.25);
          expect(height).toBeLessThan(peak.height * 1.1);
        }
      }
  });

  it('preserves river channels and pedestrian banks', () => {
    for (const id of ['guilin', 'zhangjiajie'] as const) {
      const painting = getPainting(id);
      for (let x = -100; x <= 100; x += 5) {
        const center = landscapeRiverCenter(painting, x);
        for (const z of [center, center + (id === 'guilin' ? 24 : 7)])
          expect(groundHeight(painting, x, z)).toBeCloseTo(
            Math.max(-0.25, landscapeBaseHeight(painting, x, z)),
            8,
          );
      }
    }
  });

  it('colors limestone as cool exposed stone and sandstone as warmer layered stone', () => {
    const limestone = new THREE.Color(),
      sandstone = new THREE.Color();
    const green = new THREE.Color('#506a45');
    colorRockLandform(limestone, green, false, 2, -70, 30, 1, 2014);
    colorRockLandform(sandstone, green, true, 2, -70, 30, 1, 2014);
    expect(limestone.b / limestone.r).toBeGreaterThan(sandstone.b / sandstone.r);
    for (const color of [limestone, sandstone])
      expect(color.toArray().every((c) => Number.isFinite(c) && c >= 0 && c <= 1)).toBe(true);
  });
});
