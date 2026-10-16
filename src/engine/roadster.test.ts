import { createRoadsterChallenge } from './roadsterChallenge';
import { buildRoadsterDancer } from './roadsterDancer';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRoadster } from './featuredRoadster';
import { buildRoadsterModel } from './roadsterModel';
import { sampleRoadsterMotion, stepRoadsterDrive, roadsterTrack } from './roadsterMotion';
import { disposeObject } from './resources';
describe('Roadster model and interactive drive', () => {
  it('has four separately spinning open wheels and finite budgeted geometry', () => {
    const model = buildRoadsterModel();
    expect(model.wheels).toHaveLength(4);
    expect(model.frontWheels).toHaveLength(2);
    let tri = 0,
      draw = 0;
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        draw++;
        const p = o.geometry.getAttribute('position');
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        tri += (o.geometry.index?.count ?? p.count) / 3;
      }
    });
    expect(tri).toBeLessThan(40000);
    expect(draw).toBeLessThan(45);
    console.log('Roadster model', { tri, draw });
    disposeObject(model.group);
  });
  it('samples continuous forward route and camera without a launch cut', () => {
    for (let i = 0; i <= 1000; i++) {
      const m = sampleRoadsterMotion(i / 1000);
      expect([...m.eye, ...m.target, ...m.position].every(Number.isFinite)).toBe(true);
      expect(m.position[1]).toBe(0.8);
      if (i) {
        const prev = sampleRoadsterMotion((i - 1) / 1000);
        expect(new THREE.Vector3(...m.eye).distanceTo(new THREE.Vector3(...prev.eye))).toBeLessThan(
          0.8,
        );
      }
    }
    expect(roadsterTrack(90).position).toEqual([0, 0.8, -90]);
  });
  it('accelerates, steers, brakes, and stops at the playground boundary', () => {
    let s = { x: 0, z: 0, heading: 0, speed: 0, distance: 0 };
    for (let i = 0; i < 120; i++)
      s = stepRoadsterDrive(s, { throttle: 1, steer: 0, brake: 0 }, 1 / 60);
    expect(s.speed).toBeGreaterThan(10);
    expect(s.z).toBeLessThan(-10);
    for (let i = 0; i < 60; i++)
      s = stepRoadsterDrive(s, { throttle: 1, steer: 1, brake: 0 }, 1 / 60);
    expect(s.heading).toBeLessThan(-0.5);
    for (let i = 0; i < 120; i++)
      s = stepRoadsterDrive(s, { throttle: 0, steer: 0, brake: 1 }, 1 / 60);
    expect(s.speed).toBe(0);
    expect(
      stepRoadsterDrive(
        { ...s, z: -190, heading: 0, speed: 25 },
        { throttle: 1, steer: 0, brake: 0 },
        0.1,
      ).z,
    ).toBe(-190);
  });
  it('accepts paint/active drive/short-hop and releases inputs without leaving the ground', () => {
    const world = buildRoadster();
    const car = world.getObjectByName('Roadster 2026 · reference-built')!;
    const update = world.userData.update;
    world.userData.setPaint('#aa162d');
    world.userData.setDriveInput({ throttle: 1 });
    for (let i = 0; i < 100; i++) update(i / 60, 1);
    expect(world.userData.getDriveState().speed).toBeGreaterThan(5);
    world.userData.clearDriveInput();
    expect(world.userData.getDriveState().speed).toBe(0);
    world.userData.triggerBoost();
    update(100 / 60 + 1.1, 1);
    expect(car.position.y).toBeGreaterThan(2);
    update(100 / 60 + 2.5, 1);
    expect(car.position.y).toBe(0.8);
    world.userData.setVoyageProgress(0.5);
    expect(world.userData.getDriveState().manual).toBe(false);
    disposeObject(world);
  });
  it('keeps roof-dance feet planted while the torso dances and follows the vehicle', () => {
    const dancer = buildRoadsterDancer();
    expect(dancer.root.visible).toBe(false);
    dancer.toggle();
    expect(dancer.root.visible).toBe(true);
    expect(dancer.root.position.y).toBeGreaterThan(1.245);
    const car = new THREE.Group();
    car.add(dancer.root);
    car.position.set(5, 3.0, -12);
    dancer.update(0.3);
    const pose = dancer.root.children[0]!.rotation.z;
    dancer.update(0.8);
    expect(dancer.root.children[0]!.rotation.z).not.toBe(pose);
    expect(dancer.root.position.toArray()).toEqual([0, 1.255, 0.12]);
    car.updateMatrixWorld(true);
    expect(dancer.root.getWorldPosition(new THREE.Vector3()).y).toBe(4.255);
    dancer.toggle();
    expect(dancer.root.visible).toBe(false);
    disposeObject(car);
  });
  it('requires ordered sprint gates, retains best time, and resets a new attempt', () => {
    const run = createRoadsterChallenge();
    run.update(0, [0, 0.8, 0], 1, true);
    run.update(1, roadsterTrack(73).position, 10, true);
    expect(run.status().passed).toBe(0);
    [18, 42, 73, 108, 145].forEach((d, i) =>
      run.update(i + 2, roadsterTrack(d).position, 15, true),
    );
    expect(run.status()).toMatchObject({ complete: true, passed: 5, time: 6, best: 6 });
    run.reset();
    expect(run.status()).toMatchObject({ complete: false, passed: 0, best: 6, time: 0 });
    disposeObject(run.group);
  });
});
