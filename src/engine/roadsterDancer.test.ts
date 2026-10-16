import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildRoadsterDancer, ROADSTER_DANCE_CYCLE } from './roadsterDancer';
import { disposeObject } from './resources';

describe('Roadster rooftop dancer', () => {
  it('has front/back MUSK geometry without requiring DOM textures', () => {
    const dancer = buildRoadsterDancer();
    expect(dancer.root.visible).toBe(false);
    expect(dancer.root.getObjectByName('MUSK chest and back')?.children.length).toBe(2);
    expect(dancer.toggle()).toBe(true);
    expect(dancer.toggle()).toBe(false);
    disposeObject(dancer.root);
  });
  it('changes articulated poses and keeps every shoe above the roof across a full cycle', () => {
    const dancer = buildRoadsterDancer(); dancer.toggle();
    const shoes = [-1, 1].map(side => dancer.root.getObjectByName(`planted-shoe-${side}`)!);
    const poses = new Set<string>();
    for (let t = 0; t < 15; t += .05) {
      dancer.update(t); dancer.root.updateMatrixWorld(true);
      for (const shoe of shoes) expect(new THREE.Box3().setFromObject(shoe).min.y).toBeGreaterThanOrEqual(1.2549);
      poses.add(dancer.root.children[0].rotation.toArray().join(','));
      dancer.root.traverse(o => expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true));
    }
    expect(poses.size).toBeGreaterThan(100);
    dancer.update(0); const start = dancer.root.children[0].position.clone();
    dancer.update(ROADSTER_DANCE_CYCLE); expect(dancer.root.children[0].position.distanceTo(start)).toBeLessThan(1e-8);
    disposeObject(dancer.root);
  });
});
