import { describe, expect, it } from 'vitest';
import { Bone, Group, Mesh, ShaderMaterial, Vector3 } from 'three';
import { qingmingLightDirection } from './qingmingEnvironment';
import { fitQingmingShadow } from './qingmingRendering';
import { buildRiver } from './river';
import { QINGMING } from '../data/qingming';
import { createLandscapeSky } from './atmosphere';
import { buildQingmingAirLife, qingmingFlagOffset } from './qingmingAirLife';
import { qingmingOarPose } from './qingmingLife';
import { featuredUpdate } from './featuredShared';
import { disposeObject } from './resources';

describe('Qingming water, wind and celestial lighting', () => {
  it('keeps reflected highlights and shadow direction aligned through dusk and night', () => {
    const river = buildRiver(QINGMING, 'low');
    const sky = createLandscapeSky(QINGMING);
    try {
      const water = (river.mesh.material as ShaderMaterial).uniforms;
      const air = (sky.material as ShaderMaterial).uniforms;
      expect(water.uSunDirection!.value.equals(air.uSunDirection!.value)).toBe(true);
      for (const n of [0, 0.2, 0.4, 0.55, 0.8, 1]) {
        river.update(13, n);
        const fit = fitQingmingShadow(new Vector3(-40, 25, 30), new Vector3(-20, 4, 0), 1024, n);
        const direction = fit.position.sub(fit.target).normalize();
        expect(direction.distanceTo(water.uSunDirection!.value)).toBeLessThan(1e-10);
        expect(direction.y).toBeGreaterThan(0.1);
      }
      expect(qingmingLightDirection(0.45).y).toBeLessThan(qingmingLightDirection(0).y);
      expect(
        qingmingLightDirection(1).distanceTo(new Vector3(0.35, 0.48, -1).normalize()),
      ).toBeLessThan(1e-10);
    } finally {
      river.dispose();
      disposeObject(sky);
    }
  });
  it('binds wake uniforms to vessels, caps work and resets the binding on rebuild', () => {
    const root = new Group();
    for (let i = 0; i < 10; i++) {
      const b = new Bone();
      b.name = `qingming-floating-boat-${i}`;
      b.position.set(i, 0, -i);
      root.add(b);
    }
    const river = buildRiver(QINGMING, 'balanced');
    try {
      river.setQingmingFleet(root);
      river.update(1, 0);
      const u = (river.mesh.material as ShaderMaterial).uniforms;
      expect(u.uWakeCount!.value).toBe(8);
      root.children[0]!.position.set(7, 0, 9);
      root.children[0]!.rotation.y = 0.8;
      river.update(2, 0);
      expect(u.uWakes!.value[0].toArray()).toEqual([7, 9, 0.8, 1]);
      river.setQingmingFleet(new Group());
      expect(u.uWakeCount!.value).toBe(0);
    } finally {
      river.dispose();
    }
  });
  it('keeps banner hoists fixed, bounds cloth displacement and animates existing geometry', () => {
    const group = buildQingmingAirLife();
    try {
      const mesh = group.getObjectByName('qingming-wind-banner-0') as Mesh;
      const geometry = mesh.geometry;
      featuredUpdate(group)!(0, 0);
      const before = Array.from(geometry.getAttribute('position').array);
      featuredUpdate(group)!(2, 1);
      const after = Array.from(geometry.getAttribute('position').array);
      expect(after).not.toEqual(before);
      expect(mesh.geometry).toBe(geometry);
      expect(after.every(Number.isFinite)).toBe(true);
      for (let t = 0; t < 100; t++) {
        expect(qingmingFlagOffset(0, 0.5, t, 2)).toBeCloseTo(0);
        expect(Math.abs(qingmingFlagOffset(1, 0.5, t, 2))).toBeLessThanOrEqual(0.23);
      }
      expect(group.getObjectByName('qingming-distant-plain')).toBeDefined();
    } finally {
      disposeObject(group);
    }
  });
  it('feathers the oar on recovery without jumping at either phase boundary', () => {
    for (const cycle of [0.64, 1]) {
      const a = qingmingOarPose((cycle - 1e-7) / 0.24),
        b = qingmingOarPose((cycle + 1e-7) / 0.24);
      for (const key of ['yaw', 'pitch', 'lean'] as const)
        expect(Math.abs(a[key] - b[key])).toBeLessThan(0.00001);
    }
    expect(qingmingOarPose(0.82 / 0.24).pitch).toBeGreaterThan(0.2);
    expect(qingmingOarPose(0.32 / 0.24).pitch).toBe(-0.08);
  });
});
