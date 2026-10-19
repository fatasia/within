import * as THREE from 'three';
import { buildRoadsterCyberStage } from './roadsterCyberStage';
import { makeNeonEnv } from './neonVendor/env.js';
import { buildRoadsterModel } from './roadsterModel';
import { buildRoadsterDancer } from './roadsterDancer';
import { createRoadsterChallenge } from './roadsterChallenge';
import {
  roadsterTrack,
  sampleRoadsterMotion,
  roadsterPoseView,
  stepRoadsterDrive,
  type RoadsterDriveInput,
} from './roadsterMotion';
import { registerUpdate, scatterInstanced, type Placement } from './featuredShared';
export function buildRoadster(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Roadster · reference-built test track';
  const car = buildRoadsterModel();
  group.add(car.group);
  const dancer = buildRoadsterDancer();
  car.group.add(dancer.root);
  group.userData.triggerDance = () => dancer.toggle();
  group.userData.onCharacterClick = (id: string) =>
    id === 'roadster-roof-dancer' ? dancer.toggle() : undefined;
  const cyber = buildRoadsterCyberStage();
  group.add(cyber.group);
  const challenge = createRoadsterChallenge();
  group.add(challenge.group);
  group.userData.getChallenge = challenge.status;
  group.userData.setQuality = cyber.setQuality;
  group.userData.ready = Promise.resolve();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3000, 3000),
    new THREE.MeshStandardMaterial({ color: '#0c1620', roughness: 0.58, metalness: 0.3 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.775, -70);
  ground.receiveShadow = true;
  group.add(ground);
  // Fine aggregate varies roughness without a downloaded texture or per-frame CPU work.
  const asphalt = new THREE.MeshStandardMaterial({
    color: '#101923',
    roughness: 0.35,
    metalness: 0.55,
  });
  asphalt.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nfloat grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n diffuseColor.rgb*=.94+.12*grain(gl_FragCoord.xy);',
      );
  };
  const pos: number[] = [],
    idx: number[] = [];
  const divisions = 160;
  for (let i = 0; i <= divisions; i++) {
    const d = -40 + (i * 250) / divisions;
    const s = roadsterTrack(d);
    for (const side of [-1, 1])
      pos.push(
        s.position[0] + Math.cos(s.heading) * side * 8,
        0.799,
        s.position[2] - Math.sin(s.heading) * side * 8,
      );
    if (i < divisions) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const road = new THREE.Mesh(geo, asphalt);
  road.receiveShadow = true;
  group.add(road);
  const marks: Placement[] = [];
  for (let d = -35; d < 202; d += 7) {
    const s = roadsterTrack(d);
    for (const side of [-1, 1])
      marks.push({
        position: [
          s.position[0] + Math.cos(s.heading) * side * 7.3,
          0.804,
          s.position[2] - Math.sin(s.heading) * side * 7.3,
        ],
        rotationY: s.heading,
        scale: [1, 1, 1],
      });
  }
  scatterInstanced(
    group,
    new THREE.BoxGeometry(0.09, 0.006, 3.2),
    new THREE.MeshStandardMaterial({ color: '#c5c5be', roughness: 0.9 }),
    marks,
  );
  const cones: Placement[] = [];
  for (let d = 20; d < 190; d += 25) {
    const s = roadsterTrack(d);
    cones.push({
      position: [
        s.position[0] + Math.cos(s.heading) * 8.5,
        0.96,
        s.position[2] - Math.sin(s.heading) * 8.5,
      ],
      rotationY: 0,
      scale: [1, 1, 1],
    });
  }
  scatterInstanced(
    group,
    new THREE.ConeGeometry(0.13, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: '#b4743f', roughness: 0.8 }),
    cones,
  );
  // Local neutral studio reflection keeps silver paint readable under the landscape light rig.
  group.userData.prepareAssets = (renderer: THREE.WebGLRenderer) => {
    if (car.paint.envMap) return;
    group.userData.ready = cyber.ready().catch((error: unknown) => {
      group.userData.assetError = String(error);
      console.error(error);
    });
    const room = makeNeonEnv();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromEquirectangular(room);
    room.dispose();
    pmrem.dispose();
    car.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        o.material.envMap = target.texture;
        o.material.envMapIntensity = 1.3;
        o.material.needsUpdate = true;
      }
    });
    asphalt.envMap = target.texture;
    asphalt.envMapIntensity = 0.19;
    car.paint.addEventListener('dispose', () => target.dispose());
  };
  const jetMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { strength: { value: 0 }, time: { value: 0 } },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec2 vUv;uniform float strength,time;void main(){float a=pow(sin(vUv.x*3.14159),2.)*pow(vUv.y,1.2)*(1.-pow(vUv.y,9.));a*=.8+.2*sin(vUv.y*45.-time*17.);gl_FragColor=vec4(.83,.9,.94,a*strength*.22);}',
  });
  const jets = new THREE.Group();
  jets.name = 'cold-gas-demonstration';
  for (const x of [-0.58, 0.58]) {
    const g = new THREE.ConeGeometry(0.3, 2.1, 16, 1, true);
    g.translate(0, -1.05, 0);
    const m = new THREE.Mesh(g, jetMaterial);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.39, 2.22);
    jets.add(m);
  }
  car.group.add(jets);
  const liftJets = new THREE.Group();
  for (const x of [-0.64, 0.64])
    for (const z of [-1.1, 1.1]) {
      const g = new THREE.ConeGeometry(0.22, 1.5, 12, 1, true);
      g.translate(0, -0.75, 0);
      const m = new THREE.Mesh(g, jetMaterial);
      m.position.set(x, 0.15, z);
      liftJets.add(m);
    }
  car.group.add(liftJets);
  const dustMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { strength: { value: 0 }, time: { value: 0 } },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec2 vUv;uniform float strength,time;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=smoothstep(1.,.65,r)*smoothstep(.25,.6,r);a*=.55+.45*sin(atan(p.y,p.x)*9.+r*21.+time*6.);gl_FragColor=vec4(.65,.64,.58,a*strength*.15);}',
  });
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(4, 5), dustMaterial);
  dust.rotation.x = -Math.PI / 2;
  dust.position.set(0, 0.018, 0.5);
  dust.name = 'fan-suction-ground-dust';
  car.group.add(dust);
  let progress = 0,
    lastElapsed = 0,
    boostAt = -100,
    gripAt = -100,
    lift = 0,
    manual = false;
  let driving = { x: 0, z: 0, heading: 0, speed: 0, distance: 0 };
  let touch: RoadsterDriveInput = { throttle: 0, steer: 0, brake: 0 },
    keyboard: RoadsterDriveInput = { throttle: 0, steer: 0, brake: 0 };
  let currentMotion = sampleRoadsterMotion(0);
  const update = (elapsed: number) => {
    const dt = Math.max(0, Math.min(0.1, elapsed - lastElapsed));
    lastElapsed = elapsed;
    dancer.update(group.userData.danceTime ?? elapsed);
    let m = sampleRoadsterMotion(progress, elapsed);
    if (manual) {
      const previous = driving;
      driving = stepRoadsterDrive(
        driving,
        {
          throttle: touch.throttle || keyboard.throttle,
          steer: touch.steer || keyboard.steer,
          brake: Math.max(touch.brake, keyboard.brake),
          grip:
            elapsed >= gripAt && elapsed - gripAt < 3
              ? Math.sin((Math.PI * (elapsed - gripAt)) / 3)
              : 0,
        },
        dt,
      );
      if (cyber.collides(driving.x, driving.z)) driving = { ...previous, speed: 0 };
      m = {
        ...m,
        ...roadsterPoseView([driving.x, 0.8, driving.z], driving.heading),
        distance: driving.distance,
        steer: -(touch.steer || keyboard.steer) * 0.4,
        jet: 0,
        grip: Math.max(touch.brake, keyboard.brake),
        wing: Math.max(touch.brake, keyboard.brake),
      };
    }
    currentMotion = m;
    challenge.update(elapsed, m.position, driving.speed, manual);
    car.group.position.set(...m.position);
    car.group.rotation.set(...m.rotation);
    const boostAge = elapsed - boostAt;
    const pulse = boostAge >= 0 && boostAge < 2.2 ? Math.sin((Math.PI * boostAge) / 2.2) : 0;
    lift = 2.2 * pulse * pulse;
    liftJets.visible = pulse > 0.05;
    car.group.position.y += lift;
    car.group.rotation.x -= pulse * 0.07;
    const gripAge = elapsed - gripAt;
    const gripPulse = gripAge >= 0 && gripAge < 3 ? Math.sin((Math.PI * gripAge) / 3) : 0;
    cyber.update(elapsed, m.position);
    for (const w of car.wheels) w.rotation.x = -m.distance / 0.37;
    for (const w of car.frontWheels) w.rotation.y = m.steer;
    car.steering.rotation.z = -m.steer * 12;
    car.wing.position.y = 0.95 + Math.max(m.wing, gripPulse) * 0.16;
    car.wing.rotation.x = -Math.max(m.wing, gripPulse) * 0.22;
    jetMaterial.uniforms.strength!.value = Math.max(m.jet, pulse * 2.4);
    jets.scale.set(1, 1, 1 + pulse * 0.6);
    jetMaterial.uniforms.time!.value = elapsed;
    dustMaterial.uniforms.strength!.value = Math.max(m.grip, gripPulse * 3);
    dust.position.y = 0.018 - lift;
    dustMaterial.uniforms.time!.value = elapsed;
  };
  group.userData.setVoyageProgress = (p: number) => {
    const next = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
    if (Math.abs(next - progress) > 0.000001) {
      manual = false;
      driving.speed = 0;
    }
    progress = next;
    update(lastElapsed);
  };
  const accept = (input: Partial<RoadsterDriveInput>, channel: 'touch' | 'keyboard') => {
    if (!manual && (input.throttle || input.steer || input.brake)) {
      manual = true;
      driving = {
        x: currentMotion.position[0],
        z: currentMotion.position[2],
        heading: currentMotion.rotation[1],
        speed: 0,
        distance: currentMotion.distance,
      };
    }
    if (channel === 'touch') touch = { ...touch, ...input };
    else keyboard = { ...keyboard, ...input };
  };
  group.userData.setDriveInput = (input: Partial<RoadsterDriveInput>) => accept(input, 'touch');
  group.userData.setKeyboardInput = (input: RoadsterDriveInput) => accept(input, 'keyboard');
  group.userData.clearDriveInput = () => {
    touch = { throttle: 0, steer: 0, brake: 0 };
    keyboard = { ...touch };
    driving.speed = 0;
  };
  group.userData.resetVehicle = () => {
    challenge.reset();
    manual = false;
    progress = 0;
    driving = { x: 0, z: 0, heading: 0, speed: 0, distance: 0 };
    touch = { throttle: 0, steer: 0, brake: 0 };
    keyboard = { ...touch };
    boostAt = -100;
    gripAt = -100;
    update(lastElapsed);
  };
  group.userData.getDriveState = () => ({ ...currentMotion, manual, speed: driving.speed });
  group.userData.triggerBoost = () => {
    if (lastElapsed - boostAt > 2.3) {
      boostAt = lastElapsed;
      challenge.boost();
    }
  };
  group.userData.triggerGrip = () => {
    gripAt = lastElapsed;
  };
  group.userData.getVehicleLift = () => lift;
  group.userData.setCockpitView = (active: boolean) => {
    car.glass.opacity = active ? 0.12 : 0.97;
  };
  group.userData.setPaint = (hex: string) => {
    if (/^#[0-9a-f]{6}$/i.test(hex)) car.paint.color.set(hex);
  };
  group.userData.reference =
    '依据2026款官方多角度图片重建，非官方CAD；喷气与吸附为原理演示。';
  registerUpdate(group, update);
  update(0);
  return group;
}
