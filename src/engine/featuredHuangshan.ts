import * as THREE from 'three';
import { addMesh, mat, registerUpdate } from './featuredShared';
import { compactLandscape, graniteGeometry, graniteMaterial, pineTree, rod } from './featuredLandscapeKit';
import { seededRandom } from './math';

/** Huangshan composition: granite jointing, windswept pine and a low cloud inversion.
 * Real landforms, compressed distances; not a survey model of the tourist route.
 */
export function buildHuangshan(): THREE.Group {
  const group = new THREE.Group(); group.name = '黄山 · 花岗岩峰林与迎客松';
  group.userData.interpretation = '参照黄山花岗岩峰林、黄山松与云海；峰位和游览距离为压缩实景意象。';
  const rock = graniteMaterial();
  const stone = mat('#99998b'), rail = mat('#777b70'), rand = seededRandom(547);
  const peaks = [
    [-112, -91, 36, 65], [-68, -102, 39, 82], [-20, -104, 42, 91], [33, -100, 40, 98], [86, -86, 37, 77], [123, -67, 31, 61],
    [-67, -39, 24, 52], [-27, -47, 26, 65], [17, -49, 28, 68], [59, -38, 24, 52],
  ];
  for (let i = 0; i < peaks.length; i++) {
    const [x, z, radius, height] = peaks[i]!;
    const mountain = addMesh(group, graniteGeometry(547 + i * 19, radius!, height!), rock, [x!, -25, z!]);
    mountain.name = `jointed-granite-peak-${i}`;
    // Split companion spires reveal the deep vertical granite fissures.
    for (let j = 0; j < 3; j++) addMesh(group, graniteGeometry(731 + i * 17 + j, radius! * (0.28 + rand() * 0.19), height! * (0.5 + rand() * 0.33)), rock, [x! + (rand() - 0.5) * radius! * 1.4, -26, z! + radius! * 0.6 + rand() * 4]);
    for (let j = 0; j < 3; j++) {
      const pine = pineTree(i * 71 + j, 0.25 + rand() * 0.24); pine.position.set(x! + radius! * 0.18 + (j - 1) * radius! * 0.08, height! - 26 - j * 1.6, z!); group.add(pine);
    }
  }
  const terraceStone = graniteMaterial(); terraceStone.vertexColors = false; terraceStone.color.set('#aaa99a'); terraceStone.map!.repeat.set(22, 12); terraceStone.bumpMap = terraceStone.map; terraceStone.bumpScale = 0.08;
  // Broad exposed ledge: top matches the existing 0.6 m walking datum.
  const ledge = addMesh(group, new THREE.BoxGeometry(300, 15, 115), terraceStone, [0, -6.9, 48]); ledge.name = 'walkable-summit-ledge';
  for (let i = 0; i < 28; i++) {
    const boulder = addMesh(group, graniteGeometry(130 + i, 2 + rand() * 5, 1.3 + rand() * 4), rock, [-115 + rand() * 230, 0.6, 15 + rand() * 62]);
    if (Math.abs(boulder.position.x + 28) < 10) boulder.position.x += 18;
  }
  const path = addMesh(group, new THREE.BoxGeometry(130, 0.07, 5), stone, [-4, 0.565, 17]); path.rotation.y = 0.06;
  for (let i = 0; i < 86; i++) {
    const x = -68 + i * 1.5;
    addMesh(group, new THREE.BoxGeometry(0.025, 0.015, 5), rail, [x, 0.608, 17 - (x + 4) * 0.06]);
  }
  // Foreground platform and landing; no raised invisible walk collision.
  addMesh(group, new THREE.CylinderGeometry(11, 12, 0.8, 12), stone, [-20, 0.2, -0.8]);
  const hero = pineTree(1001, 1.16, true); hero.position.set(-20, 0.6, -6); hero.name = '迎客松'; compactLandscape(hero); hero.userData.landscapeDynamic = true; group.add(hero);
  // Long roots clasp the exposed granite, rather than disappearing into lawn.
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    rod(group, new THREE.Vector3(-20, 0.8, -6), new THREE.Vector3(-20 + Math.cos(a) * 2.5, 0.65, -6 + Math.sin(a) * 2), 0.12, mat('#58503d'));
  }
  for (let i = 0; i < 26; i++) {
    const x = -94 + i * 7.4, z = 6 + Math.sin(i * 0.5) * 3;
    const pine = pineTree(91 + i, 0.52 + rand() * 0.46); pine.position.set(x, 0.6, z); if (Math.abs(x + 20) > 12) group.add(pine);
  }
  // Low stone balustrade follows the lookout edge, keeping the hero's silhouette clear.
  const railing = new THREE.Group(); railing.name = '观景石栏'; group.add(railing);
  for (let i = 0; i <= 54; i++) {
    const x = -110 + i * 4;
    if (x > -32 && x < -8) continue;
    addMesh(railing, new THREE.BoxGeometry(0.24, 1.45, 0.28), rail, [x, 1.3, -7]);
    addMesh(railing, new THREE.SphereGeometry(0.22, 8, 5), stone, [x, 2.05, -7]);
    if (i < 54 && !(x > -36 && x < -8)) for (const y of [1.05, 1.75]) rod(railing, new THREE.Vector3(x, y, -7), new THREE.Vector3(x + 4, y, -7), 0.07, rail);
  }
  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uNight;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 p=vUv*vec2(15.,10.)+vec2(uTime*.012,uTime*.004);float n=noise(p)*.52+noise(p*2.1)*.28+noise(p*4.2)*.14+noise(p*8.3)*.06;
      float edge=smoothstep(0.,.13,vUv.x)*smoothstep(1.,.87,vUv.x)*smoothstep(0.,.12,vUv.y)*smoothstep(1.,.85,vUv.y);
      vec3 day=mix(vec3(.65,.73,.73),vec3(.94,.96,.91),n); gl_FragColor=vec4(mix(day,day*.45,uNight),smoothstep(.28,.71,n)*edge*.46);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  for (let i = 0; i < 4; i++) {
    const cloud = addMesh(group, new THREE.PlaneGeometry(365, 260), cloudMaterial, [i * 5, 0.26 - i * 0.12, -75 - i * 8]); cloud.rotation.x = -Math.PI / 2; cloud.rotation.z = i * 0.18; cloud.renderOrder = 2; cloud.name = 'drifting-cloud-inversion';
  }
  compactLandscape(group);
  registerUpdate(group, (time, night) => { cloudMaterial.uniforms.uTime!.value = time; cloudMaterial.uniforms.uNight!.value = night; hero.rotation.z = Math.sin(time * 0.38) * 0.004; });
  return group;
}







