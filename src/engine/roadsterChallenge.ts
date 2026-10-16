import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roadsterTrack } from './roadsterMotion';
/** Small ordered gate sprint inspired by Neon Zenith's street runs; independent deterministic state. */
export function createRoadsterChallenge() {
  const group = new THREE.Group();
  group.name = 'Neon sprint · five ordered gates';
  const gates = [18, 42, 73, 108, 145].map((d) => roadsterTrack(d));
  const materials: THREE.MeshBasicMaterial[] = [];
  for (const g of gates) {
    const mat = new THREE.MeshBasicMaterial({ color: '#42e7ff', toneMapped: false });
    materials.push(mat);
    const frame = new THREE.Group();
    frame.position.set(...g.position);
    frame.rotation.y = g.heading;
    const geos = [
      new THREE.BoxGeometry(0.07, 3.8, 0.07).translate(-5.8, 1.9, 0),
      new THREE.BoxGeometry(0.07, 3.8, 0.07).translate(5.8, 1.9, 0),
      new THREE.BoxGeometry(11.7, 0.07, 0.07).translate(0, 3.8, 0),
    ];
    const geometry = mergeGeometries(geos)!;
    geos.forEach((g) => g.dispose());
    frame.add(new THREE.Mesh(geometry, mat));
    group.add(frame);
  }
  let next = 0,
    start = -1,
    time = 0,
    best = Infinity,
    boosts = 0;
  return {
    group,
    reset() {
      next = 0;
      start = -1;
      time = 0;
      boosts = 0;
      materials.forEach((m) => m.color.set('#42e7ff'));
    },
    boost() {
      boosts++;
    },
    status() {
      return {
        passed: next,
        total: gates.length,
        time,
        best: Number.isFinite(best) ? best : null,
        boosts,
        complete: next === gates.length,
      };
    },
    update(t: number, p: readonly [number, number, number], speed: number, manual: boolean) {
      if (!manual) return;
      if (start < 0 && Math.abs(speed) > 0.4) start = t;
      if (start >= 0 && next < gates.length) time = Math.max(0, t - start);
      const gate = gates[next];
      if (!gate) return;
      if (Math.hypot(p[0] - gate.position[0], p[2] - gate.position[2]) < 6) {
        materials[next]!.color.set('#9bff63');
        next++;
        if (next === gates.length) best = Math.min(best, time);
      }
    },
  };
}
