import * as THREE from 'three';
import { seededRandom } from './math';

/**
 * Shared kit for the featured worlds.  Every world stays self contained: the
 * helpers here own no global caches, so Experience's normal disposer can evict
 * a cached world simply by traversing it.
 */

export interface MatOptions {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  intensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  map?: THREE.Texture;
  vertexColors?: boolean;
}
export function mat(color: string, options: MatOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: options.map ?? null,
    roughness: options.roughness ?? 0.88,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.intensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    vertexColors: options.vertexColors ?? false,
  });
}
export function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: THREE.Vector3 | readonly [number, number, number] = [0, 0, 0],
  scale?: readonly [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...(position instanceof THREE.Vector3 ? position.toArray() : position));
  if (scale) mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

/** Paint a small deterministic texture on a canvas; sRGB, repeatable. */
export function canvasTexture(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, rand: () => number) => void,
  repeat?: readonly [number, number],
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!, seededRandom(width * 7919 + height));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
}

/** Soft radial sprite used by lantern halos, glow points and particles. */
export function glowTexture(size = 128, stops?: readonly [string, string]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, stops?.[0] ?? 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, stops?.[1] ?? 'rgba(255,255,255,0.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type FeaturedUpdate = (elapsed: number, night: number) => void;
/** Register a per-frame updater; Experience drives it with scene elapsed/night. */
export function registerUpdate(root: THREE.Object3D, update: FeaturedUpdate): void {
  root.userData.update = update;
}
export function featuredUpdate(root: THREE.Object3D): FeaturedUpdate | null {
  return (root.userData.update as FeaturedUpdate | undefined) ?? null;
}

export interface ParticleOptions {
  count: number;
  /** Bounding box size in metres. */
  area: readonly [number, number, number];
  origin?: readonly [number, number, number];
  color: string;
  size: number;
  map?: THREE.Texture;
  additive?: boolean;
  opacity?: number;
  /** Downward speed in m/s; negative rises. */
  fall?: number;
  /** Horizontal sway amplitude in metres. */
  sway?: number;
  /** Per-particle brightness flicker, 0..1. */
  twinkle?: number;
  sizeJitter?: number;
}
const PARTICLE_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uArea;
  uniform float uFall;
  uniform float uSway;
  uniform float uSize;
  uniform float uJitter;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    vec3 p = position;
    if (uFall != 0.0) {
      float travel = mod(p.y - uTime * uFall - aSeed * uArea.y, uArea.y);
      p.y = travel;
    }
    float phase = uTime * (0.6 + aSeed * 0.9) + aSeed * 43.0;
    p.x += sin(phase) * uSway;
    p.z += cos(phase * 0.83) * uSway * 0.7;
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = uSize * (1.0 + uJitter * (aSeed - 0.5)) * (160.0 / max(1.0, -view.z));
  }
`;
const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTwinkle;
  uniform float uTime;
  uniform sampler2D uMap;
  uniform float uHasMap;
  varying float vSeed;
  void main() {
    float alpha;
    if (uHasMap > 0.5) {
      alpha = texture2D(uMap, gl_PointCoord).a;
    } else {
      alpha = smoothstep(0.5, 0.08, length(gl_PointCoord - 0.5));
    }
    float flicker = 1.0 - uTwinkle * 0.5 * (1.0 + sin(uTime * (1.5 + vSeed * 4.0) + vSeed * 61.0));
    gl_FragColor = vec4(uColor, alpha * uOpacity * flicker);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
/** One-draw-call point cloud with drift, wrap and twinkle — snow, dust, plankton. */
export function particleField(options: ParticleOptions): THREE.Points {
  const random = seededRandom(options.count * 31 + options.size * 977);
  const positions = new Float32Array(options.count * 3);
  const seeds = new Float32Array(options.count);
  for (let i = 0; i < options.count; i++) {
    positions[i * 3] = (random() - 0.5) * options.area[0];
    positions[i * 3 + 1] = random() * options.area[1];
    positions[i * 3 + 2] = (random() - 0.5) * options.area[2];
    seeds[i] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uArea: { value: new THREE.Vector3(...options.area) },
      uFall: { value: options.fall ?? 0 },
      uSway: { value: options.sway ?? 0 },
      uSize: { value: options.size },
      uJitter: { value: options.sizeJitter ?? 0.4 },
      uColor: { value: new THREE.Color(options.color) },
      uOpacity: { value: options.opacity ?? 0.8 },
      uTwinkle: { value: options.twinkle ?? 0 },
      uMap: { value: options.map ?? glowTexture() },
      uHasMap: { value: options.map ? 1 : 0 },
    },
    vertexShader: PARTICLE_VERTEX,
    fragmentShader: PARTICLE_FRAGMENT,
  });
  const field = new THREE.Points(geometry, material);
  field.frustumCulled = false;
  if (options.origin) field.position.set(...options.origin);
  return field;
}

export interface PetalOptions {
  count: number;
  area: readonly [number, number, number];
  origin?: readonly [number, number, number];
  /** Quad size in metres. */
  size: readonly [number, number];
  colors: readonly string[];
  fall: number;
  sway: number;
  /** Radians per second of in-plane spin. */
  spin: number;
  opacity?: number;
}
/**
 * Camera-facing fluttering quads — blossom petals, autumn leaves, heavy snow.
 * One InstancedMesh draw call; motion lives entirely in the vertex shader.
 */
export function petalField(options: PetalOptions): THREE.Mesh {
  const random = seededRandom(options.count * 17 + Math.round(options.size[0] * 53));
  const base = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute('position', base.attributes.position!);
  geometry.setAttribute('uv', base.attributes.uv!);
  const offsets = new Float32Array(options.count * 3);
  const seeds = new Float32Array(options.count);
  const colors = new Float32Array(options.count * 3);
  const palette = options.colors.map((c) => new THREE.Color(c));
  for (let i = 0; i < options.count; i++) {
    offsets[i * 3] = (random() - 0.5) * options.area[0];
    offsets[i * 3 + 1] = random() * options.area[1];
    offsets[i * 3 + 2] = (random() - 0.5) * options.area[2];
    seeds[i] = random();
    const color = palette[Math.floor(random() * palette.length)]!;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  geometry.instanceCount = options.count;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uArea: { value: new THREE.Vector3(...options.area) },
      uSize: { value: new THREE.Vector2(...options.size) },
      uFall: { value: options.fall },
      uSway: { value: options.sway },
      uSpin: { value: options.spin },
      uOpacity: { value: options.opacity ?? 0.9 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute float aSeed;
      attribute vec3 aColor;
      uniform float uTime;
      uniform vec3 uArea;
      uniform vec2 uSize;
      uniform float uFall;
      uniform float uSway;
      uniform float uSpin;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        vUv = uv;
        vColor = aColor;
        float phase = uTime * (0.7 + aSeed) + aSeed * 51.0;
        vec3 p = aOffset;
        p.y = mod(aOffset.y - uTime * uFall * (0.8 + aSeed * 0.5), uArea.y);
        p.x += sin(phase) * uSway;
        p.z += cos(phase * 0.77) * uSway * 0.6;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        float angle = uTime * uSpin * (0.6 + aSeed) + aSeed * 6.28;
        vec2 corner = position.xy * uSize * (0.8 + aSeed * 0.5);
        view.xy += vec2(corner.x * cos(angle) - corner.y * sin(angle), corner.x * sin(angle) + corner.y * cos(angle));
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        // Petal silhouette: a soft teardrop inside the quad.
        vec2 c = vUv - 0.5;
        float shape = smoothstep(0.5, 0.32, length(c * vec2(1.0, 1.35)));
        gl_FragColor = vec4(vColor, shape * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  if (options.origin) mesh.position.set(...options.origin);
  return mesh;
}

export interface Placement {
  position: readonly [number, number, number];
  rotationY?: number;
  tilt?: number;
  scale?: number | readonly [number, number, number];
}
/** Batch one prototype across many placements; one draw call per material. */
export function scatterInstanced(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: readonly Placement[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  placements.forEach((placement, index) => {
    euler.set(placement.tilt ?? 0, placement.rotationY ?? 0, 0);
    quaternion.setFromEuler(euler);
    const scale = placement.scale === undefined ? one : typeof placement.scale === 'number'
      ? new THREE.Vector3(placement.scale, placement.scale, placement.scale)
      : new THREE.Vector3(...placement.scale);
    matrix.compose(new THREE.Vector3(...placement.position), quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

/**
 * A flat ribbon following a curve — apsara trails, aurora curtains, banners.
 * `profile` shapes the width along the ribbon (values 0..1).
 */
export function ribbonGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  width: number,
  profile?: (t: number) => number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const normal = frames.normals[Math.min(i, segments - 1)]!;
    const half = width * (profile ? profile(t) : 1) * 0.5;
    positions.push(
      point.x - normal.x * half, point.y - normal.y * half, point.z - normal.z * half,
      point.x + normal.x * half, point.y + normal.y * half, point.z + normal.z * half,
    );
    uvs.push(0, t, 1, t);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
