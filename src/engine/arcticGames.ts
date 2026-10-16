import * as THREE from 'three';
import { addMesh, mat } from './featuredShared';
import type { PenguinRig } from './arcticWildlife';
import { polarBall, polarSnowball } from './arcticPlay';

/** Three cheap props: rolling ball, airborne snowball, and one instanced impact spray. */
export function buildPolarGames(parent: THREE.Group, penguins: PenguinRig[], ground: (x: number, z: number) => number): (time: number) => void {
  const ball = new THREE.Group(); ball.name = 'penguin rolling play ball'; parent.add(ball);
  const white = mat('#e7e7d9', { roughness: .83 });
  const blue = mat('#30758b', { roughness: .8 });
  addMesh(ball, new THREE.SphereGeometry(.28, 20, 12), white);
  // Three inset-looking great-circle seams make roll visually readable.
  for (let axis = 0; axis < 3; axis++) {
    const seam = addMesh(ball, new THREE.TorusGeometry(.278, .014, 4, 36), blue);
    seam.rotation.set(axis === 0 ? Math.PI / 2 : 0, axis === 1 ? Math.PI / 2 : 0, 0);
  }
  ball.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  const snowball = addMesh(parent, new THREE.IcosahedronGeometry(.14, 1), mat('#eff6f6'));
  snowball.name = 'penguin thrown snowball'; snowball.castShadow = true;
  const fragments = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.055, 0), white, 18);
  fragments.name = 'snowball landing snow spray'; fragments.frustumCulled = false;parent.add(fragments);
  const transform = new THREE.Object3D();
  const hand = new THREE.Vector3();
  return time => {
    const b = polarBall(time), s = polarSnowball(time);
    ball.position.set(b.x, ground(b.x, b.z) + .28 + b.lift, b.z);ball.rotation.z = b.rotation;
    for (const index of [2, 3]) {
      const rig = penguins[index]!, kick = index === 2 ? b.leftKick : b.rightKick;
      // The foot reaches the ball at release; it retracts before the ball returns.
      rig.feet[0]!.position.z = .1 + kick * .26;
      rig.feet[0]!.rotation.x -= kick * .6;
      if (index === s.recipient) { rig.root.position.z += s.duck * .48; rig.root.rotation.x -= s.duck * .18; rig.head.rotation.x += s.duck * .22; }
    }
    const thrower = penguins[4]!;
    thrower.flippers[0]!.rotation.x = -s.windup * 1.4;
    thrower.flippers[0]!.rotation.z -= s.windup * .7;
    thrower.root.rotation.y = Math.atan2(s.recipient === 3 ? -2.15 : -8.15, -3.4);
    snowball.visible = s.flight || s.windup > .1;
    if (s.flight) snowball.position.set(s.x, ground(s.x, s.z) + s.lift + .14, s.z);
    else {
      thrower.root.updateWorldMatrix(true,true);
      hand.set(-.06,-.46,0).applyMatrix4(thrower.flippers[0]!.matrixWorld);parent.worldToLocal(hand);snowball.position.copy(hand);
    }
    fragments.visible = s.burst >= 0;
    if (s.burst >= 0) for (let i = 0; i < fragments.count; i++) {
      const angle = i * 2.399963, distance = s.burst * (.5 + (i % 5) * .18);
      const x = s.x + Math.cos(angle) * distance, z = s.z + Math.sin(angle) * distance;
      transform.position.set(x, ground(x, z) + .035 + Math.max(0, Math.sin(s.burst * Math.PI) * (.18 + (i % 4) * .08)), z);
      transform.scale.setScalar(1 - s.burst * .8);transform.updateMatrix();fragments.setMatrixAt(i, transform.matrix);
    }
    if (s.burst >= 0) fragments.instanceMatrix.needsUpdate = true;
  };
}
