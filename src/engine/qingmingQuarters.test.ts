import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { buildQingmingQuartersSteps, QINGMING_QUARTERS } from './qingmingQuarters';
import type { StreetMaterials } from './qingmingEpisodes';
import { cityGround } from './cityLayout';
import { disposeObject } from './resources';
describe('whole-scroll neighbourhood infill', () => {
  it('places every court on land with an open entrance and separated roof wings', () => {
    const m = Object.fromEntries(
      ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((k) => [
        k,
        new THREE.MeshStandardMaterial(),
      ]),
    ) as unknown as StreetMaterials;
    const steps = buildQingmingQuartersSteps(m);
    let next = steps.next();
    while (!next.done) next = steps.next();
    const g = next.value;
    expect(g.children).toHaveLength(11);
    expect(g.userData.inventory.wings).toBe(33);
    for (const q of QINGMING_QUARTERS)
      for (const x of [-q.width / 2, q.width / 2])
        for (const z of [-q.depth / 2, q.depth / 2]) {
          const wx = q.x + Math.cos(q.angle) * x + Math.sin(q.angle) * z,
            wz = q.z - Math.sin(q.angle) * x + Math.cos(q.angle) * z;
          expect(cityGround(wx, wz)).toBeCloseTo(2.8);
        }
    for (const court of g.children) {
      const wings = court.children.filter((c) => c.name === 'qingming-courtyard-wing');
      expect(wings).toHaveLength(3);
      court.updateMatrixWorld(true);
      const bounds=wings.map(wing=>{
        wing.updateMatrix(); const bound=new THREE.Box3();
        wing.traverse(object=>{if(object instanceof THREE.Mesh){object.updateMatrix();object.geometry.computeBoundingBox();bound.union(object.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(wing.matrix,object.matrix)));}});
        return bound;
      });
      expect(bounds[0]!.intersectsBox(bounds[1]!)).toBe(false);
      expect(bounds[0]!.intersectsBox(bounds[2]!)).toBe(false);
      expect(bounds[1]!.intersectsBox(bounds[2]!)).toBe(false);
      for (const wing of wings)
        wing.traverse((o) => {
          if (o instanceof THREE.Mesh)
            expect(Array.from(o.geometry.attributes.position!.array).every(Number.isFinite)).toBe(
              true,
            );
        });
    }
    disposeObject(g);
  });
});
