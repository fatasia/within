import * as THREE from 'three';
import { qingmingBackdropGeometry } from './qingmingBackdrop';
import { qingmingRiver } from './cityLayout';
import { registerUpdate } from './featuredShared';

export const QINGMING_FLAGS = [
  [-26, -16],
  [-14, 21],
  [-46, -17],
  [-69, 18],
  [-97, -17],
  [8, -18],
] as const;

/** Wind is continuous, with the hoist fixed to its pole. */
export function qingmingFlagOffset(u: number, v: number, time: number, phase: number): number {
  return (
    u *
    u *
    (Math.sin(u * 7 - time * 2.1 + phase) * 0.16 + Math.sin(v * 5 + time * 1.3 + phase) * 0.07)
  );
}

export function buildQingmingAirLife(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-wind-and-distance';
  const clock = { value: 0 };
  const cloth = new THREE.MeshStandardMaterial({
    color: '#ddd1ad',
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const cloths = QINGMING_FLAGS.map(([x, offset], i) => {
    const geometry = new THREE.PlaneGeometry(1.15, 2.15, 10, 12);
    // Plane spans x=0..1.15 from the pole, downwards from the crossbar.
    geometry.translate(0.575, -1.075, 0);
    const flag = new THREE.Mesh(geometry, cloth);
    flag.position.set(x, 7.9, qingmingRiver(x) + offset);
    flag.rotation.y = i * 0.43;
    flag.name = `qingming-wind-banner-${i}`;
    flag.receiveShadow = true;
    group.add(flag);
    return {
      flag,
      geometry,
      rest: geometry.getAttribute('position').array.slice(),
      phase: i * 1.9,
    };
  });
  const posts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.045, 0.07, 5.3, 6),
    new THREE.MeshStandardMaterial({ color: '#66503b', roughness: 1 }),
    QINGMING_FLAGS.length,
  );
  const dummy = new THREE.Object3D();
  QINGMING_FLAGS.forEach(([x, z], i) => {
    dummy.position.set(x, 5.45, qingmingRiver(x) + z);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  });
  posts.castShadow = true;
  group.add(posts);

  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0.17, -0.16, 0, -0.05, -0.78, 0.03, -0.22, 0, 0, 0.17, 0.78, 0.03, -0.22, 0.16, 0,
        -0.05, -0.07, 0, 0.2, 0.07, 0, 0.2, 0, 0, -0.33,
      ],
      3,
    ),
  );
  const birdMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: clock, uNight: { value: 0 } },
    vertexShader: `uniform float uTime;varying float vDistance;void main(){
      float seed=instanceMatrix[3].x;
      vec3 p=position;
      float beat=sin(uTime*5.5+seed)*.42;
      p.y+=abs(p.x)*beat;
      vec4 world=instanceMatrix*vec4(p,1.);
      world.x+=sin(uTime*.09+seed)*17.;
      world.z+=cos(uTime*.09+seed)*12.;
      world.y+=sin(uTime*.4+seed)*.6;
      vec4 mv=modelViewMatrix*world;vDistance=-mv.z;
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader: `uniform float uNight;varying float vDistance;void main(){
      vec3 color=mix(vec3(.13,.15,.14),vec3(.035,.045,.06),uNight);
      color=mix(color,mix(vec3(.55,.64,.67),vec3(.06,.09,.13),uNight),smoothstep(80.,350.,vDistance));
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const birds = new THREE.InstancedMesh(birdGeo, birdMat, 12);
  for (let i = 0; i < 12; i++) {
    dummy.position.set(-90 + i * 11, 18 + (i % 4) * 1.6, qingmingRiver(-90 + i * 11) - 6);
    dummy.rotation.y = i * 0.71;
    dummy.updateMatrix();
    birds.setMatrixAt(i, dummy.matrix);
  }
  birds.name = 'qingming-river-swallows';
  birds.frustumCulled = false;
  group.add(birds);

  // Continue the plain beyond the detailed terrain instead of exposing the global water quad.
  const horizonGeo = qingmingBackdropGeometry();
  const horizonMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  horizonMat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec2 vPlain;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvPlain=position.xz;',
    );
    shader.fragmentShader = 'varying vec2 vPlain;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      float bend=clamp((vPlain.x-30.)/110.,0.,1.);
      float river=5.+sin(vPlain.x*.012)*7.+52.*bend*bend*(3.-2.*bend);
      if(abs(vPlain.y-river)<12.1)discard;
    `,
    );
  };
  horizonMat.customProgramCacheKey = () => 'qingming-open-plain-v1';
  const plain = new THREE.Mesh(horizonGeo, horizonMat);
  plain.name = 'qingming-distant-plain';
  plain.userData.noShadow = true;
  group.add(plain);
  registerUpdate(group, (time, night) => {
    if (!Number.isFinite(time) || !Number.isFinite(night)) return;
    clock.value = time;
    birdMat.uniforms.uNight!.value = night;
    for (const { geometry, rest, phase } of cloths) {
      const p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++)
        p.setZ(i, qingmingFlagOffset(rest[i * 3]! / 1.15, -rest[i * 3 + 1]! / 2.15, time, phase));
      p.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  });
  return group;
}
