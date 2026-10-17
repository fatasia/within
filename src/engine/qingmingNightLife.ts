import * as THREE from 'three';
import { registerUpdate } from './featuredShared';

export interface QingmingLightSite {
  position: [number, number, number];
  yaw: number;
  kind: 'lantern' | 'window';
  size?: [number, number];
}
/** Paper lamps, lit rooms and cooking smoke. No per-lamp shadow maps or duplicate water. */
export function buildQingmingNightLife(sites: readonly QingmingLightSite[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'qingming-lamps-and-hearths';
  const lanterns = sites.filter((s) => s.kind === 'lantern');
  const windows = sites.filter((s) => s.kind === 'window');
  const texels = new Uint8Array(64 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 64; x++) {
      const rib = x % 8 === 0 || y === 3 || y === 28,
        grain = ((x * 17 + y * 13) % 7) / 100;
      const tone = (rib ? 0.53 : 0.95) - grain,
        i = (y * 64 + x) * 4;
      texels.set([255 * tone, 238 * tone, 198 * tone, 255], i);
    }
  const paperTexture = new THREE.DataTexture(texels, 64, 32);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.needsUpdate = true;
  const paper = new THREE.MeshStandardMaterial({
    color: '#dcb67b',
    emissive: '#ff9c3e',
    map: paperTexture,
    emissiveMap: paperTexture,
    emissiveIntensity: 0,
    roughness: 0.9,
  });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: '#aa9972',
    emissive: '#ffc16c',
    emissiveIntensity: 0,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#5a3526', roughness: 0.9 });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), paper, lanterns.length);
  const frames = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 8, 1, true),
    frameMaterial,
    lanterns.length * 3,
  );
  const panes = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    windowMaterial,
    windows.length,
  );
  lamps.name = 'qingming-paper-lanterns';
  panes.name = 'qingming-lit-windows';
  const dummy = new THREE.Object3D();
  const set = (
    mesh: THREE.InstancedMesh,
    i: number,
    p: readonly number[],
    scale: readonly number[],
    yaw = 0,
  ) => {
    dummy.position.set(p[0]!, p[1]!, p[2]!);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(scale[0]!, scale[1]!, scale[2]!);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  };
  lanterns.forEach((s, i) => {
    set(lamps, i, s.position, [0.25, 0.37, 0.25]);
    for (let j = 0; j < 2; j++)
      set(
        frames,
        i * 3 + j,
        [s.position[0], s.position[1] + (j ? -0.31 : 0.31), s.position[2]],
        [0.16, 0.065, 0.16],
      );
    set(
      frames,
      i * 3 + 2,
      [s.position[0], s.position[1] + 0.53, s.position[2]],
      [0.017, 0.39, 0.017],
    );
  });
  windows.forEach((s, i) =>
    set(panes, i, s.position, [s.size?.[0] ?? 1, s.size?.[1] ?? 0.8, 1], s.yaw),
  );
  group.add(lamps, frames, panes);
  // Soft lantern spill lies on dry street only, offset above the paving to avoid z-fighting.
  const spillMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uNight: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:
      `varying vec2 vUv;uniform float uNight;uniform float uTime;void main(){float r=length((vUv-.5)*2.);float a=pow(max(0.,1.-r),2.)*uNight*.48*(.97+.03*sin(uTime*3.));gl_FragColor=vec4(1.,.49,.16,a);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(
        ';#include',
        ';\n#include',
      ),
  });
  const pools = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    spillMaterial,
    lanterns.length,
  );
  pools.name = 'qingming-warm-street-spill';
  lanterns.forEach((s, i) => {
    dummy.position.set(s.position[0], 2.94, s.position[2]);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pools.setMatrixAt(i, dummy.matrix);
  });
  group.add(pools);
  // Smoke uses one bounded point batch, with no frame-by-frame buffer uploads.
  const hearths = lanterns.filter((_, i) => i % 7 === 0).slice(0, 12);
  const origins: number[] = [],
    seeds: number[] = [];
  for (const s of hearths)
    for (let j = 0; j < 12; j++) {
      origins.push(s.position[0] - 0.8, s.position[1] - 0.5, s.position[2] - 0.5);
      seeds.push(j / 12);
    }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(origins, 3));
  smokeGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `attribute float aSeed;uniform float uTime;varying float vLife;void main(){float life=fract(aSeed+uTime*.09);vLife=life;vec3 p=position+vec3(life*1.5+sin(life*6.+position.x)*.25,life*4.,sin(life*4.+position.z)*.3);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((.45+life*.9)*600./max(1.,-mv.z),1.,50.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vLife;uniform float uNight;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r),2.)*sin(vLife*3.14159)*.23;gl_FragColor=vec4(mix(vec3(.7,.66,.57),vec3(.54,.51,.46),uNight),a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.name = 'qingming-cooking-smoke';
  smoke.frustumCulled = false;
  group.add(smoke);
  const practicals = [
    [-109.8, 5, -30.7],
    [108.6, 5.5, -50],
  ].map((position) => {
    const light = new THREE.PointLight('#ffc078', 0, 12, 2);
    light.position.set(position[0]!, position[1]!, position[2]!);
    group.add(light);
    return light;
  });
  const update = (time: number, night: number) => {
    if (!Number.isFinite(time) || !Number.isFinite(night)) return;
    const n = THREE.MathUtils.smoothstep(night, 0.1, 0.85);
    paper.emissiveIntensity = n * 2.2;
    practicals.forEach((light) => {
      light.intensity = n * 22;
    });
    windowMaterial.emissiveIntensity = n * 1.8;
    pools.visible = n > 0.01;
    spillMaterial.uniforms.uNight!.value = n;
    spillMaterial.uniforms.uTime!.value = time;
    smokeMat.uniforms.uTime!.value = time;
    smokeMat.uniforms.uNight!.value = n;
  };
  registerUpdate(group, update);
  update(0, 0);
  group.userData.inventory = {
    lanterns: lanterns.length,
    litWindows: windows.length,
    hearths: hearths.length,
    draws: 5,
  };
  return group;
}
