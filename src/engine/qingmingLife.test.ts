import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildQingmingLife, prepareQingmingBoats, qingmingCartTravel, qingmingFootstep } from './qingmingLife';
import type { StreetMaterials } from './qingmingEpisodes';
import { featuredUpdate } from './featuredShared';
import { cityGround, qingmingBridgeHeight } from './cityLayout';
import { qingmingPassageBoat } from './qingmingDetails';
import { disposeObject } from './resources';

const fixture = () => Object.fromEntries(['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map(key => [key, new THREE.MeshStandardMaterial({ color: '#80715c' })])) as unknown as StreetMaterials;

describe('Qingming street and river motion', () => {
  it('animates pedestrians, limbs, load and wheels in one skinned draw', () => {
    const materials = fixture(), group = buildQingmingLife(materials);
    const update = featuredUpdate(group)!;
    const snapshot = () => {
      group.updateMatrixWorld(true);
      const state: number[] = [];
      group.traverse(object => {
        if (object instanceof THREE.Bone) state.push(...object.position.toArray(), ...object.quaternion.toArray());
        if (object instanceof THREE.SkinnedMesh) object.skeleton.update();
      });
      return state;
    };
    try {
      expect(group.children).toHaveLength(1);
      expect(group.children[0]).toBeInstanceOf(THREE.SkinnedMesh);
      expect(group.userData.walkers).toBe(13);
      const zero = snapshot();
      update(8, 0);
      const eight = snapshot();
      expect(eight).not.toEqual(zero);
      expect(group.getObjectByName('qingming-travelling-cart')!.position.x).toBe(-4);
      expect(group.getObjectByName('cart-wheel-1')!.rotation.z).toBeCloseTo(-4 / 0.795);
      for (const t of [0, 3, 40, 65, 96, 250, 1000]) {
        update(t, 0);
        expect(snapshot().every(Number.isFinite)).toBe(true);
        for (let i = 0; i < 12; i++) {
          const actor = group.getObjectByName(`qingming-walker-${i}`)!;
          expect(actor.position.y).toBeCloseTo(i < 8 ? cityGround(actor.position.x, actor.position.z) + 0.08 : qingmingBridgeHeight(actor.position.z) + 0.025);
          if (i < 8 && actor.position.x > -57 && actor.position.x < 28)
            expect(Math.abs(actor.position.z + 45)).toBeGreaterThan(1.5);
        }
      }
      update(8, 1);
      expect(snapshot()).toEqual(eight);
      update(Number.NaN, 0);
      expect(snapshot()).toEqual(eight);
      const skeleton = (group.children[0] as THREE.SkinnedMesh).skeleton;
      const dispose = vi.spyOn(skeleton, 'dispose');
      disposeObject(group);
      expect(dispose).toHaveBeenCalledOnce();
    } finally { disposeObject(group); Object.values(materials).forEach(m => m.dispose()); }
  });

  it('brakes without position or velocity jumps, stopping before the gate queue', () => {
    for (const t of [64, 96]) {
      const before = qingmingCartTravel(t - 0.0001), after = qingmingCartTravel(t + 0.0001);
      expect(Math.abs(before.distance - after.distance)).toBeLessThan(0.001);
      expect(Math.abs(before.speed - after.speed)).toBeLessThan(0.001);
    }
    expect(qingmingCartTravel(10000)).toEqual({ distance: 40, speed: 0 });
    for (let i = 0; i < 120; i++) expect(qingmingCartTravel(i + 1).distance).toBeGreaterThanOrEqual(qingmingCartTravel(i).distance);
  });

  it('keeps the stance planted and lifts the recovering foot with a continuous cycle', () => {
    expect(qingmingFootstep(0.1, 0).lift).toBe(0);
    expect(qingmingFootstep(0.5, 0).lift).toBeGreaterThan(0.07);
    for (const distance of [0.396, 0.66]) {
      const a = qingmingFootstep(distance - 1e-6, 0), b = qingmingFootstep(distance + 1e-6, 0);
      expect(Math.abs(a.forward - b.forward)).toBeLessThan(0.001);
      expect(Math.abs(a.lift - b.lift)).toBeLessThan(0.001);
    }
  });

  it('moves the existing lowered-rig boat downstream without adding an upright mast', () => {
    const m = fixture();
    const boat = qingmingPassageBoat({ timber: m.wood, dark: m.dark, cloth: m.linen, robe: m.blue, skin: m.skin });
    boat.position.set(-25, 0.45, 2.8);
    const group = prepareQingmingBoats([boat]);
    const update = featuredUpdate(group)!;
    const anchor = group.getObjectByName('qingming-floating-boat-0')!;
    try {
      update(0, 0);
      const start = anchor.position.clone();
      update(8, 0);
      expect(anchor.position.x).toBeGreaterThan(start.x + 0.5);
      expect(Math.abs(anchor.position.y - start.y)).toBeLessThan(0.08);
      update(3600, 0);
      expect(anchor.position.x).toBeLessThanOrEqual(start.x + 3.4);
      expect(anchor.position.x).toBeGreaterThan(start.x + 3);
      update(0, 0);
      expect(anchor.position.toArray()).toEqual(start.toArray());
      expect(group.children).toHaveLength(1);
      expect(group.getObjectByName('lowered-mast-and-furled-yard')).toBeDefined();
    } finally { disposeObject(group); Object.values(m).forEach(material => material.dispose()); }
  });
});
