import { expect, it } from 'vitest';
import { buildLakeBirds } from './lakeBirds';
import { disposeObject } from './resources';

it('keeps the lake flock sparse, deterministic and inside one draw batch', () => {
  const birds = buildLakeBirds();
  expect(birds.mesh.count).toBe(13);
  expect((birds.mesh.geometry.getAttribute('position').count * birds.mesh.count) / 3).toBe(65);
  birds.update(12);
  const pose = birds.mesh.position.toArray();
  birds.update(12);
  expect(birds.mesh.position.toArray()).toEqual(pose);
  expect(new Set(birds.mesh.geometry.getAttribute('flightPhase').array).size).toBe(13);
  birds.update(Number.NaN);
  expect(birds.mesh.position.toArray().every(Number.isFinite)).toBe(true);
  disposeObject(birds.mesh);
});
