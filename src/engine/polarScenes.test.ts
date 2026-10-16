import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { polarBall, polarChase, polarPlay, polarSnowball } from './arcticPlay';
import { buildArctic } from './featuredArctic';
import { buildDeepsea, whaleBodyGeometry } from './featuredDeepsea';
import { disposeObject } from './resources';

vi.stubGlobal('document', { createElement: () => {
  const canvas = { width: 0, height: 0, getContext: () => context };
  const context = new Proxy({ canvas }, { get: (target, key) => key === 'canvas' ? target.canvas : key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  return canvas;
} });

describe('polar scene motion and geometry', () => {
  it('moves the chase through metres of space without animal intersections or loop jumps', () => {
    const bounds = { minX: Infinity, maxX: -Infinity };
    for(let t=0;t<48;t+=.05){
      const bear=polarChase(t,'bear'), a=polarChase(t,0), b=polarChase(t,1);
      bounds.minX=Math.min(bounds.minX,bear.x);bounds.maxX=Math.max(bounds.maxX,bear.x);
      expect(Math.hypot(a.x-bear.x,a.z-bear.z)).toBeGreaterThan(3);
      expect(Math.hypot(b.x-bear.x,b.z-bear.z)).toBeGreaterThan(3);
      expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeGreaterThan(.8);
      for(const actor of ['bear',0,1] as const){const p=polarChase(t,actor),next=polarChase(t+.01,actor);expect(Math.hypot(next.x-p.x,next.z-p.z)).toBeLessThan(.08);}
    }
    expect(bounds.maxX-bounds.minX).toBeGreaterThan(8);
    for(const actor of ['bear',0,1] as const){expect(polarChase(0,actor).x).toBeCloseTo(polarChase(48,actor).x);expect(polarChase(0,actor).z).toBeCloseTo(polarChase(48,actor).z);}
  });
  it('keeps ball contact timed to the kicking foot and snow throws above the ground', () => {
    expect(polarBall(.5).leftKick).toBe(1);expect(polarBall(.5).x).toBeCloseTo(2.6);
    expect(polarBall(4.5).rightKick).toBe(1);expect(polarBall(4.5).x).toBeCloseTo(7.4);
    expect(polarBall(2).x).toBeGreaterThan(polarBall(1).x);
    expect(polarSnowball(1.9).lift).toBeGreaterThan(1.7);
    expect(polarSnowball(2.61).burst).toBeGreaterThan(0);
    expect(polarSnowball(2.61).flight).toBe(false);
    expect(polarSnowball(10.61).recipient).toBe(2);
    for(let t=0;t<16;t+=.02){expect(polarBall(t).lift).toBeGreaterThanOrEqual(0);expect(polarSnowball(t).lift).toBeGreaterThanOrEqual(0);}
  });
  it('plays approach, raised paw, retreat and rest without a loop discontinuity', () => {
    expect(polarPlay(0)).toEqual(polarPlay(24));
    expect(polarPlay(8).paw).toBe(1);
    expect(polarPlay(8).approach).toBe(1);
    expect(polarPlay(12.5).hop).toBeCloseTo(.18);
    expect(polarPlay(20).approach).toBe(0);
    for (let t = 0; t < 48; t += .1) {
      const pose = polarPlay(t);
      expect(pose.approach).toBeGreaterThanOrEqual(0); expect(pose.approach).toBeLessThanOrEqual(1);
      expect(Math.abs(polarPlay(t + .01).paw - pose.paw)).toBeLessThan(.01);
    }
  });
  it('keeps animals articulated and a fourth curtain behind the glacier', () => {
    const world = buildArctic();
    try {
      const penguins: THREE.Object3D[] = []; world.traverse(o => { if (o.userData.nonNativeArctic) penguins.push(o); });
      expect(penguins).toHaveLength(5);
      expect(world.getObjectByName('aurora · beyond glacier horizon')).toBeDefined();
      expect(world.getObjectByName('near snowflakes')).toBeDefined();
      const bear = world.getObjectByName('polar bear · playful adult')!, leg = bear.children.find(o => o.name === 'bear leg')!;
      const floe = world.getObjectByName('moving sea ice floe')!;
      world.userData.update(0, 1); const y = floe.position.y, rotation = leg.rotation.z;
      world.userData.update(8, 1); expect(floe.position.y).not.toBe(y); expect(leg.rotation.z).not.toBe(rotation);
      const bearPosition = bear.position.clone(); world.userData.update(4, 1);world.userData.update(8, 1); expect(bear.position.equals(bearPosition)).toBe(true);
      penguins.forEach(p => expect(p.position.distanceTo(bear.position)).toBeGreaterThan(3));
    } finally { disposeObject(world); }
  });
  it('uses a continuous finite whale body with a broad head and tapering tail', () => {
    const geometry = whaleBodyGeometry();
    try {
      const p = geometry.attributes.position; expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
      geometry.computeBoundingBox(); expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeGreaterThan(13);
      expect(geometry.index!.count / 3).toBeLessThan(5000);
    } finally { geometry.dispose(); }
  });
  it('replays deepsea motion deterministically and avoids teleporting jellyfish', () => {
    const world = buildDeepsea();
    try {
      const capture = () => { const values: number[] = []; world.traverse(o => values.push(...o.position.toArray(), ...o.rotation.toArray().slice(0, 3) as number[])); return values; };
      world.userData.update(12, 1); const first = capture(); world.userData.update(5, 1);world.userData.update(12, 1);expect(capture()).toEqual(first);
      world.userData.update(12.001, 1);const next = capture();expect(Math.max(...next.map((n,i)=>Math.abs(n-first[i]!)))).toBeLessThan(.01);
    } finally { disposeObject(world); }
  });
});
