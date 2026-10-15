import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { REAL_LANDSCAPES } from '../data/landscapes';
import { buildLandscapeDetails } from './landscapes';
import { foliageSpray, sedgeBlade } from './foliageSpray';
import { addWetStoneDetail } from './wuhanMaterials';
import { disposeObject } from './resources';

describe('real landscape near-field models', () => {
  for (const painting of REAL_LANDSCAPES)
    it(`${painting.id}: renders open foliage and bank plants within the instanced budget`, () => {
      const group = buildLandscapeDetails(painting);
      try {
        let triangles = 0,
          draws = 0;
        group.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          draws++;
          const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
          triangles +=
            ((object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3) *
            instances;
          if (object instanceof THREE.InstancedMesh)
            expect(Array.from(object.instanceMatrix.array).every(Number.isFinite)).toBe(true);
        });
        expect(draws).toBeLessThanOrEqual(15);
        expect(triangles).toBeLessThan(180000);
        const foliage = group.children.find((object) =>
          object.name.startsWith('Open '),
        ) as THREE.InstancedMesh;
        expect(foliage).toBeInstanceOf(THREE.InstancedMesh);
        expect(foliage.geometry.type).not.toBe('SphereGeometry');
        expect((foliage.material as THREE.Material).transparent).toBe(false);
        expect(group.getObjectByName('Curved streamside sedges')).toBeInstanceOf(
          THREE.InstancedMesh,
        );
      } finally {
        disposeObject(group);
      }
    });

  it('uses folded open foliage with finite vertex normals and no alpha-card overdraw', () => {
    for (const geometry of [foliageSpray(), foliageSpray(24, true), sedgeBlade()]) {
      expect(Array.from(geometry.attributes.normal!.array).every(Number.isFinite)).toBe(true);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.isEmpty()).toBe(false);
      geometry.dispose();
    }
  });

  it('injects staggered narrow stone joints, wet roughness and tangent-plane microrelief', () => {
    const material = new THREE.MeshPhysicalMaterial();
    addWetStoneDetail(material);
    const shader = {
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
      uniforms: {},
    };
    material.onBeforeCompile(
      shader as Parameters<typeof material.onBeforeCompile>[0],
      {} as THREE.WebGLRenderer,
    );
    expect(shader.vertexShader).toContain('varying vec3 vStoneWorld');
    expect(shader.fragmentShader).toContain('float stoneRelief');
    expect(shader.fragmentShader).toContain('mix(0.57, 0.085, wetPatch)');
    expect(shader.fragmentShader).toContain('0.006 + edgeWidth * 0.65');
    expect(shader.fragmentShader.indexOf('float wetPatch')).toBeLessThan(
      shader.fragmentShader.indexOf('float stoneRelief'),
    );
    expect(material.customProgramCacheKey()).toBe('within-wet-paving-v2');
    material.dispose();
  });
});
