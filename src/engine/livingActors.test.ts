import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PAINTINGS, getPainting } from '../data/paintings';
import { buildQingmingEpisodes, type StreetMaterials } from './qingmingEpisodes';
import { buildLivingActors, prepareLivingTransport } from './livingActors';
import { disposeObject } from './resources';

function fixture() {
  const names = ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'] as const;
  const materials = Object.fromEntries(
    names.map((key, index) => [
      key,
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(index / 12, 0.2, 0.4) }),
    ]),
  ) as unknown as StreetMaterials;
  const episodes = buildQingmingEpisodes(materials);
  const source = episodes.getObjectByName('gate-donkey-cart') as THREE.Group;
  source.removeFromParent();
  let triangles = 0;
  source.traverse((object) => {
    if (object instanceof THREE.Mesh)
      triangles +=
        (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
  });
  const actor = prepareLivingTransport(source);
  const content = new THREE.Group().add(actor);
  disposeObject(episodes);
  return {
    actor,
    content,
    triangles,
    binding: buildLivingActors(getPainting('qingming'), content),
  };
}

describe('restrained living details', () => {
  it('preserves original transport triangles and placement in one draw, without a duplicate cart', () => {
    const { actor, content, triangles, binding } = fixture();
    expect(actor.position.toArray()).toEqual([43, 2.8, -45.2]);
    expect(actor.geometry.index!.count / 3).toBe(triangles);
    expect(triangles).toBeLessThan(20_000);
    expect(content.children).toHaveLength(1);
    expect(binding.group.children).toHaveLength(0);
    expect(actor.geometry.getAttribute('color').count).toBe(
      actor.geometry.getAttribute('position').count,
    );
    expect(actor.userData.motion).toBe('stopped-loading');
    expect(actor.userData.interpretation).toContain('动态演绎');
    binding.dispose();
    disposeObject(content);
  });

  it('keeps wheels, hooves and shoes fixed while local motions remain finite and bounded', () => {
    const { actor, content, binding } = fixture();
    const base = actor.geometry.getAttribute('position');
    const value = new THREE.Vector3();
    let largest = 0;
    for (const time of [0, 2, 4, 7, 13, 18, 103, 504]) {
      binding.update(time);
      for (let i = 0; i < base.count; i++) {
        actor.getVertexPosition(i, value);
        expect(value.toArray().every(Number.isFinite)).toBe(true);
        const distance = Math.hypot(
          value.x - base.getX(i),
          value.y - base.getY(i),
          value.z - base.getZ(i),
        );
        largest = Math.max(largest, distance);
        if (base.getY(i) < 0.15) expect(distance).toBe(0);
        // The complete wheel plane lies below the deck and away from the animal.
        if (base.getX(i) < 1 && Math.abs(base.getZ(i)) > 0.8) expect(distance).toBe(0);
        expect(distance).toBeLessThan(0.121);
      }
    }
    expect(largest).toBeGreaterThan(0.04);
    expect(actor.position.toArray()).toEqual([43, 2.8, -45.2]);
    binding.dispose();
    disposeObject(content);
  });

  it('is absolute-time deterministic, continuous at cycle boundaries and allocation-free in update', () => {
    const { actor, content, binding } = fixture();
    const array = actor.morphTargetInfluences;
    binding.update(12);
    const first = array!.slice();
    binding.update(1);
    binding.update(12);
    expect(actor.morphTargetInfluences).toBe(array);
    expect(array).toEqual(first);
    binding.update(Number.NaN);
    expect(array).toEqual(first);
    binding.update(0);
    const start = array!.slice();
    binding.update(504);
    array!.forEach((weight, i) => expect(weight).toBeCloseTo(start[i]!, 10));
    binding.update(504 - 0.001);
    const before = array!.slice();
    binding.update(504 + 0.001);
    array!.forEach((weight, i) => expect(Math.abs(weight - before[i]!)).toBeLessThan(0.001));
    binding.dispose();
    disposeObject(content);
  });

  it('does not invent pedestrians in quiet scenes and never owns the source geometry', () => {
    for (const painting of PAINTINGS) {
      const empty = buildLivingActors(painting);
      empty.update(100);
      expect(empty.group.children).toHaveLength(0);
      empty.dispose();
    }
    const { actor, content, binding } = fixture();
    let released = 0;
    actor.geometry.addEventListener('dispose', () => released++);
    binding.update(2);
    binding.dispose();
    binding.dispose();
    binding.update(10);
    expect(released).toBe(0);
    expect(actor.morphTargetInfluences).toEqual([0, 0, 0, 0]);
    disposeObject(content);
    expect(released).toBe(1);
  });
});
