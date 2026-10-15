import * as THREE from 'three';
import type { Painting } from '../types';
import { groundHeight } from './terrain';

export type Waterfall = THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vHeight;
  #include <common>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vUv = uv;
    vHeight = (modelMatrix * vec4(position, 1.0)).y;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uPaperWhite;
  uniform vec3 uNightWhite;
  varying vec2 vUv;
  varying float vHeight;
  #include <common>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    // Positive time in height space moves the subtle foam breaks down, never uphill.
    // Integer circumferential frequencies close the tube seam without a flashing edge.
    float fibres = sin(vUv.y * 6.2831853 * 7.0 + vHeight * 0.24);
    float run = sin(vHeight * 3.2 + uTime * 3.8 + fibres * 0.45);
    float fine = sin(vHeight * 7.6 + uTime * 8.9 + vUv.y * 6.2831853 * 3.0);
    float foam = 0.5 + 0.5 * run;
    vec3 pigment = mix(uPaperWhite, uNightWhite, uNight);
    pigment *= 0.9 + foam * 0.1;
    // Preserve the continuous fine white stroke: movement varies pigment, not its silhouette.
    float alpha = 0.64 + foam * 0.12 + fine * 0.025;
    gl_FragColor = vec4(pigment, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** One fine falling ribbon following the existing cliff, without extra spray or foam meshes. */
export function createWaterfall(painting: Painting): Waterfall {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 70; i++) {
    const t = i / 70;
    const x = 14 + Math.sin(t * 4) * 0.6;
    const z = -41 + t * 21;
    points.push(new THREE.Vector3(x, groundHeight(painting, x, z) + 0.28, z));
  }
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 100, 0.25, 6, false),
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uNight: { value: 0 },
          uPaperWhite: { value: new THREE.Color('#e4e5d6') },
          uNightWhite: { value: new THREE.Color('#788d91') },
        },
      ]),
      transparent: true,
      depthWrite: false,
      fog: true,
    }),
  );
  mesh.name = 'Xishan fine flowing waterfall';
  mesh.userData.motion = 'downward-pigment-flow';
  return mesh;
}

/** Use scene elapsed time so interactive and offline-film frames share the same flow. */
export function updateWaterfall(mesh: Waterfall, time: number, night: number): void {
  mesh.material.uniforms.uTime!.value = Number.isFinite(time) ? Math.max(0, time) : 0;
  mesh.material.uniforms.uNight!.value = Number.isFinite(night)
    ? THREE.MathUtils.clamp(night, 0, 1)
    : 0;
}
