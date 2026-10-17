import * as THREE from 'three';
import { buildRoadsterSkyTraffic } from './roadsterSkyTraffic';
import { scatterInstanced, type Placement } from './featuredShared';
import { roadsterTrack } from './roadsterMotion';
import { seededRandom } from './math';
import { buildRoadsterNeonCity } from './roadsterNeonCity';
/** A fictional, rain-soaked proving ground. All reflection accents are local meshes, no SSR. */
export function buildRoadsterCyberStage() {
  const group = new THREE.Group();
  group.name = 'fictional cyber proving ground';
  const rng = seededRandom(20261016);
  const dark = new THREE.MeshStandardMaterial({
    color: '#0a111d',
    roughness: 0.48,
    metalness: 0.35,
  });
  const cyan = new THREE.MeshBasicMaterial({ color: '#43e5ff', toneMapped: false });
  const pink = new THREE.MeshBasicMaterial({ color: '#ef4aa5', toneMapped: false });
  const bases: Placement[] = [],
    cool: Placement[] = [],
    warm: Placement[] = [],
    roofs: Placement[] = [];
  for (let d = -12; d < 190; d += 19) {
    const s = roadsterTrack(d);
    for (const side of [-1, 1]) {
      const x = s.position[0] + Math.cos(s.heading) * side * 8.7,
        z = s.position[2] - Math.sin(s.heading) * side * 8.7;
      bases.push({ position: [x, 3.15, z], scale: [0.23, 4.7, 0.32], rotationY: s.heading });
      (side < 0 ? cool : warm).push({
        position: [x, 3.1, z - 0.18],
        scale: [0.07, 4.3, 0.04],
        rotationY: s.heading,
      });
      if (d > 0)
        roofs.push({
          position: [x + Math.cos(s.heading) * side * 1.3, 5.5, z],
          scale: [2.8, 0.12, 0.3],
          rotationY: s.heading,
        });
    }
  }
  scatterInstanced(group, new THREE.BoxGeometry(), dark, [...bases, ...roofs]);
  scatterInstanced(group, new THREE.BoxGeometry(), cyan, [
    ...cool,
    ...cool.map((p) => ({
      ...p,
      position: [p.position[0], p.position[1], p.position[2] + 0.36] as const,
    })),
  ]);
  scatterInstanced(group, new THREE.BoxGeometry(), pink, [
    ...warm,
    ...warm.map((p) => ({
      ...p,
      position: [p.position[0], p.position[1], p.position[2] + 0.36] as const,
    })),
  ]);
  for (const [items, color] of [
    [cool, '#21c8f3'],
    [warm, '#d32295'],
  ] as const) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { color: { value: new THREE.Color(color) } },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
      fragmentShader:
        'varying vec2 vUv;uniform vec3 color;void main(){float a=exp(-abs(vUv.x-.5)*9.)*pow(1.-vUv.y,1.8);a*=.65+.35*sin(vUv.y*170.);gl_FragColor=vec4(color,a*.38);}',
    });
    const geom = new THREE.PlaneGeometry(3.6, 8.5);
    geom.rotateX(-Math.PI / 2);
    const placement = items.map((p) => ({
      position: [p.position[0], 0.817, p.position[2] + 3] as const,
      rotationY: p.rotationY,
    }));
    scatterInstanced(group, geom, material, placement);
  }
  const skyTraffic = buildRoadsterSkyTraffic();
  group.add(skyTraffic.group);
  const city = buildRoadsterNeonCity(dark);
  group.add(city.group);
  const rainPos: number[] = [];
  for (let i = 0; i < 420; i++) {
    const x = (rng() - 0.5) * 42,
      z = (rng() - 0.5) * 52,
      y = rng() * 22;
    rainPos.push(x, y, z, x + 0.04, y - 0.42, z + 0.06);
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
  const rainMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader:
      'uniform float time;void main(){vec3 p=position;p.y=mod(p.y-time*11.,22.)+.85;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'void main(){gl_FragColor=vec4(.53,.7,.82,.22);}',
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  group.add(rain);
  const key = new THREE.PointLight('#45d9ff', 14, 20, 1.5);
  key.position.set(-4, 4, -2);
  const rim = new THREE.PointLight('#fa439d', 18, 18, 1.5);
  rim.position.set(4, 3, 3);
  group.add(key, rim);
  return {
    group,
    ready: city.ready,
    collides: city.collides,
    update(time: number, position: readonly [number, number, number]) {
      skyTraffic.update(time);
      rainMaterial.uniforms.time!.value = time;
      rain.position.set(position[0], 0, position[2]);
      key.position.set(position[0] - 4, 4, position[2] - 2);
      rim.position.set(position[0] + 4, 3, position[2] + 3);
    },
    setQuality(quality: string) {
      skyTraffic.setQuality(quality);
      rainGeometry.setDrawRange(0, quality === 'low' ? 160 : quality === 'balanced' ? 440 : 840);
      key.visible = quality !== 'low';
      rim.visible = quality !== 'low';
    },
  };
}
