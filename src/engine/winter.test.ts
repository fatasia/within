import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getPainting } from '../data/paintings';
import { buildWinterDetails, createWinterSky, refineWinterTerrain } from './winter';
import { disposeObject } from './resources';

describe('Rondane winter world', () => {
  it('separates snow shoulders and shadow cuts without changing terrain positions', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-10, 42, -100, 10, 42, -100, 0, 3, -80], 3),
    );
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute([-0.5, 0.86, 0, 0.8, 0.3, 0, 0, 1, 0], 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(9).fill(0.5), 3));
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
    const before = [...geometry.getAttribute('position').array];
    refineWinterTerrain(group);
    const colors = geometry.getAttribute('color');
    expect(colors.getX(0)).toBeGreaterThan(colors.getX(1));
    expect(colors.getX(0)).toBeGreaterThan(colors.getX(2));
    expect([...colors.array].every(Number.isFinite)).toBe(true);
    expect([...geometry.getAttribute('position').array]).toEqual(before);
    disposeObject(group);
  });
  it('has five ordered chapters and a dedicated painting profile', () => {
    const painting = getPainting('winter');
    expect(painting.id).toBe('winter');
    expect(painting.chapters).toHaveLength(5);
    expect(painting.chapters.map((chapter) => chapter.progress)).toEqual([
      0, 0.22, 0.44, 0.65, 0.87,
    ]);
    expect(painting.peaks.every((peak) => peak.profile === 'winter')).toBe(true);
  });

  it('builds deterministic, finite instanced foreground geometry with few draw calls', () => {
    const painting = getPainting('winter');
    const first = buildWinterDetails(painting);
    const second = buildWinterDetails(painting);
    const firstInstances = first.children.filter((object) => object instanceof THREE.InstancedMesh);
    const secondInstances = second.children.filter(
      (object) => object instanceof THREE.InstancedMesh,
    );
    expect(first.children.length).toBeLessThanOrEqual(8);
    expect(firstInstances.map((mesh) => mesh.count)).toEqual([136, 8, 8, 8, 60, 60]);
    firstInstances.forEach((mesh, i) => {
      expect([...mesh.instanceMatrix.array]).toEqual([...secondInstances[i]!.instanceMatrix.array]);
      expect([...mesh.instanceMatrix.array].every(Number.isFinite)).toBe(true);
      expect([...mesh.geometry.attributes.position!.array].every(Number.isFinite)).toBe(true);
    });
    disposeObject(first);
    disposeObject(second);
  });

  it('uses a far sphere sky without writing depth over the landscape', () => {
    const sky = createWinterSky();
    const material = sky.material as THREE.ShaderMaterial;
    expect(material.side).toBe(THREE.BackSide);
    expect(material.depthWrite).toBe(false);
    expect(material.fragmentShader).not.toContain('aurora');
    disposeObject(sky);
  });
});
