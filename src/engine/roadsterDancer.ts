import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const ROADSTER_DANCE_BPM = 138;
export const ROADSTER_DANCE_CYCLE = 16 * 60 / ROADSTER_DANCE_BPM;
/** A stylised Musk roof-dance toy, not a recording or a realistic likeness. Feet stay above the glass. */
export function buildRoadsterDancer() {
  const root = new THREE.Group();
  root.name = '马斯克车顶舞蹈玩偶';
  root.position.set(0, 1.255, 0.12);
  root.visible = false;
  root.userData.encounterId = 'roadster-roof-dancer';
  const skin = new THREE.MeshStandardMaterial({ color: '#e1b49b', roughness: 0.7 }),
    black = new THREE.MeshStandardMaterial({ color: '#15191e', roughness: 0.57 }),
    white = new THREE.MeshStandardMaterial({ color: '#e9e9df', roughness: 0.75 }),
    hair = new THREE.MeshStandardMaterial({ color: '#392c29', roughness: 0.85 });
  const sphere = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const g = new THREE.SphereGeometry(1, 14, 10);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    return g;
  };
  const box = (x: number, y: number, z: number, px: number, py: number, pz: number) => {
    const g = new THREE.BoxGeometry(x, y, z);
    g.translate(px, py, pz);
    return g;
  };
  const add = (parent: THREE.Group, geos: THREE.BufferGeometry[], mat: THREE.Material) => {
    const g = mergeGeometries(geos.map((g) => g.toNonIndexed()));
    geos.forEach((g) => g.dispose());
    if (g) {
      const m = new THREE.Mesh(g, mat);
      m.userData.encounterId = 'roadster-roof-dancer';
      parent.add(m);
    }
  };
  const torso = new THREE.Group();
  torso.position.y = 0.49;
  root.add(torso);
  add(torso, [sphere(0.18, 0.23, 0.105, 0, 0.12, 0), sphere(0.19, 0.07, 0.1, 0, 0.25, 0)], black);
  // Extruded letters require no canvas, remain legible and work in Node tests.
  const glyphs: Record<string, string[]> = {
    M: ['10001','11011','10101','10101','10001','10001','10001'],
    U: ['10001','10001','10001','10001','10001','10001','01110'],
    S: ['01111','10000','10000','01110','00001','00001','11110'],
    K: ['10001','10010','10100','11000','10100','10010','10001'],
  };
  const label = new THREE.Group(); label.name = 'MUSK chest and back'; torso.add(label);
  for (const face of [-1, 1]) {
    const letters: THREE.BufferGeometry[] = [];
    'MUSK'.split('').forEach((letter, i) => glyphs[letter].forEach((row, y) => [...row].forEach((bit, x) => {
      if (bit === '1') letters.push(box(.011, .012, .003,
        (face === -1 ? -1 : 1) * ((i * 6 + x) - 11) * .011, .21 - y * .012, face * .109));
    })));
    add(label, letters, white);
  }
  const head = new THREE.Group();
  head.position.y = 0.43;
  torso.add(head);
  add(
    head,
    [
      sphere(0.119, 0.15, 0.104, 0, 0, 0),
      sphere(0.025, 0.035, 0.035, 0, -0.015, -0.1),
      sphere(0.026, 0.045, 0.025, -0.117, 0, 0),
      sphere(0.026, 0.045, 0.025, 0.117, 0, 0),
    ],
    skin,
  );
  const cap = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48);
  cap.scale(0.121, 0.154, 0.108);
  cap.translate(0, 0.014, 0.008);
  add(head, [cap, sphere(0.09, 0.04, 0.05, -0.025, 0.12, -0.065)], hair);
  add(
    head,
    [
      sphere(0.012, 0.007, 0.006, -0.044, 0.022, -0.1),
      sphere(0.012, 0.007, 0.006, 0.044, 0.022, -0.1),
      box(0.04, 0.006, 0.006, 0, -0.071, -0.094),
    ],
    black,
  );
  const arms: { upper: THREE.Group; elbow: THREE.Group }[] = [];
  const limbs: { side: number; shoe: THREE.Group; thigh: THREE.Mesh; shin: THREE.Mesh; knee: THREE.Mesh }[] = [];
  for (const side of [-1, 1]) {
    const upper = new THREE.Group(); upper.position.set(side * .18, .25, 0); torso.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -.16; upper.add(elbow);
    const sleeve = new THREE.CapsuleGeometry(.055, .10, 4, 8); sleeve.translate(0, -.08, 0);
    add(upper, [sleeve], black);
    const forearm = new THREE.CapsuleGeometry(.042, .105, 4, 8); forearm.translate(0, -.08, 0);
    add(elbow, [forearm], black);
    add(elbow, [sphere(.046, .058, .044, 0, -.18, 0)], skin);
    arms.push({upper, elbow});
    const shoe = new THREE.Group(); shoe.name = `planted-shoe-${side}`; root.add(shoe);
    add(shoe, [sphere(.068, .038, .106, 0, .038, -.025)], black);
    add(shoe, [box(.12, .012, .18, 0, .009, -.022)], white);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(.064, .056, 1, 8), black);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(.055, .044, 1, 8), black);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(.057, 10, 8), black);
    root.add(thigh, shin, knee); limbs.push({side, shoe, thigh, shin, knee});
  }
  // Side-step, crouch, hip hit, raised hands, shoulder accents, opposite step,
  // backward lean and reset. Each beat has a held pose rather than one sine sway.
  const poses = [
    [0, .49, 0, 0, -.55, .55, -.4, -.4],
    [-.055, .43, -.10, -.22, -1.05, .35, -1.1, -.5],
    [-.025, .40, .13, .18, -.45, .85, -1.3, -1.3],
    [.045, .47, -.12, -.20, -2.25, 2.0, -.65, -.85],
    [0, .46, .08, .20, -1.5, 1.5, -1.45, -.5],
    [.055, .43, .10, .25, -.35, 1.1, -.5, -1.1],
    [.025, .45, -.08, -.22, -.9, 1.0, -1.2, -1.2],
    [0, .48, 0, 0, -.6, .6, -.3, -.3],
  ];
  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  const hip = new THREE.Vector3(), ankle = new THREE.Vector3(), kneePoint = new THREE.Vector3();
  const segment = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    direction.subVectors(b, a); mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.scale.y = direction.length(); mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  };
  let active = false;
  return {
    root,
    toggle() { active = !active; root.visible = active; return active; },
    update(t: number) {
      if (!active) return;
      const phase = ((t % ROADSTER_DANCE_CYCLE) + ROADSTER_DANCE_CYCLE) % ROADSTER_DANCE_CYCLE / ROADSTER_DANCE_CYCLE * poses.length;
      const index = Math.floor(phase), f = phase - index, blend = f * f * (3 - 2 * f);
      const a = poses[index], b = poses[(index + 1) % poses.length];
      const v = (n: number) => THREE.MathUtils.lerp(a[n], b[n], blend);
      const beat = Math.sin(t * Math.PI * 2 * ROADSTER_DANCE_BPM / 60);
      torso.position.set(v(0), v(1) - .008 * (1 - beat), 0);
      torso.rotation.set(index === 6 ? -.12 * Math.sin(f * Math.PI) : .035 * beat, v(3), v(2));
      head.rotation.set(.035 * beat, -v(3) * .45, -v(2) * .65);
      arms.forEach(({upper, elbow}, i) => {
        upper.rotation.set(.18 * beat + (index === 3 ? -.35 : 0), 0, v(4 + i));
        elbow.rotation.x = v(6 + i);
      });
      limbs.forEach(({side, shoe, thigh, shin, knee}, i) => {
        const stepping = index === (i === 0 ? 0 : 4) || index === (i === 0 ? 1 : 5);
        shoe.position.set(side * .105 + v(0) * .35, stepping ? Math.sin(f * Math.PI) * .035 : 0, 0);
        shoe.rotation.y = side * .08 + v(3) * .2;
        hip.set(side * .085 + torso.position.x, torso.position.y, 0);
        ankle.copy(shoe.position); ankle.y += .065;
        const d = hip.distanceTo(ankle), bend = Math.sqrt(Math.max(0, .235 ** 2 - (d * .5) ** 2));
        kneePoint.copy(hip).add(ankle).multiplyScalar(.5); kneePoint.z -= bend;
        segment(thigh, hip, kneePoint); segment(shin, kneePoint, ankle); knee.position.copy(kneePoint);
      });
    },
  };
}
