import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { getQingmingKeyframes } from './qingmingCinematography';

it('frames the whole gate and keeps street detail cameras out of the roof row', () => {
  for (const portrait of [false, true]) {
    const frames = getQingmingKeyframes(portrait);
    const gate = frames.find((f) => f.progress === 0.65)!;
    const camera = new PerspectiveCamera(39, portrait ? 0.5 : 1.77, 0.1, 1000);
    camera.position.set(...gate.eye);
    camera.lookAt(new Vector3(...gate.target));
    camera.updateMatrixWorld(true);
    for (const y of [2.8, 20.65]) {
      const projected = new Vector3(55, y, -45).project(camera);
      expect(Math.abs(projected.y)).toBeLessThan(0.85);
    }
    for (const progress of [0.72, 0.79, 0.83, 0.885]) {
      const shot = frames.find((f) => f.progress === progress)!;
      expect(shot.eye[2]).toBeLessThanOrEqual(-42);
      expect(shot.eye[2]).toBeGreaterThanOrEqual(-48);
    }
  }
});
