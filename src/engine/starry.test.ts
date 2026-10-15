import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getPainting } from '../data/paintings';
import { buildStarryDetails, createPainterlyStarrySky } from './starry';
import { disposeObject } from './resources';

afterEach(() => vi.unstubAllGlobals());

describe('Painted starry night', () => {
  it('paints eleven stars and a brush-textured crescent into one sky texture', () => {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      createLinearGradient: () => gradient,
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      bezierCurveTo: vi.fn(),
      clip: vi.fn(),
    };
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    });
    const sky = createPainterlyStarrySky();
    expect(context.createRadialGradient).toHaveBeenCalledTimes(12);
    expect(context.clip).toHaveBeenCalledTimes(1);
    expect(context.stroke.mock.calls.length).toBeGreaterThan(35000);
    expect(sky.material.depthWrite).toBe(false);
    expect(sky.material.side).toBe(THREE.BackSide);
    expect(sky.material.uniforms.uPainting!.value.image.width).toBe(3072);
    disposeObject(sky);
  });
  it('keeps the village lane and ground brush strokes in one finite mesh', () => {
    const group = buildStarryDetails(getPainting('starry'));
    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect([...mesh.geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);
    expect(mesh.geometry.getAttribute('position').count / 3).toBeLessThan(5000);
    disposeObject(group);
  });
});
