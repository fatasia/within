import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  cityGround,
  qingmingBridgeHeight,
  qingmingRiver,
  qingmingRiverTangent,
  qingmingMainStreet,
} from './cityLayout';
import { qingmingCitizen } from './qingmingDetails';
import { gateTransport, type StreetMaterials } from './qingmingEpisodes';
import { registerUpdate } from './featuredShared';
import { curveRod } from './modelGeometry';

type Update = (time: number) => void;

/** Rigid pieces share one skinned draw; no per-frame vertex uploads or model rebuilds. */
export function bakeQingmingRig(root: THREE.Bone): THREE.SkinnedMesh {
  root.updateMatrixWorld(true);
  const bones: THREE.Bone[] = [];
  const sources: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Bone) bones.push(object);
    if (object instanceof THREE.Mesh) sources.push(object);
  });
  const parts: THREE.BufferGeometry[] = [];
  for (const source of sources) {
    let parent: THREE.Object3D | null = source.parent;
    while (parent && !(parent instanceof THREE.Bone)) parent = parent.parent;
    const bone = bones.indexOf(parent as THREE.Bone);
    const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
    geometry.deleteAttribute('uv');
    const position = geometry.getAttribute('position');
    if (!geometry.index) geometry.setIndex(Array.from({ length: position.count }, (_, i) => i));
    const material = source.material as THREE.MeshStandardMaterial;
    const pigment = material.userData.surfaceColor
      ? new THREE.Color(material.userData.surfaceColor)
      : material.color;
    const colors = new Float32Array(position.count * 3);
    const indices = new Uint16Array(position.count * 4);
    const weights = new Float32Array(position.count * 4);
    for (let i = 0; i < position.count; i++) {
      pigment.toArray(colors, i * 3);
      indices[i * 4] = bone;
      weights[i * 4] = 1;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
    parts.push(geometry);
    source.removeFromParent();
    source.geometry.dispose();
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  const mesh = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }),
  );
  mesh.add(root);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = mesh.receiveShadow = true;
  // The root bones travel outside their bind-pose bounds. This small batch is always visible.
  mesh.frustumCulled = false;
  mesh.name = 'qingming-moving-street-life';
  return mesh;
}

function bone(parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0): THREE.Bone {
  const child = new THREE.Bone();
  child.name = name;
  child.position.set(x, y, z);
  parent.add(child);
  return child;
}

/** Grounded stance followed by a lifted recovery, keyed to distance rather than clock speed. */
export function qingmingFootstep(
  distance: number,
  phase: number,
): { forward: number; lift: number } {
  const cycle = (((distance / 0.66 + phase) % 1) + 1) % 1;
  if (cycle < 0.6) return { forward: 0.198 - cycle * 0.66, lift: 0 };
  const swing = (cycle - 0.6) / 0.4;
  return {
    forward: -0.198 + 0.396 * (swing - Math.sin(swing * Math.PI * 2) / (Math.PI * 2)),
    lift: 0.1 * Math.sin(swing * Math.PI),
  };
}

/** The loaded cart brakes before the existing gate queue; it never teleports back through it. */
export function qingmingCartTravel(time: number): { distance: number; speed: number } {
  const t = Math.max(0, time);
  if (t <= 64) return { distance: t * 0.5, speed: 0.5 };
  if (t >= 96) return { distance: 40, speed: 0 };
  const brake = t - 64;
  return {
    distance: 32 + brake * 0.25 + (8 / Math.PI) * Math.sin((brake * Math.PI) / 32),
    speed: 0.25 * (1 + Math.cos((brake * Math.PI) / 32)),
  };
}

function walker(parent: THREE.Bone, materials: StreetMaterials, index: number) {
  const root = bone(parent, `qingming-walker-${index}`);
  const citizen = qingmingCitizen(
    {
      robe: [materials.blue, materials.linen, materials.clay][index % 3]!,
      skin: materials.skin,
      hair: materials.dark,
      trim: materials.wood,
    },
    index + 1,
    index < 8 || index === 12,
  );
  root.add(citizen);
  const feet = [-1, 1].map((side) => bone(root, `walker-${index}-foot-${side}`));
  const arms = [-1, 1].map((side) => bone(root, `walker-${index}-arm-${side}`, side * 0.19, 1.29));
  root.updateMatrixWorld(true);
  // Citizens already have separate sleeve, hand, ankle and shoe pieces. Reuse that model.
  for (const object of [...citizen.children]) {
    if (!(object instanceof THREE.Mesh)) continue;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
    const center = bounds.getCenter(new THREE.Vector3());
    const side = center.x < 0 ? 0 : 1;
    if (bounds.max.y < 0.42) feet[side]!.attach(object);
    else if (Math.abs(center.x) > 0.23 && bounds.min.y > 0.65 && bounds.max.y < 1.45)
      arms[side]!.attach(object);
  }
  const update = (distance: number, speed: number, ground: (x: number, z: number) => number) => {
    const gait = (distance * Math.PI * 2) / 0.66;
    const active = Math.min(1, speed / 0.2);
    for (let side = 0; side < 2; side++) {
      const step = qingmingFootstep(distance, side * 0.5);
      const forward = step.forward * active;
      const x = root.position.x + Math.sin(root.rotation.y) * forward;
      const z = root.position.z + Math.cos(root.rotation.y) * forward;
      feet[side]!.position.set(0, ground(x, z) - root.position.y + step.lift * active, forward);
      arms[side]!.rotation.x = Math.cos(gait + side * Math.PI) * 0.16 * active;
    }
  };
  return { root, arms, update };
}

/** Separate the few moving actors before static material batching. */
export function buildQingmingLife(materials: StreetMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-life';
  group.userData.interpretation = '沿街行走、运货与行舟是基于画面生活场景的动态演绎。';
  const rig = new THREE.Bone();
  rig.name = 'qingming-life-rig';
  const updates: Update[] = [];

  // Two pedestrian lanes leave the working cart lane and shop entrances clear.
  for (let index = 0; index < 8; index++) {
    const actor = walker(rig, materials, index);
    const path = new THREE.CatmullRomCurve3(
      index < 4
        ? [
            new THREE.Vector3(-14, 0, qingmingMainStreet(-14) - 2),
            new THREE.Vector3(-5, 0, qingmingMainStreet(-5) - 2),
            new THREE.Vector3(15, 0, qingmingMainStreet(15) - 2),
            new THREE.Vector3(38, 0, qingmingMainStreet(38) - 2),
            new THREE.Vector3(41, 0, -45),
            new THREE.Vector3(38, 0, qingmingMainStreet(38) + 2),
            new THREE.Vector3(15, 0, qingmingMainStreet(15) + 2),
            new THREE.Vector3(-5, 0, qingmingMainStreet(-5) + 2),
            new THREE.Vector3(-14, 0, qingmingMainStreet(-14) + 2),
          ]
        : [
            new THREE.Vector3(-58, 0, -47.25),
            new THREE.Vector3(-10, 0, -47.25),
            new THREE.Vector3(29, 0, -47.25),
            new THREE.Vector3(32, 0, -44.9),
            new THREE.Vector3(29, 0, -42.75),
            new THREE.Vector3(-10, 0, -42.75),
            new THREE.Vector3(-58, 0, -42.75),
            new THREE.Vector3(-61, 0, -44.9),
          ],
      true,
      'centripetal',
    );
    const length = path.getLength();
    const position = new THREE.Vector3(),
      tangent = new THREE.Vector3();
    updates.push((time) => {
      const distance = time * 0.64 + (index * length) / 8;
      const u = (distance % length) / length;
      path.getPointAt(u, position);
      path.getTangentAt(u, tangent);
      actor.root.position.set(position.x, cityGround(position.x, position.z) + 0.08, position.z);
      actor.root.rotation.y = Math.atan2(tangent.x, tangent.z);
      actor.update(distance, 0.64, (x, z) => cityGround(x, z) + 0.08);
    });
  }

  // Four bridge pedestrians use the same arch height as the actual deck.
  for (let index = 8; index < 12; index++) {
    const actor = walker(rig, materials, index);
    updates.push((time) => {
      const angle = time * 0.028 + ((index - 8) * Math.PI) / 2;
      const x = -20 + 1.15 * Math.cos(angle);
      const z = qingmingRiver(-20) + 18 * Math.sin(angle);
      const dx = -1.15 * Math.sin(angle),
        dz = 18 * Math.cos(angle);
      actor.root.position.set(x, qingmingBridgeHeight(z) + 0.025, z);
      actor.root.rotation.y = Math.atan2(dx, dz);
      actor.update(
        time * 0.42 + index,
        Math.hypot(dx, dz) * 0.028,
        (_x, z) => qingmingBridgeHeight(z) + 0.025,
      );
    });
  }

  const cartRoot = bone(rig, 'qingming-travelling-cart');
  const cart = gateTransport(materials);
  cart.name = 'qingming-working-cart-model';
  cartRoot.add(cart);
  const wheels = [-1, 1].map((side) => bone(cartRoot, `cart-wheel-${side}`, 0, 0.8, side * 0.9));
  const legs = new Map<string, THREE.Bone>();
  for (const side of [-1, 1])
    for (const fore of [-1, 1]) {
      legs.set(
        `leg:${side}:${fore}`,
        bone(cartRoot, `cart-leg-${side}-${fore}`, 3.8 + fore * 0.58, 1.14, side * 0.23),
      );
    }
  const tail = bone(cartRoot, 'cart-tail', 2.88, 1.25, 0);
  const ears = bone(cartRoot, 'cart-ears', 4.7, 2.0, 0);
  cartRoot.updateMatrixWorld(true);
  for (const object of [...cart.children]) {
    const role = object.userData.motionPart as string | undefined;
    if (role?.startsWith('wheel:')) wheels[role.endsWith('-1') ? 0 : 1]!.attach(object);
    if (role && legs.has(role)) legs.get(role)!.attach(object);
    if (object.userData.livingPart === 'tail') tail.attach(object);
    if (object.userData.livingPart === 'ear') ears.attach(object);
  }
  // Keep the existing stopped handler with the gate queue, not duplicated inside this moving cart.
  const handler = cart.getObjectByName('donkey-handler');
  if (handler) {
    handler.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    handler.removeFromParent();
  }
  for (const child of [...cart.children])
    if (child.userData.livingPart === 'lead') {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
      child.removeFromParent();
    }
  const driver = walker(rig, materials, 12);
  const leadingRope = new THREE.Group();
  cartRoot.add(leadingRope);
  curveRod(
    leadingRope,
    [
      new THREE.Vector3(5.08, 1.89, 0.12),
      new THREE.Vector3(5.5, 1.05, 0.65),
      new THREE.Vector3(5.975, 0.785, 1.11),
    ],
    0.014,
    materials.dark,
    10,
  ).name = 'travelling-cart-leading-rope';
  updates.push((time) => {
    const { distance, speed } = qingmingCartTravel(time);
    cartRoot.position.set(-8 + distance, 2.88, -45.2);
    for (const wheel of wheels) wheel.rotation.z = -distance / 0.795;
    let i = 0;
    for (const leg of legs.values()) {
      // A four-beat walking gait, not a diagonal trot under a loaded cart.
      leg.rotation.z =
        Math.sin(
          (distance * Math.PI * 2) / 1.3 + [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5][i++]!,
        ) *
        0.22 *
        Math.min(1, speed / 0.2);
    }
    tail.rotation.x = Math.sin(time * 1.7) * 0.15;
    ears.rotation.x = Math.sin(time * 0.9) * 0.08;
    driver.root.position.set(cartRoot.position.x + 5.8, 2.88, -43.8);
    driver.root.rotation.y = Math.PI / 2;
    driver.update(distance, speed, () => 2.88);
    driver.arms[1]!.rotation.x = 0; // The right hand keeps hold of the leading rope.
  });

  group.add(bakeQingmingRig(rig));
  group.userData.walkers = 13;
  group.userData.movingCarts = 1;
  const update = (time: number) => {
    if (!Number.isFinite(time)) return;
    for (const animate of updates) animate(Math.max(0, time));
  };
  registerUpdate(group, update);
  update(0);
  return group;
}

/** Reuse existing vessels: the lowered bridge rig stays intact and moored cargo gently rocks. */
export function prepareQingmingBoats(vessels: THREE.Group[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-river-life';
  const root = new THREE.Bone();
  const animations: Update[] = [];
  for (const [index, vessel] of vessels.entries()) {
    const rest = vessel.position.clone();
    const yaw = vessel.rotation.y;
    vessel.position.set(0, 0, 0);
    vessel.rotation.y = 0;
    const anchor = bone(root, `qingming-floating-boat-${index}`);
    anchor.add(vessel);
    const oar = vessel.getObjectByName('qingming-working-oar');
    const boatman = vessel.getObjectByName('qingming-working-boatman');
    if(oar || boatman) animations.push((time)=>{
      const cycle=time*1.5+index;
      if(oar){oar.rotation.y=Math.sin(cycle)*.38;oar.rotation.x=Math.cos(cycle)*.16;}
      if(boatman)boatman.rotation.z=Math.sin(cycle)*.12;
    });
    animations.push((time) => {
      // The passage boat travels on the central reach. It eases to rest downstream,
      // rather than reversing bow-first or wrapping visibly through the bridge.
      const travel =
        index === 0 ? 48 * (1 - Math.exp(-time / 100)) : Math.sin(time * 0.12 + index) * 0.14;
      const x = rest.x + travel;
      anchor.position.set(
        x,
        rest.y + Math.sin(time * 0.8 + index) * 0.035,
        rest.z + qingmingRiver(x) - qingmingRiver(rest.x),
      );
      anchor.rotation.set(
        Math.sin(time * 0.55 + index) * 0.008,
        index === 0 ? -Math.atan(qingmingRiverTangent(x)) : yaw,
        Math.sin(time * 0.7 + index) * 0.005,
      );
    });
  }
  const mesh = bakeQingmingRig(root);
  mesh.name = 'qingming-moving-boats';
  group.add(mesh);
  registerUpdate(group, (time) => {
    if (!Number.isFinite(time)) return;
    for (const animate of animations) animate(Math.max(0, time));
  });
  for (const animate of animations) animate(0);
  return group;
}
