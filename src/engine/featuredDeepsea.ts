import * as THREE from 'three';
import {
  addMesh,
  canvasTexture,
  glowTexture,
  mat,
  particleField,
  registerUpdate,
  ribbonGeometry,
  scatterInstanced,
  type Placement,
} from './featuredShared';
import { fbm, seededRandom } from './math';

/**
 * "Deep sea · blue tears" — a twilight-zone seascape.  No global water surface:
 * the world IS the water column, lit only by the last blue daylight from above
 * and its own bioluminescence.  One registered update drives everything; no
 * per-frame allocations, no module-level state.
 */
/** Dune height shared by the seabed mesh and everything planted on it. */
export function bedHeight(x: number, z: number): number {
  const dune = (fbm(x * 0.05, z * 0.05, 5021) - 0.45) * 5.2;
  const ripple = Math.sin(x * 0.6 + z * 0.22 + fbm(x * 0.1, z * 0.1, 91) * 4) * 0.24;
  return dune + ripple - THREE.MathUtils.smoothstep(-z, 44, 78) * 5.5;
}

/** Merge indexed geometries (position + normal only) into one draw call. */
function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertices = 0, indices = 0;
  for (const g of list) {
    vertices += g.attributes.position.count;
    indices += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const merged = new Uint32Array(indices);
  let vertex = 0, face = 0;
  for (const g of list) {
    positions.set(g.attributes.position.array as Float32Array, vertex * 3);
    normals.set(g.attributes.normal.array as Float32Array, vertex * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) merged[face++] = g.index.getX(i) + vertex;
    else for (let i = 0; i < g.attributes.position.count; i++) merged[face++] = i + vertex;
    vertex += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setIndex(new THREE.BufferAttribute(merged, 1));
  return out;
}

/** One continuous head-to-tail envelope instead of a box intersecting a cone. */
export function whaleBodyGeometry(): THREE.BufferGeometry {
  const profiles = [
    [0.45, 0.12, .01, .01], [.25, .12, 1.18, 1.22], [-.35, .12, 1.62, 1.57],
    [-1.8, .1, 1.72, 1.62], [-3.5, 0, 1.64, 1.55], [-5.2, -.05, 1.42, 1.34],
    [-7, -.1, 1.13, 1.09], [-8.8, -.12, .83, .78], [-10.5, -.09, .47, .46],
    [-12.2, 0, .22, .22], [-13.3, 0, .025, .025],
  ];
  const center = new THREE.CatmullRomCurve3(profiles.map(p => new THREE.Vector3(p[0], p[1], 0)));
  const radius = new THREE.CatmullRomCurve3(profiles.map((p, i) => new THREE.Vector3(i, p[2], p[3])));
  const positions: number[] = [], uv: number[] = [], indices: number[] = [], rings = 72, sides = 32;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, c = center.getPoint(t), r = radius.getPoint(t);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2;
      positions.push(c.x, c.y + Math.cos(a) * Math.max(.01, r.y), Math.sin(a) * Math.max(.01, r.z)); uv.push(t, j / sides);
      if (i < rings && j < sides) { const n = i * (sides + 1) + j; indices.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

/** Sperm-whale silhouette: blunt rounded head, tapering trunk, horizontal flukes. */
function assembleWhale(
  skin: THREE.MeshStandardMaterial,
  trunk: THREE.BufferGeometry, lobe: THREE.BufferGeometry,
): { group: THREE.Group; tail: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'sperm whale';
  addMesh(group, trunk, skin);
  addMesh(group, lobe, skin, [-2.2, -1.46, 0], [2, .18, .57]);
  addMesh(group, lobe, skin, [-8.3, .63, 0], [.8, .36, .42]); // low dorsal hump, joined to back
  for (const side of [-1, 1])
    addMesh(group, lobe, skin, [-3.6, -1.05, side * 1.5], [1.35, 0.09, 0.55]).rotation.set(side * 0.5, 0, side * -0.28);
  const eyeMaterial = mat('#081b24', { roughness: .2 });
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.SphereGeometry(.065, 12, 8), eyeMaterial, [-3.65, -.36, side * 1.50]);
    const mouth = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.05, -.98, side * .72),
      new THREE.Vector3(-1.7, -1.25, side * 1.10),
      new THREE.Vector3(-3.8, -1.10, side * .97),
    ]);
    addMesh(group, new THREE.TubeGeometry(mouth, 14, .018, 4, false), eyeMaterial);
  }
  const tail = new THREE.Group();
  tail.position.set(-12.6, 0, 0);
  for (const side of [-1, 1])
    addMesh(tail, lobe, skin, [-0.8, 0, side * 1.35], [1.5, 0.1, 1.1]).rotation.y = side * -0.42;
  group.add(tail);
  group.rotation.order = 'YXZ'; // heading, then bank
  return { group, tail };
}

/** Two-level branching coral: tube skeleton plus glowing tip pearls. */
function coralCluster(random: () => number): { structure: THREE.BufferGeometry; tips: THREE.BufferGeometry } {
  const parts: THREE.BufferGeometry[] = [];
  const tipPoints: THREE.Vector3[] = [];
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number): void => {
    const to = from.clone().addScaledVector(dir, length);
    const mid = from.clone().addScaledVector(dir, length * 0.55).add(new THREE.Vector3(0, length * 0.22, 0));
    parts.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 5, radius, 5, false));
    if (depth <= 0) { tipPoints.push(to.clone()); return; }
    for (let i = 0; i < (depth === 2 ? 3 : 2); i++) {
      const axis = new THREE.Vector3(random() - 0.5, 0, random() - 0.5).normalize();
      const next = dir.clone().applyAxisAngle(axis, 0.5 + random() * 0.55);
      next.y = Math.abs(next.y) + 0.42;
      grow(to, next.normalize(), length * (0.58 + random() * 0.14), radius * 0.62, depth - 1);
    }
  };
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 1.15, 0.17, 2);
  return {
    structure: mergeGeometries(parts),
    tips: mergeGeometries(tipPoints.map((p) => new THREE.SphereGeometry(0.15, 6, 5).translate(p.x, p.y, p.z))),
  };
}

/** Tube-sponge clump: rounded vertical capsules of varied height. */
function spongeCluster(): THREE.BufferGeometry {
  const random = seededRandom(8801);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const radius = 0.2 + random() * 0.16, length = 0.9 + random() * 1.6;
    parts.push(new THREE.CapsuleGeometry(radius, length, 3, 8)
      .translate((random() - 0.5) * 1.4, length * 0.5 + radius, (random() - 0.5) * 1.4));
  }
  return mergeGeometries(parts);
}

/** Sea fan: a stem with four flat ribbon branches fanning in one plane. */
function seaFan(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.05, 0.09, 1.5, 5).translate(0, 0.75, 0)];
  for (const bend of [-0.85, -0.3, 0.3, 0.85])
    parts.push(ribbonGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(bend * 0.6, 2.1, 0),
      new THREE.Vector3(bend * 1.1, 2.9, 0), new THREE.Vector3(bend * 1.3, 3.5, 0),
    ]), 8, 0.42, (t) => 0.2 + t * 0.8));
  return mergeGeometries(parts);
}

/** Jelly fresnel: rim-lit translucent bell, additive so it reads as glow. */
const JELLY_VERTEX = /* glsl */ `
  uniform float uPower;
  varying float vRim;
  varying float vY;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vRim = pow(1.0 - abs(dot(n, normalize(-view.xyz))), uPower);
    vY = uv.y;
    gl_Position = projectionMatrix * view;
  }
`;
const JELLY_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying float vRim;
  varying float vY;
  void main() {
    float pulse = 0.75 + 0.25 * sin(uTime * 1.4 + vY * 5.0);
    gl_FragColor = vec4(uColor * (0.3 + vRim * 1.5) * pulse, vRim * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
function jellyMaterial(color: string, opacity: number, power: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uPower: { value: power }, uTime: { value: 0 } },
    vertexShader: JELLY_VERTEX, fragmentShader: JELLY_FRAGMENT,
  });
}

/** Hanging tentacle skirt: five tapered ribbons merged into one geometry. */
function tentacleSkirt(width: number): THREE.BufferGeometry {
  const random = seededRandom(4402);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + random() * 0.5;
    const x = Math.cos(angle) * (0.55 + random() * 0.25), z = Math.sin(angle) * (0.55 + random() * 0.25);
    parts.push(ribbonGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, -0.15, z), new THREE.Vector3(x * 1.25, -1.3, z * 1.25),
      new THREE.Vector3(x * 0.9 + 0.3, -2.6, z * 0.9 - 0.25), new THREE.Vector3(x * 1.15 - 0.2, -3.9, z * 1.15),
    ]), 10, width, (t) => 1 - t * 0.75));
  }
  return mergeGeometries(parts);
}

/** Static fish placements on a ring; the group itself is what rotates. */
function fishRing(radius: number, count: number, seed: number): Placement[] {
  const random = seededRandom(seed);
  const placements: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.22, r = radius + (random() - 0.5) * 2.4;
    placements.push({
      position: [Math.cos(angle) * r, (random() - 0.5) * 1.6, Math.sin(angle) * r],
      rotationY: Math.atan2(-Math.cos(angle), -Math.sin(angle)), scale: 0.8 + random() * 0.5, // face the tangent
    });
  }
  return placements;
}

export function buildDeepsea(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Deep sea · blue tears';
  const rand = seededRandom(5021);
  const shaders: THREE.ShaderMaterial[] = [];
  const addField = (field: THREE.Points): THREE.Points => {
    shaders.push(field.material as THREE.ShaderMaterial); group.add(field);
    return field;
  };

  // --- seabed: duned sand with current streaks, dipping into the canyon ---
  const bedTexture = canvasTexture(256, 256, (ctx, random) => {
    ctx.fillStyle = '#31576a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(30,66,88,0.25)' : 'rgba(6,16,26,0.3)';
      const size = 1 + random() * 3;
      ctx.fillRect(random() * 256, random() * 256, size, size);
    }
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 70; i++) {
      const y = random() * 256, x = random() * 256, len = 24 + random() * 90;
      ctx.strokeStyle = random() > 0.5 ? '#2c6478' : '#07141f'; ctx.lineWidth = 1 + random() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.5, y + (random() - 0.5) * 8, x + len, y + (random() - 0.5) * 6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [14, 10]);
  const bedGeometry = new THREE.PlaneGeometry(400, 300, 92, 56);
  bedGeometry.rotateX(-Math.PI / 2);
  const bedPosition = bedGeometry.attributes.position;
  for (let i = 0; i < bedPosition.count; i++)
    bedPosition.setY(i, bedHeight(bedPosition.getX(i), bedPosition.getZ(i) - 30));
  bedGeometry.computeVertexNormals();
  addMesh(group, bedGeometry, mat('#dfe8ec', { roughness: 0.97, map: bedTexture }), [0, 0, -30]);

  // --- canyon wall: stratified sediment blocks stacked along z -84..-50 ---
  const wallTexture = canvasTexture(256, 256, (ctx, random) => {
    let y = 0;
    while (y < 256) {
      const height = 10 + random() * 26, shade = 34 + Math.floor(random() * 22);
      ctx.fillStyle = `rgb(${shade},${shade + 18},${shade + 32})`;
      ctx.fillRect(0, y, 256, height);
      ctx.fillStyle = 'rgba(4,10,18,0.55)';
      ctx.fillRect(0, y + height - 2, 256, 2);
      y += height;
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(50,92,116,0.18)' : 'rgba(3,8,14,0.3)';
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 2);
    }  }, [2, 2]);
  const wallPlacements: Placement[] = [];
  for (let row = 0; row < 3; row++) {
    const count = 7 - row;
    for (let i = 0; i < count; i++) {
      const height = 26 - row * 7 + rand() * 8;
      const depth = 11 + rand() * 3;
      wallPlacements.push({
        position: [(i - (count - 1) / 2) * 34 + (rand() - 0.5) * 6, height / 2 - 4, -91 + depth / 2 + row * 17],
        tilt: (rand() - 0.5) * 0.06, scale: [30 + rand() * 10, height, depth],
      });
    }
  }
  const canyonRock = new THREE.IcosahedronGeometry(.7, 2);
  const rockPosition = canyonRock.attributes.position;
  for (let i = 0; i < rockPosition.count; i++) {
    const x = rockPosition.getX(i), y = rockPosition.getY(i), z = rockPosition.getZ(i);
    const erosion = 1 + Math.sin(x * 23 + y * 9) * .09 + Math.sin(y * 32 + z * 17) * .045;
    rockPosition.setXYZ(i, x * erosion, y * erosion, z * erosion);
  }
  canyonRock.computeVertexNormals();
  scatterInstanced(group, canyonRock, mat('#a3bcc7', { roughness: 1, map: wallTexture }), wallPlacements);
  scatterInstanced(group, new THREE.DodecahedronGeometry(1, 0), mat('#12242f', { roughness: 1 }),
    Array.from({ length: 14 }, () => {
      const x = -100 + rand() * 200, z = -76 + rand() * 62;
      return { position: [x, bedHeight(x, z) + 0.2, z], rotationY: rand() * Math.PI * 2, tilt: (rand() - 0.5) * 0.5, scale: 1.2 + rand() * 2.3 };
    }));
  // --- corals, sponges, sea fans on the canyon foot and wall face ---
  const coral = coralCluster(rand);
  const coralPlacements: Placement[] = [];
  for (let i = 0; i < 13; i++) {
    const x = -100 + rand() * 200, z = -72 + rand() * 62;
    coralPlacements.push({ position: [x, bedHeight(x, z) - 0.15, z], rotationY: rand() * Math.PI * 2, scale: 1.1 + rand() * 1.6 });
  }
  for (let i = 0; i < 9; i++)
    coralPlacements.push({ position: [-95 + rand() * 190, 2.5 + rand() * 11, -46 - rand() * 30], rotationY: rand() * Math.PI * 2, tilt: -(0.35 + rand() * 0.35), scale: 0.9 + rand() * 1.2 });
  const coralStructure = scatterInstanced(group, coral.structure, mat('#ffffff', { roughness: 0.72, emissive: '#0c3a40', intensity: 0.55 }), coralPlacements);
  const coralTips = scatterInstanced(group, coral.tips, new THREE.MeshBasicMaterial({ color: '#ffffff' }), coralPlacements);
  const tint = new THREE.Color();
  for (let i = 0; i < coralPlacements.length; i++) {
    coralStructure.setColorAt(i, tint.setHSL(0.44 + (rand() - 0.5) * 0.1, 0.55, 0.5 + rand() * 0.16));
    coralTips.setColorAt(i, tint.setHSL(0.45 + (rand() - 0.5) * 0.08, 0.8, 0.72));
  }
  coralStructure.instanceColor!.needsUpdate = true;
  coralTips.instanceColor!.needsUpdate = true;
  const spongePlacements: Placement[] = Array.from({ length: 8 }, () => {
    const x = -95 + rand() * 190, z = -62 + rand() * 30;
    return { position: [x, bedHeight(x, z) - 0.1, z], rotationY: rand() * Math.PI * 2, scale: 0.9 + rand() * 1.2 };
  });
  scatterInstanced(group, spongeCluster(), mat('#3d6f7c', { roughness: 0.8, emissive: '#14424a', intensity: 0.35 }), spongePlacements);
  const fanPlacements: Placement[] = [];
  for (let i = 0; i < 5; i++)
    fanPlacements.push({ position: [-90 + rand() * 180, 3 + rand() * 10, -46 - rand() * 28], rotationY: rand() * Math.PI * 2, tilt: -(0.3 + rand() * 0.4), scale: 0.8 + rand() * 0.9 });
  for (let i = 0; i < 3; i++) {
    const x = -80 + rand() * 160, z = -58 + rand() * 24;
    fanPlacements.push({ position: [x, bedHeight(x, z) - 0.1, z], rotationY: rand() * Math.PI * 2, scale: 0.9 + rand() * 0.8 });
  }  scatterInstanced(group, seaFan(), mat('#5d3f6e', { roughness: 0.85, emissive: '#2a1740', intensity: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }), fanPlacements);

  // --- the blue tears: a continuous luminous river with dense plankton bokeh ---
  addField(particleField({ count: 2400, area: [190, 8, 96], origin: [0, 3.6, -32], color: '#4be8d8', size: 1.15, additive: true, opacity: 0.95, twinkle: 1, sway: 0.55 }));
  addField(particleField({ count: 900, area: [180, 7, 90], origin: [0, 3.1, -32], color: '#3aa0ff', size: 0.95, additive: true, opacity: 0.6, twinkle: 1, sway: 0.65 }));
  const bandPoints: readonly (readonly [number, number])[] = [[-88, -10], [-58, -26], [-26, -8], [6, -24], [38, -8], [70, -26]];
  const bandCurve = new THREE.CatmullRomCurve3(
    bandPoints.map(([x, z]) => new THREE.Vector3(x, 3.3, z)),
  );
  const riverMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float across = smoothstep(0.5, 0.08, abs(vUv.x - 0.5));
        float flow = 0.55 + 0.45 * sin(vUv.y * 26.0 - uTime * 0.9 + sin(vUv.x * 6.0) * 2.0);
        vec3 color = mix(vec3(0.29, 0.91, 0.85), vec3(0.23, 0.63, 1.0), vUv.y);
        float ends = smoothstep(0.0, .07, vUv.y) * smoothstep(1.0, .91, vUv.y);
        gl_FragColor = vec4(color * (0.5 + flow * 0.5), across * flow * ends * 0.42);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  shaders.push(riverMaterial);
  const tearRiver = new THREE.Mesh(ribbonGeometry(bandCurve, 72, 7.5), riverMaterial);
  tearRiver.frustumCulled = false;
  group.add(tearRiver);
  const bandShine: THREE.Sprite[] = [];
  for (const [x, z] of bandPoints) {
    const shine = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(128, ['rgba(150,255,240,0.85)', 'rgba(58,160,255,0.28)']),
      transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    shine.scale.setScalar(17);
    shine.position.set(x, 3.6, z);
    group.add(shine);
    bandShine.push(shine);
  }
  bandPoints.forEach(([x, z], i) => {
    const next = bandPoints[Math.min(i + 1, bandPoints.length - 2)]!; // last point reuses the incoming tangent
    const angle = Math.atan2(-(next[1] - z), next[0] - x);
    const core = addField(particleField({ count: 460, area: [34, 2.2, 4.6], origin: [x, 3.5, z], color: '#63ffec', size: 1.35, additive: true, opacity: 1, twinkle: 1, sway: 0.3 }));
    core.rotation.y = angle;
    if (i % 2 === 0) {
      const halo = addField(particleField({ count: 220, area: [44, 4.5, 9], origin: [x, 3.2, z], color: '#3aa0ff', size: 1.05, additive: true, opacity: 0.5, twinkle: 1, sway: 0.45 }));
      halo.rotation.y = angle;
    }
  });

  // --- dreamy bokeh: a few dozen large slow motes catching the light bands ---
  addField(particleField({ count: 46, area: [170, 26, 92], origin: [0, 15, -30], color: '#9ff5ec', size: 3.6, additive: true, opacity: 0.12, twinkle: 0.6, sway: 1.2, sizeJitter: 0.8 }));
  addField(particleField({ count: 30, area: [160, 24, 88], origin: [0, 13, -30], color: '#8a9bff', size: 2.9, additive: true, opacity: 0.1, twinkle: 0.6, sway: 1, sizeJitter: 0.8 }));

  // --- current streaks: thin drifting light lines that animate the water ---
  const streakMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture(64, ['rgba(190,255,248,0.5)', 'rgba(120,220,255,0.12)']),
    transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const streaks: { mesh: THREE.Mesh; speed: number; startX: number }[] = [];
  const streakGeometry = new THREE.PlaneGeometry(16, 0.5);
  for (let i = 0; i < 12; i++) {
    const streak = addMesh(group, streakGeometry, streakMaterial,
      [-90 + rand() * 180, 2 + rand() * 9, -70 + rand() * 76]);
    streak.rotation.y = rand() > 0.5 ? 0.12 : Math.PI / 2 + 0.1;
    streaks.push({ mesh: streak, speed: 1.6 + rand() * 2.4, startX: streak.position.x });
  }

  // --- marine snow and suspended plankton motes ---
  addField(particleField({ count: 800, area: [210, 55, 120], origin: [0, 32, -32], color: '#a9c8dc', size: 0.3, opacity: 0.3, fall: 0.25, sway: 0.6, twinkle: 0.25 }));
  addField(particleField({ count: 500, area: [200, 36, 110], origin: [0, 20, -30], color: '#5fd2cd', size: 0.4, additive: true, opacity: 0.38, twinkle: 0.9, sway: 0.8 }));

  // --- sperm whale and her distant calf, on slow elliptical patrols ---
  const skin = mat('#688496', { roughness: 0.62, emissive: '#1a405c', intensity: 0.45 });
  const trunk = whaleBodyGeometry();
  const buildWhale = (scale: number, rx: number, rz: number, baseY: number, phase: number) => {
    const whale = assembleWhale(skin, trunk, new THREE.SphereGeometry(1, 20, 12));
    whale.group.scale.setScalar(scale); group.add(whale.group);
    return { ...whale, rx, rz, baseY, speed: 0.085, phase };
  };
  const whales = [buildWhale(1.55, 62, 46, 16.5, 0), buildWhale(0.55, 70, 52, 19, 0.85)]; // mother + distant calf

  // --- jellyfish: pulsing fresnel bells with ribbon tentacle skirts ---
  const bellGeometry = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const skirt = tentacleSkirt(0.34);
  const skirtMaterial = mat('#1d4a52', { roughness: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: '#1f7d80', intensity: 0.5 });
  const jellySpecs: readonly (readonly [number, number, number, string, string])[] = [
    [-26, 7, 2, '#57e8d9', '#b7fff4'], [-6, 10, -14, '#57e8d9', '#b7fff4'],
    [18, 6, -34, '#f29bc7', '#ffd9ec'], [44, 9, -10, '#f29bc7', '#ffd9ec'],
    [-46, 8, -24, '#57e8d9', '#b7fff4'],
  ];
  const jellies: { group: THREE.Group; bell: THREE.Group; baseY: number; rise: number; range: number; offset: number; pulseRate: number; phase: number }[] = [];
  for (const [x, baseY, z, color, core] of jellySpecs) {
    const jelly = new THREE.Group();
    jelly.position.set(x, baseY, z); jelly.scale.setScalar(0.9 + rand() * 0.5);
    const bell = new THREE.Group();
    const outer = new THREE.Mesh(bellGeometry, jellyMaterial(color, 0.85, 1.7));
    const inner = new THREE.Mesh(bellGeometry, jellyMaterial(color, 0.45, 3));
    inner.scale.setScalar(0.78);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(64), color: core, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.7);
    bell.add(outer, inner, glow);
    jelly.add(bell, new THREE.Mesh(skirt, skirtMaterial));
    group.add(jelly);
    shaders.push(outer.material as THREE.ShaderMaterial, inner.material as THREE.ShaderMaterial); jellies.push({ group: jelly, bell, baseY, rise: 0.35 + rand() * 0.3, range: 9 + rand() * 3, offset: rand() * 20, pulseRate: 1.1 + rand() * 0.5, phase: rand() * 6.28 });
  }

  // --- two silhouetted bait schools circling slow ring currents ---
  const fishGeometry = new THREE.SphereGeometry(0.32, 7, 5);
  fishGeometry.scale(2.1, 0.5, 0.6);
  const fishMaterial = mat('#527b91', { roughness: 0.6, emissive: '#0a2233', intensity: 0.3 });
  const schoolA = scatterInstanced(group, fishGeometry, fishMaterial, fishRing(9.5, 30, 7001));
  const schoolB = scatterInstanced(group, fishGeometry, fishMaterial, fishRing(7.5, 30, 7002));
  schoolA.position.set(-34, 8.5, 0); schoolB.position.set(42, 11.5, -34);
  const schools = [
    { mesh: schoolA, speed: 0.22, phase: 0, baseY: 8.5 },
    { mesh: schoolB, speed: -0.3, phase: 2, baseY: 11.5 },
  ];

  // --- the last daylight: breathing shafts slanting down from above ---
  const shaftTexture = canvasTexture(64, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.32)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 256);
    // Fade the sides as well as the bottom; a hard-edged quad reads as a stage spotlight.
    ctx.globalCompositeOperation = 'destination-in';
    const edge = ctx.createLinearGradient(0, 0, 64, 0);
    edge.addColorStop(0, 'rgba(255,255,255,0)');
    edge.addColorStop(.35, 'rgba(255,255,255,.75)');
    edge.addColorStop(.55, 'rgba(255,255,255,1)');
    edge.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, 64, 256);
    ctx.globalCompositeOperation = 'source-over';
  });
  const shaftGeometry = new THREE.PlaneGeometry(11, 50);
  const shafts: { material: THREE.MeshBasicMaterial; base: number; phase: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const material = new THREE.MeshBasicMaterial({ map: shaftTexture, color: '#54b4dc', transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const shaft = addMesh(group, shaftGeometry, material, [-62 + i * 26 + (rand() - 0.5) * 8, 22, 10 + rand() * 14]);
    shaft.rotation.set(0.12, (rand() - 0.5) * 0.6, -0.1); shafts.push({ material, base: 0.22 + rand() * 0.12, phase: rand() * 6.28 });
  }

  // --- lights: cool ambient plus two breathing accents (PointLight budget 2/3) ---
  group.add(new THREE.HemisphereLight('#70b8d0', '#294c65', 0.7));
  const tealLight = new THREE.PointLight('#2fd8c8', 2.6, 110, 2); tealLight.position.set(-18, 7, -16); group.add(tealLight);
  const canyonLight = new THREE.PointLight('#2292d8', 2.2, 150, 2); canyonLight.position.set(-46, 12, -68); group.add(canyonLight);

  // Single per-frame update: whale patrol, jelly pulse, schools, shaft breath.
  registerUpdate(group, (t) => {
    for (const shader of shaders) shader.uniforms.uTime.value = t;
    for (const whale of whales) {
      const angle = t * whale.speed + whale.phase;
      whale.group.position.set(Math.cos(angle) * whale.rx, whale.baseY + Math.sin(t * 0.31 + whale.phase) * 2.3, -36 + Math.sin(angle) * whale.rz);
      whale.group.rotation.y = Math.atan2(-Math.cos(angle) * whale.rz, -Math.sin(angle) * whale.rx);
      whale.group.rotation.x = Math.sin(t * 0.21 + whale.phase) * 0.055;
      whale.tail.rotation.z = Math.sin(t * 1.2 + whale.phase) * 0.14;
    }
    for (const jelly of jellies) {
      const pulse = Math.sin(t * jelly.pulseRate + jelly.phase);
      jelly.bell.scale.set(1 + pulse * 0.09, 1 - pulse * 0.07, 1 + pulse * 0.09);
      jelly.group.position.y = jelly.baseY + jelly.range * (.5 + .5 * Math.sin(t * jelly.rise * .15 + jelly.phase));
      jelly.group.rotation.y = t * 0.05 + jelly.phase;
    }
    for (const school of schools) {
      school.mesh.rotation.y = t * school.speed + school.phase;
      school.mesh.position.y = school.baseY + Math.sin(t * 0.4 + school.phase) * 0.5;
    }
    for (const shaft of shafts)
      shaft.material.opacity = shaft.base * (0.62 + 0.38 * Math.sin(t * 0.33 + shaft.phase));
    for (const streak of streaks) {
      streak.mesh.position.x = ((streak.startX + 100 + t * streak.speed) % 200) - 100;
    }
    bandShine.forEach((shine, i) => {
      shine.material.opacity = 0.3 + 0.18 * Math.sin(t * 0.7 + i * 1.9);
      shine.scale.setScalar(16 + Math.sin(t * 0.45 + i) * 2.5);
    });
    tealLight.intensity = 2.2 + Math.sin(t * 0.5) * 0.8;
  });
  return group;
}

