import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roadsterTrack } from './roadsterMotion';

export const SKY_CAR_COUNT = 8;
/** Separate opposing lanes stay inside the street canyon, above the player's boost ceiling. */
export function sampleSkyCar(index: number, time: number) {
  const t = Number.isFinite(time) ? time : 0;
  const direction = index % 2 ? -1 : 1;
  const distance =
    ((((index * 25 - 45 + t * direction * (3.8 + (index % 3)) + 60) % 310) + 310) % 310) - 60;
  const track = roadsterTrack(distance);
  const side = direction * (3.7 + (index % 3) * 0.3);
  return {
    x: track.position[0] + Math.cos(track.heading) * side,
    y: 7.2 + (index % 3) * 1.8 + Math.sin(t * 0.55 + index) * 0.18,
    z: track.position[2] - Math.sin(track.heading) * side,
    heading: track.heading + (direction < 0 ? Math.PI : 0),
    bank: Math.sin(t * 0.3 + index) * 0.035,
  };
}

/** Eight distant vehicles share four instance batches; steam is one point draw, no lights/shadows. */
export function buildRoadsterSkyTraffic() {
  const group = new THREE.Group();
  group.name = 'sky traffic · steam-powered background vehicles';
  const parts: THREE.BufferGeometry[][] = [[], [], [], []];
  function box(
    bucket: number,
    size: [number, number, number],
    position: [number, number, number],
    tilt = 0,
  ) {
    const g = new THREE.BoxGeometry(...size);
    g.rotateX(tilt);
    g.translate(...position);
    parts[bucket]!.push(g);
  }
  box(0, [1.85, 0.32, 4.15], [0, 0.12, 0]);
  box(0, [1.72, 0.2, 1.2], [0, 0.3, -1.43], -0.12);
  box(0, [1.78, 0.16, 0.8], [0, 0.29, 1.64], 0.1);
  box(1, [1.45, 0.47, 1.95], [0, 0.49, 0.05]);
  box(0, [1.51, 0.07, 1.55], [0, 0.76, 0.1]);
  box(2, [1.6, 0.16, 3.4], [0, -0.16, 0]);
  for (const x of [-0.84, 0.84]) {
    box(2, [0.24, 0.25, 3.1], [x, -0.05, 0.1]);
    box(3, [0.045, 0.05, 2.7], [x * 1.1, 0.17, 0]);
    for (const z of [-1.25, 1.25]) {
      const nozzle = new THREE.CylinderGeometry(0.17, 0.23, 0.26, 8);
      nozzle.translate(x, -0.24, z);
      parts[2]!.push(nozzle);
      const core = new THREE.CylinderGeometry(0.12, 0.16, 0.02, 8);
      core.translate(x, -0.38, z);
      parts[3]!.push(core);
    }
  }
  box(3, [1.55, 0.055, 0.03], [0, 0.23, -2.09]);
  box(3, [1.5, 0.04, 0.03], [0, 0.22, 2.09]);
  const materials = [
    new THREE.MeshStandardMaterial({
      color: '#b4bbc8',
      emissive: '#38526a',
      emissiveIntensity: 0.65,
      metalness: 0.68,
      roughness: 0.28,
    }),
    new THREE.MeshStandardMaterial({
      color: '#183542',
      metalness: 0.7,
      roughness: 0.16,
      emissive: '#214654',
      emissiveIntensity: 0.38,
    }),
    new THREE.MeshStandardMaterial({ color: '#303947', metalness: 0.7, roughness: 0.42 }),
    new THREE.MeshBasicMaterial({ color: '#9aeafa', toneMapped: false }),
  ];
  const batches = parts.map((list, i) => {
    const geometry = mergeGeometries(list)!;
    list.forEach((g) => g.dispose());
    const mesh = new THREE.InstancedMesh(geometry, materials[i]!, SKY_CAR_COUNT);
    mesh.name = [
      'air taxi hulls',
      'air taxi glazing',
      'air taxi lift engines',
      'air taxi running lights',
    ][i]!;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });
  const shades = ['#cad2da', '#547d92', '#b79e80', '#845474'];
  for (let i = 0; i < SKY_CAR_COUNT; i++)
    batches[0]!.setColorAt(i, new THREE.Color(shades[i % 4]!));
  const steps = 28,
    positions = new Float32Array(SKY_CAR_COUNT * steps * 2 * 3);
  const ages = new Float32Array(SKY_CAR_COUNT * steps * 2);
  for (let i = 0; i < ages.length; i++) ages[i] = (Math.floor(i / 2) % steps) / steps;
  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  steamGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
  const steamMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute float age;varying float vAge;void main(){vAge=age;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp((130.+age*410.)/max(1.,-p.z),1.,64.);}`,
    fragmentShader: `uniform float time;varying float vAge;void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);float cloud=1.-smoothstep(.18,1.,r);cloud*=.75+.25*sin(p.x*7.+sin(p.y*5.+time*.6)+vAge*12.);float a=cloud*(1.-vAge)*.28;gl_FragColor=vec4(.67,.82,.87,a);}`,
  });
  const steam = new THREE.Points(steamGeometry, steamMaterial);
  steam.name = 'drifting steam wakes';
  steam.frustumCulled = false;
  group.add(steam);
  const pose = new THREE.Object3D();
  let count = SKY_CAR_COUNT;
  function update(time: number) {
    steamMaterial.uniforms.time!.value = time;
    for (let i = 0; i < count; i++) {
      const p = sampleSkyCar(i, time);
      pose.position.set(p.x, p.y, p.z);
      pose.rotation.set(0, p.heading, p.bank);
      pose.updateMatrix();
      for (const mesh of batches) mesh.setMatrixAt(i, pose.matrix);
      for (let j = 0; j < steps; j++) {
        const age = j / steps,
          old = sampleSkyCar(i, time - age * 2.9);
        for (let side = 0; side < 2; side++) {
          const k = ((i * steps + j) * 2 + side) * 3,
            spread = (side ? 1 : -1) * (0.72 + age * 0.7);
          positions[k] =
            old.x +
            Math.cos(old.heading) * spread +
            Math.sin(age * 9 + i + time * 0.6) * age * 0.45;
          positions[k + 1] = old.y - 0.45 - age * 0.75 + Math.sin(age * 12 + i) * age * 0.18;
          positions[k + 2] = old.z - Math.sin(old.heading) * spread + Math.cos(old.heading) * 1.6;
        }
      }
    }
    batches.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
    steamGeometry.attributes.position!.needsUpdate = true;
  }
  function setQuality(quality: string) {
    count = quality === 'low' ? 3 : quality === 'balanced' ? 5 : SKY_CAR_COUNT;
    batches.forEach((mesh) => {
      mesh.count = count;
    });
    steamGeometry.setDrawRange(0, count * steps * 2);
  }
  update(0);
  return { group, update, setQuality };
}
