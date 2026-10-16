import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildQingmingSteps } from './qingming';
import { QINGMING } from '../data/qingming';
import { batchQingmingSteps } from './qingmingBatch';
import { prepareQingmingTransportSteps } from './qingmingTransport';
import { prepareLivingTransport } from './livingActors';
import { buildQingmingEpisodes, type StreetMaterials } from './qingmingEpisodes';
import { disposeObject } from './resources';

function drain<T>(steps: Generator<void, T>): T {
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

describe('incremental Qingming construction', () => {
  it('yields throughout construction and merging while retaining the material/triangle budget', () => {
    const steps = buildQingmingSteps(QINGMING);
    let next = steps.next(),
      count = 0;
    while (!next.done) {
      count++;
      next = steps.next();
    }
    const model = next.value;
    try {
      expect(count).toBeGreaterThan(1200);
      let triangles = 0,
        draws = 0;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        draws++;
        triangles +=
          (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3;
      });
      expect(draws).toBeLessThan(40);
      expect(triangles).toBeLessThan(450000);
      expect(model.getObjectByName('gate-donkey-cart')!.userData.livingTransport).toBe(true);
    } finally {
      disposeObject(model);
    }
  });

  for (const checkpoint of [1, 90, 650, 1200, 'last-yield'] as const) {
    it(`releases pending geometry when cancelled at construction step ${checkpoint}`, () => {
      const geometry = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
      const material = vi.spyOn(THREE.Material.prototype, 'dispose');
      try {
        let stop: number;
        if (checkpoint === 'last-yield') {
          const reference = buildQingmingSteps(QINGMING);
          stop = 0;
          let next = reference.next();
          while (!next.done) { stop++; next = reference.next(); }
          disposeObject(next.value);
        } else stop = checkpoint;
        const steps = buildQingmingSteps(QINGMING);
        for (let i = 0; i < stop; i++) expect(steps.next().done).toBe(false);
        geometry.mockClear();
        material.mockClear();
        expect(steps.return(undefined as unknown as THREE.Group).done).toBe(true);
        expect(geometry).toHaveBeenCalled();
        expect(material).toHaveBeenCalled();
      } finally {
        geometry.mockRestore();
        material.mockRestore();
      }
    });
  }

  it('merges indexed and unindexed parts with baked transforms in one material draw', () => {
    const source = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: '#615142' });
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), material);
    b.position.x = 4;
    source.add(a, b);
    const result = drain(batchQingmingSteps(source));
    try {
      expect(source.children).toHaveLength(0);
      expect(result.children).toHaveLength(1);
      const mesh = result.children[0] as THREE.Mesh;
      expect(mesh.geometry.index!.count / 3).toBe(24);
      mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.max.x).toBe(4.5);
    } finally {
      disposeObject(result);
    }
  });

  it('retains the original four cart morph channels exactly after incremental preparation', () => {
    const make = () => {
      const materials = Object.fromEntries(
        ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((key) => [
          key,
          new THREE.MeshStandardMaterial(),
        ]),
      ) as unknown as StreetMaterials;
      const episodes = buildQingmingEpisodes(materials);
      const cart = episodes.getObjectByName('gate-donkey-cart') as THREE.Group;
      cart.removeFromParent();
      return { cart, episodes };
    };
    const first = make(),
      second = make();
    const a = prepareLivingTransport(first.cart);
    const b = drain(prepareQingmingTransportSteps(second.cart));
    try {
      for (const kind of ['position', 'normal'] as const) {
        expect(b.geometry.morphAttributes[kind]).toHaveLength(4);
        for (let i = 0; i < 4; i++)
          expect(Array.from(b.geometry.morphAttributes[kind]![i]!.array)).toEqual(
            Array.from(a.geometry.morphAttributes[kind]![i]!.array),
          );
      }
    } finally {
      [a, b, first.episodes, second.episodes].forEach(disposeObject);
    }
  });
});
