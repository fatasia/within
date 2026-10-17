import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildQingmingNightLife } from './qingmingNightLife';
import { buildQingmingDailyLife } from './qingmingDailyLife';
import { featuredUpdate } from './featuredShared';
import { getQingmingKeyframes } from './qingmingCinematography';
import { buildQingmingNarrativeSteps } from './qingmingNarrative';
import { prepareQingmingBoats } from './qingmingLife';
import type { StreetMaterials } from './qingmingEpisodes';
import { disposeObject } from './resources';
const materials = () =>
  Object.fromEntries(
    ['wood', 'dark', 'linen', 'earth', 'stone', 'blue', 'clay', 'skin'].map((k) => [
      k,
      new THREE.MeshStandardMaterial(),
    ]),
  ) as unknown as StreetMaterials;
describe('Qingming inhabited streets on a narrow screen', () => {
  it('lights lamps and windows only at dusk and keeps smoke running without the timeline', () => {
    const group = buildQingmingNightLife([
      { position: [0, 5.8, -30], kind: 'lantern', yaw: 0 },
      { position: [1, 7, -31], kind: 'window', yaw: 0 },
    ]);
    const lamp = group.getObjectByName('qingming-paper-lanterns') as THREE.InstancedMesh;
    const pane = group.getObjectByName('qingming-lit-windows') as THREE.InstancedMesh;
    const smoke = group.getObjectByName('qingming-cooking-smoke') as THREE.Points;
    const update = featuredUpdate(group)!;
    expect((lamp.material as THREE.MeshStandardMaterial).emissiveIntensity).toBe(0);
    update(18, 1);
    expect((lamp.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(2);
    expect((pane.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(1);
    expect((smoke.material as THREE.ShaderMaterial).uniforms.uTime!.value).toBe(18);
    update(20, 0);
    expect((lamp.material as THREE.MeshStandardMaterial).emissiveIntensity).toBe(0);
    expect(group.getObjectByName('qingming-warm-street-spill')!.visible).toBe(false);
    disposeObject(group);
  });
  it('retains reading order but replaces miniature aerial views on portrait screens', () => {
    const desktop = getQingmingKeyframes(),
      phone = getQingmingKeyframes(true);
    expect(phone.map((f) => f.progress)).toEqual(desktop.map((f) => f.progress));
    for (const t of [0, 0.045, 0.51, 0.975, 1]) {
      const f = phone.find((f) => f.progress === t)!;
      expect(new THREE.Vector3(...f.eye).distanceTo(new THREE.Vector3(...f.target))).toBeLessThan(
        25,
      );
    }
    expect(desktop[0]!.eye[1]).toBeGreaterThan(150);
  });
  it('animates villagers and bridge signals in the shared skinned batch', () => {
    const group = buildQingmingDailyLife(materials()),
      update = featuredUpdate(group)!;
    const arm = group.getObjectByName('working-citizen-110')!.getObjectByName('worker-arm--1')!;
    update(1, 0);
    const angle = arm.rotation.x;
    update(2, 1);
    expect(arm.rotation.x).not.toBeCloseTo(angle);
    expect(group.userData.inventory.villagers).toBe(4);
    expect(group.children.filter((o) => o instanceof THREE.SkinnedMesh)).toHaveLength(1);
    disposeObject(group);
  });
  it('keeps four additional boats and their working oars animated after baking', () => {
    const m = materials(),
      steps = buildQingmingNarrativeSteps(m, m.dark);
    let n = steps.next();
    while (!n.done) n = steps.next();
    const group = n.value,
      boats = group.children.filter((o) => o.userData.riverCraft) as THREE.Group[];
    expect(boats).toHaveLength(4);
    const fleet = prepareQingmingBoats(boats),
      oar = fleet.getObjectByName('qingming-working-oar')!,
      update = featuredUpdate(fleet)!;
    update(1, 0);
    const angle = oar.rotation.y;
    update(2, 0);
    expect(oar.rotation.y).not.toBeCloseTo(angle);
    expect(fleet.children).toHaveLength(1);
    disposeObject(fleet);
    disposeObject(group);
  });
});
