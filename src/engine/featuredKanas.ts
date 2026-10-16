import * as THREE from 'three';
import {
  addMesh,
  canvasTexture,
  glowTexture,
  mat,
  particleField,
  petalField,
  registerUpdate,
  scatterInstanced,
} from './featuredShared';
import type { Placement } from './featuredShared';
import { clamp, fbm, seededRandom } from './math';

/** Deterministic land profile shared by the mesh and every prop, so nothing floats. */
export const kanasRiverCenter = (x: number): number => -32 + Math.sin(x * 0.038) * 18;
function groundY(x: number, z: number): number {
  const center = kanasRiverCenter(x);
  const width = 10.5 + Math.cos(x * 0.024) * 2.8;
  const edge = Math.abs(z - center) - width;
  const bank = THREE.MathUtils.smoothstep(edge, -1.5, 8);
  const south = clamp((z - 5) / 20),
    north = clamp((-z - 55) / 22);
  const hx = (x + 11) / 16,
    hz = (z + 8) / 14;
  const head = Math.min(1, Math.max(0, 1 - (hx * hx + hz * hz)) * 1.6);
  const land = Math.max(bank, head);
  if (land < 0.015) return -0.8; // sunk below the single global water plane
  const detail = Math.max(-0.8, (fbm(x * 0.05, z * 0.05, 198) - 0.5) * 1.8);
  // The high wooded slope belongs to the far bank. Applying it to both banks
  // raised the foreground above the opening sightline, exposing the underside
  // of a single-sided heightfield and making the trees appear to stand in water.
  const hill = Math.pow(clamp((edge - 6) / 48), 1.35) *
    (8 + fbm(x * 0.018, z * 0.018, 198) * 21) *
    (1 - THREE.MathUtils.smoothstep(z - center, -5, 5));
  const height = (
    -0.8 +
    land * (1.65 + detail * 0.45) +
    Math.max(north * 5.5, head * 1.5, south * 1.7, hill * bank)
  );
  // Submerge the visible finite edges rather than leaving a hanging cutaway.
  // The south bank is a low wooded promontory with open water in front of it.
  const shoreZ = z + Math.sin(x * 0.045) * 3.2 + Math.sin(x * 0.09) * 1.1;
  const shoreline = (1 - THREE.MathUtils.smoothstep(shoreZ, 29, 46)) *
    (1 - THREE.MathUtils.smoothstep(Math.abs(x), 108, 120));
  return -0.8 + (height + 0.8) * shoreline;
}

/** Walk/collision height; terrain.ts's featured ground table consumes this. */
export const kanasGroundY = groundY;

/** Preserve a planted clearing from the boardwalk to the cabin doorway. */
function cabinApproach(x: number, z: number): boolean {
  const t = clamp(((x - 1) * -13 + (z - 11) * -19) / 530);
  return Math.hypot(x - (1 - 13 * t), z - (11 - 19 * t)) < 3.6;
}

/** Golden autumn sward (#c9a04a family), tiled across the meadow mesh. */
function grassTexture(): THREE.CanvasTexture {
  return canvasTexture(
    256,
    256,
    (ctx, rand) => {
      ctx.fillStyle = '#b08c3e';
      ctx.fillRect(0, 0, 256, 256);
      const tones = ['#c9a04a', '#d8b45c', '#a37c33', '#8a6a2c', '#c4973f'];
      for (let i = 0; i < 900; i++) {
        ctx.strokeStyle = tones[Math.floor(rand() * tones.length)]!;
        ctx.globalAlpha = 0.22 + rand() * 0.5;
        const x = rand() * 256,
          y = rand() * 256;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 3, y - 3 - rand() * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    [26, 15],
  );
}

/** White birch bark: pale plaster, grey weathering and black lenticel scars. */
function barkTexture(): THREE.CanvasTexture {
  return canvasTexture(
    128,
    256,
    (ctx, rand) => {
      ctx.fillStyle = '#ece5d6';
      ctx.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 46; i++) {
        ctx.strokeStyle = rand() < 0.5 ? 'rgba(168,159,141,0.28)' : 'rgba(228,221,205,0.5)';
        ctx.lineWidth = 2 + rand() * 5;
        const x = rand() * 128;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(
          x + (rand() - 0.5) * 18,
          90,
          x + (rand() - 0.5) * 18,
          170,
          x + (rand() - 0.5) * 10,
          256,
        );
        ctx.stroke();
      }
      ctx.fillStyle = '#26221d';
      for (let i = 0; i < 65; i++) {
        ctx.globalAlpha = 0.4 + rand() * 0.55;
        ctx.fillRect(rand() * 124, rand() * 252, 2 + rand() * 7, 1 + rand() * 2.6);
      }
      ctx.globalAlpha = 1;
    },
    [2, 2],
  );
}

/** Weathered round-log timber for cabin walls, rails and firewood. */
function logTexture(): THREE.CanvasTexture {
  return canvasTexture(
    128,
    128,
    (ctx, rand) => {
      ctx.fillStyle = '#6e4f30';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = rand() < 0.5 ? 'rgba(84,58,34,0.5)' : 'rgba(133,99,60,0.45)';
        const y = rand() * 128;
        ctx.lineWidth = 1.5 + rand() * 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y + (rand() - 0.5) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(46,30,16,0.55)';
      for (let i = 0; i < 14; i++) ctx.fillRect(rand() * 120, rand() * 120, 1.5, 4 + rand() * 12);
    },
    [1, 3],
  );
}

/** Hand-split roof shingles in staggered courses. */
function shingleTexture(): THREE.CanvasTexture {
  return canvasTexture(
    128,
    128,
    (ctx, rand) => {
      ctx.fillStyle = '#4e3d2c';
      ctx.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) {
        const y = row * 16;
        ctx.fillStyle = 'rgba(38,28,18,0.85)';
        ctx.fillRect(0, y, 128, 2);
        for (let col = 0; col < 6; col++) {
          const x = ((row % 2) * 11 + col * 22) % 128;
          ctx.fillStyle = `rgba(${70 + rand() * 24},${55 + rand() * 18},${36 + rand() * 12},0.8)`;
          ctx.fillRect(x, y + 2, 20, 14);
        }
      }
    },
    [5, 3],
  );
}

/** Soft drifting fog banks: overlapping radial puffs on a transparent field. */
function mistTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 128, (ctx, rand) => {
    for (let i = 0; i < 30; i++) {
      const x = rand() * 256,
        y = 34 + rand() * 62,
        r = 16 + rand() * 36;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(240,246,242,0.17)');
      g.addColorStop(1, 'rgba(240,246,242,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

/** Gently bowed birch trunk, base at the origin; instances spin to vary the bend. */
function birchTrunk(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.09, 0.17, 7.4, 7, 4, true);
  geo.translate(0, 3.7, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++)
    pos.setX(i, pos.getX(i) + Math.sin((pos.getY(i) / 7.4) * Math.PI) * 0.3);
  geo.computeVertexNormals();
  return geo;
}

/** Irregular low-poly foliage blob; hashing by position keeps shared corners welded. */
function leafBlob(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const k =
      0.88 + (Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1) * 0.25;
    pos.setXYZ(i, x * k, y * k * 0.78, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Jagged distant ridge line; the crest fades into snow via vertex colour. */
function ridgeGeometry(
  z: number,
  peak: number,
  seed: number,
  low: string,
  high: string,
): THREE.BufferGeometry {
  const lowC = new THREE.Color(low),
    highC = new THREE.Color(high),
    tint = new THREE.Color();
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= 8; row++)
    for (let i = 0; i <= 56; i++) {
      const x = -110 + (i / 56) * 220;
      const depth = row / 8;
      const h =
        2 + Math.sin(depth * Math.PI) * (8 + fbm(i * 0.15, seed * 0.37 + depth, seed) * peak);
      tint.copy(lowC).lerp(highC, Math.pow(clamp((h - 3.5) / peak), 1.6));
      positions.push(x, h, z - depth * 50);
      colors.push(tint.r, tint.g, tint.b);
      if (i < 56 && row < 8) {
        const n = row * 57 + i;
        indices.push(n, n + 1, n + 57, n + 1, n + 58, n + 57);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Gable triangle in the YZ plane, apex up, scaled per cabin. */
function gableGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, -0.5, 0, 0, 0.5, 0, 1, 0], 3),
  );
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  geo.computeVertexNormals();
  return geo;
}

interface CabinKit {
  logs: Placement[];
  roofs: Placement[];
  gables: Placement[];
  chimneys: Placement[];
  caps: Placement[];
  windows: Placement[];
  frames: Placement[];
  doors: Placement[];
  lamps: Placement[];
  firewood: Placement[];
}

/** True notched-log cabin: eight stacked courses with protruding corner ends. */
function logCabin(kit: CabinKit, cx: number, cz: number, w: number, d: number): void {
  const base = groundY(cx, cz) - 0.05;
  const wallTop = base + 0.24 + 8 * 0.29;
  const rise = 1.75,
    ridgeY = wallTop + rise;
  for (let c = 0; c < 8; c++) {
    const y = base + 0.28 + c * 0.29;
    for (const s of [-1, 1]) {
      kit.logs.push({ position: [cx, y, cz + s * (d / 2 - 0.14)], scale: [w + 1.0, 1, 1] });
      kit.logs.push({
        position: [cx + s * (w / 2 - 0.14), y, cz],
        rotationY: Math.PI / 2,
        scale: [d + 1.0, 1, 1],
      });
    }
  }
  kit.logs.push({ position: [cx, ridgeY + 0.14, cz], scale: [w + 1.8, 1, 1] });
  const run = d / 2 + 0.85,
    angle = Math.atan2(rise, run),
    slope = Math.hypot(run, rise) + 0.15;
  for (const s of [-1, 1]) {
    kit.roofs.push({
      position: [cx, (ridgeY + wallTop - 0.12) / 2, cz + (s * run) / 2],
      tilt: s * angle,
      scale: [w + 1.7, 0.1, slope],
    });
    kit.gables.push({
      position: [cx + s * (w / 2 + 0.04), wallTop - 0.06, cz],
      rotationY: s < 0 ? Math.PI : 0,
      scale: [1, rise, d + 0.9],
    });
  }
  const chimX = cx + w / 2 - 1.1,
    faceZ = cz + d / 2 + 0.17;
  kit.chimneys.push({ position: [chimX, base + 2.1, cz - 0.7], scale: [1, 2.5, 1] });
  kit.caps.push({ position: [chimX, base + 4.66, cz - 0.7] });
  for (const wx of [-1.7, 1.7]) {
    kit.frames.push({ position: [cx + wx, base + 1.55, faceZ - 0.015], scale: [0.84, 0.98, 1] });
    kit.windows.push({ position: [cx + wx, base + 1.55, faceZ], scale: [0.64, 0.78, 1] });
  }
  kit.doors.push({ position: [cx + 0.1, base + 1.0, faceZ - 0.02], scale: [0.95, 1.85, 1] });
  kit.lamps.push({ position: [cx - w / 2 + 0.55, wallTop + 0.42, faceZ + 0.28] });
  for (let l = 0; l < 25; l++) {
    const row = l % 5,
      layer = (l / 5) | 0;
    kit.firewood.push({
      position: [
        cx + w / 2 + 0.55 + (row % 2) * 0.06,
        base + 0.16 + layer * 0.17,
        cz - 1.6 + row * 0.3,
      ],
      rotationY: l * 0.11,
      scale: [0.72 + (l % 3) * 0.12, 1, 1],
    });
  }
}

/** Posts every ~2 m plus two rail runs; `skipSeg` leaves a gate opening. */
function fenceLine(
  posts: Placement[],
  rails: Placement[],
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  skipSeg = -1,
): void {
  const dx = x2 - x1,
    dz = z2 - z1,
    len = Math.hypot(dx, dz);
  const count = Math.max(1, Math.round(len / 2.1)),
    ry = Math.atan2(-dz, dx);
  for (let i = 0; i <= count; i++) {
    const x = x1 + (dx * i) / count,
      z = z1 + (dz * i) / count;
    posts.push({
      position: [x, groundY(x, z) - 0.12, z],
      rotationY: ry,
      scale: [1, 0.9 + (i % 3) * 0.06, 1],
    });
  }
  for (let i = 0; i < count; i++) {
    if (i === skipSeg) continue;
    const mx = x1 + (dx * (i + 0.5)) / count,
      mz = z1 + (dz * (i + 0.5)) / count;
    for (const h of [0.5, 0.86])
      rails.push({
        position: [mx, groundY(mx, mz) + h, mz],
        rotationY: ry,
        scale: [(len / count) * 1.08, 1, 1],
      });
  }
}

export function buildKanas(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Kanas · autumn cabins';
  const random = seededRandom(198);
  const CABINS: ReadonlyArray<readonly [number, number, number, number]> = [
    [-12.2, -5.4, 5.6, 4.6],
    [-10.4, -11.7, 4.8, 4.2],
  ];

  // Glacier-milk lake: Experience's global reflector at y=0.04 owns the water;
  // a second coplanar sheet here would z-fight and flicker every frame.

  // Golden meadow + far-shore landmass, wet-darkened at the waterline.
  const landGeo = new THREE.PlaneGeometry(240, 160, 150, 100);
  landGeo.rotateX(-Math.PI / 2);
  const landPos = landGeo.attributes.position as THREE.BufferAttribute;
  const landColors = new Float32Array(landPos.count * 3);
  for (let i = 0; i < landPos.count; i++) {
    const y = groundY(landPos.getX(i), landPos.getZ(i) - 30);
    landPos.setY(i, y);
    const wet = 0.58 + clamp((y - 0.06) / 2.2) * 0.42;
    landColors.set([wet, wet * 0.97, wet * 0.85], i * 3);
  }
  landGeo.setAttribute('color', new THREE.BufferAttribute(landColors, 3));
  landGeo.computeVertexNormals();
  const land = addMesh(
    group,
    landGeo,
    mat('#ffffff', { map: grassTexture(), vertexColors: true, roughness: 1 }),
    [0, 0, -30],
  );
  land.name = 'kanas-continuous-shore';

  // Solid overlapping foothills, rather than a vertical cardboard skyline.
  const ridgeMat = mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 1 });
  addMesh(group, ridgeGeometry(-83, 28, 31, '#44584c', '#a7b4a8'), ridgeMat);
  addMesh(group, ridgeGeometry(-111, 43, 77, '#6d7f7e', '#e1e8e4'), ridgeMat);

  // Pebble waterlines: along the south shore and around the cabin knoll.
  const pebbleA: Placement[] = [],
    pebbleB: Placement[] = [];
  const pebble = (x: number, z: number): void => {
    const s = 0.5 + random() * 1.1;
    (random() < 0.5 ? pebbleA : pebbleB).push({
      position: [x, Math.max(0.05, groundY(x, z)), z],
      rotationY: random() * 6.283,
      scale: [s, s * 0.4, s * 0.75],
    });
  };
  for (let i = 0; i < 74; i++) {
    const x = -104 + i * 2.9 + (random() - 0.5) * 1.6;
    for (const side of [-1, 1])
      pebble(x, kanasRiverCenter(x) + side * (12 + Math.cos(x * 0.024) * 2.8));
  }
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const x = -11 + Math.cos(t) * 16.4,
      z = -8 + Math.sin(t) * 14.4;
    if (groundY(x, z) < 0.9) pebble(x, z);
  }
  const pebbleGeo = new THREE.SphereGeometry(0.24, 6, 4);
  scatterInstanced(group, pebbleGeo, mat('#9a948a', { roughness: 0.95 }), pebbleA);
  scatterInstanced(group, pebbleGeo, mat('#757066', { roughness: 0.98 }), pebbleB);

  // Birch protagonist: bowed white trunks with golden low-poly crowns.
  const trunkSpots: Placement[] = [];
  const crownSets: Placement[][] = [[], [], []];
  const crownColors = ['#d8a53f', '#c97f2e', '#e0b45c'];
  const addBirch = (x: number, z: number): void => {
    const y = groundY(x, z),
      s = 0.8 + random() * 0.5;
    trunkSpots.push({
      position: [x, y - 0.25, z],
      tilt: (random() - 0.5) * 0.12,
      rotationY: random() * 6.283,
      scale: [s, 0.9 + random() * 0.5, s],
    });
    if (random() < 0.17) return; // leaf-shed bare white trunk
    for (let b = 0, blobs = 2 + (random() < 0.45 ? 1 : 0); b < blobs; b++)
      crownSets[Math.floor(random() * 3)]!.push({
        position: [
          x + (random() - 0.5) * 2.6,
          y + 5.3 + random() * 2.2,
          z + (random() - 0.5) * 2.6,
        ],
        rotationY: random() * 6.283,
        scale: [1.5 + random() * 1.1, 1.15 + random() * 0.7, 1.5 + random() * 1.1],
      });
  };
  for (let i = 0; i < 54; i++) {
    const x = -100 + i * 3.85 + (random() - 0.5) * 2.4,
      z = 13.5 + random() * 12;
    if (Math.abs(x + 36) < 9 && Math.abs(z - 15) < 7) continue; // clearing under the fly-through
    addBirch(x, z);
  }
  for (let i = 0; i < 26; i++) {
    const x = -24 + random() * 26,
      z = -22 + random() * 24;
    const inCabin = CABINS.some(
      ([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + 1.8 && Math.abs(z - cz) < d / 2 + 1.8,
    );
    if (!inCabin && !cabinApproach(x, z) && groundY(x, z) >= 0.45 && !(x > -12.5 && x < -7 && z > -4 && z < 11))
      addBirch(x, z);
  }
  scatterInstanced(
    group,
    birchTrunk(),
    mat('#e8e2d4', { map: barkTexture(), roughness: 0.85 }),
    trunkSpots,
  );
  const blobGeo = leafBlob();
  crownSets.forEach((set, i) =>
    scatterInstanced(group, blobGeo, mat(crownColors[i]!, { roughness: 1 }), set),
  );

  // Dark conifer counterweight on the far slope, plus sparse accents behind the gold.
  const spruceTiers: Placement[][] = [[], [], []],
    larchTiers: Placement[][] = [[], [], []];
  const tierY = [0.9, 2.2, 3.4];
  const addConifer = (x: number, z: number, scale: number): void => {
    const larch = random() < 0.62,
      y = groundY(x, z) - 0.1,
      ry = random() * 6.283;
    (larch ? larchTiers : spruceTiers).forEach((tier, t) =>
      tier.push({ position: [x, y + tierY[t]! * scale, z], rotationY: ry, scale }),
    );
  };
  for (let i = 0; i < 640; i++) {
    const x = -112 + random() * 224,
      z = -106 + random() * 111;
    const inCabin = CABINS.some(
      ([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + 4 && Math.abs(z - cz) < d / 2 + 4,
    );
    if (!inCabin && !cabinApproach(x, z) && groundY(x, z) > 1.1 && !(x > -14 && x < -6 && z > -4))
      addConifer(x, z, 1.2 + random() * 1.5);
  }
  for (let i = 0; i < 22; i++) {
    const x = -90 + random() * 180,
      z = 23 + random() * 5;
    if (groundY(x, z) > 1.4) addConifer(x, z, 1.1 + random() * 0.8);
  }
  const spruceMat = mat('#2f4a3a', { roughness: 1 }),
    larchMat = mat('#b9953d', { roughness: 1 });
  for (let t = 0; t < 3; t++) {
    const tier = new THREE.ConeGeometry(1.05 - t * 0.3, 2.4 - t * 0.3, 12, 4, true);
    const positions = tier.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      const angle = Math.atan2(z, x);
      const serration = 0.83 + 0.17 * Math.cos(angle * 6 + y * 4.8);
      positions.setXYZ(i, x * serration, y + Math.sin(angle * 6) * 0.1, z * serration);
    }
    tier.computeVertexNormals();
    scatterInstanced(group, tier, spruceMat, spruceTiers[t]!);
    scatterInstanced(group, tier, larchMat, larchTiers[t]!);
  }
  // Cabins: notched log walls, shingled gable roof, stone chimney, warm windows.
  const kit: CabinKit = {
    logs: [],
    roofs: [],
    gables: [],
    chimneys: [],
    caps: [],
    windows: [],
    frames: [],
    doors: [],
    lamps: [],
    firewood: [],
  };
  const lamps: THREE.PointLight[] = [];
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTexture(128, ['rgba(255,213,150,0.95)', 'rgba(255,177,92,0.3)']),
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const stoneTex = canvasTexture(
    128,
    128,
    (ctx, rand) => {
      ctx.fillStyle = '#6f6a60';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 46; i++) {
        const g = 118 + rand() * 46;
        ctx.fillStyle = `rgb(${g},${g - 6},${g - 16})`;
        ctx.fillRect(rand() * 126, rand() * 126, 10 + rand() * 20, 7 + rand() * 12);
      }
    },
    [2, 2],
  );
  for (const [cx, cz, w, d] of CABINS) {
    logCabin(kit, cx, cz, w, d);
    const base = groundY(cx, cz) - 0.05;
    addMesh(
      group,
      new THREE.BoxGeometry(w + 0.5, 0.34, d + 0.5),
      mat('#5c564d', { map: stoneTex, roughness: 1 }),
      [cx, base + 0.06, cz],
    );
    const light = new THREE.PointLight('#f5b664', 0.25, 15, 2);
    light.position.set(cx, base + 2.1, cz + d / 2 + 1.5);
    group.add(light);
    lamps.push(light);
    addMesh(group, new THREE.PlaneGeometry(1.5, 1.5), glowMat, [
      cx - w / 2 + 0.55,
      base + 2.8,
      cz + d / 2 + 0.45,
    ]);
  }
  const logMat = mat('#8a6a44', { map: logTexture(), roughness: 0.92 });
  const panelGeo = new THREE.PlaneGeometry(1, 1);
  scatterInstanced(
    group,
    new THREE.CylinderGeometry(0.16, 0.16, 1, 8).rotateZ(Math.PI / 2),
    logMat,
    kit.logs,
  );
  scatterInstanced(
    group,
    new THREE.BoxGeometry(1, 1, 1),
    mat('#4a3a29', { map: shingleTexture(), roughness: 0.9 }),
    kit.roofs,
  );
  scatterInstanced(
    group,
    gableGeometry(),
    mat('#7b5b39', { roughness: 0.92, side: THREE.DoubleSide }),
    kit.gables,
  );
  scatterInstanced(
    group,
    new THREE.CylinderGeometry(0.3, 0.36, 1, 8).translate(0, 0.5, 0),
    mat('#8b857a', { map: stoneTex, roughness: 1 }),
    kit.chimneys,
  );
  scatterInstanced(
    group,
    new THREE.BoxGeometry(0.85, 0.16, 0.85),
    mat('#77716a', { roughness: 1 }),
    kit.caps,
  );
  scatterInstanced(group, panelGeo, mat('#3a2b1c', { roughness: 0.9 }), kit.frames);
  const windowMat = mat('#f7d089', { emissive: '#c97a2a', intensity: 0.3, roughness: 0.5 });
  scatterInstanced(group, panelGeo, windowMat, kit.windows);
  scatterInstanced(
    group,
    panelGeo,
    mat('#4a3626', { map: logTexture(), roughness: 0.95 }),
    kit.doors,
  );
  const lampMat = mat('#ffd9a0', { emissive: '#ffbe66', intensity: 0.4, roughness: 0.6 });
  scatterInstanced(group, new THREE.BoxGeometry(0.16, 0.2, 0.16), lampMat, kit.lamps);
  scatterInstanced(
    group,
    new THREE.CylinderGeometry(0.075, 0.075, 1, 6).rotateZ(Math.PI / 2),
    logMat,
    kit.firewood,
  );
  // Fences: cabin yards with gate gaps plus one long guide line into the meadow.
  const posts: Placement[] = [],
    rails: Placement[] = [];
  fenceLine(posts, rails, -17.7, -9.4, -6.7, -9.4);
  fenceLine(posts, rails, -17.7, -9.4, -17.7, -1.4);
  fenceLine(posts, rails, -6.7, -9.4, -6.7, -1.4);
  fenceLine(posts, rails, -17.7, -1.4, -11.9, -1.4);
  fenceLine(posts, rails, -7.7, -1.4, -6.7, -1.4);
  fenceLine(posts, rails, -14.8, -15.4, -6.0, -15.4);
  fenceLine(posts, rails, -14.8, -15.4, -14.8, -10.0);
  fenceLine(posts, rails, -6.0, -15.4, -6.0, -10.0);
  fenceLine(posts, rails, 32, 22.5, -6.5, 5.5);
  const fenceMat = mat('#7a6042', { map: logTexture(), roughness: 0.9 });
  scatterInstanced(
    group,
    new THREE.BoxGeometry(0.09, 1.05, 0.09).translate(0, 0.5, 0),
    fenceMat,
    posts,
  );
  scatterInstanced(group, new THREE.BoxGeometry(1, 0.07, 0.05), fenceMat, rails);
  // Boardwalk: a spur up to the cabins, then east along the waterline.
  const planks: Placement[] = [];
  for (let z = -2.2; z <= 9.6; z += 0.62)
    planks.push({
      position: [-9.8, groundY(-9.8, z) + 0.18, z],
      rotationY: Math.PI / 2,
      scale: [0.56, 1, 1],
    });
  for (let x = -62; x <= 26; x += 0.72)
    planks.push({ position: [x, groundY(x, 9.8) + 0.18, 9.8], scale: [0.66, 1, 1] });
  scatterInstanced(
    group,
    new THREE.BoxGeometry(1, 0.08, 0.6),
    mat('#5d442a', { roughness: 0.95 }),
    planks,
  );
  // Kitchen smoke above each chimney; uTime drives the rise in-shader.
  const clocks: THREE.ShaderMaterial[] = [];
  for (const [cx, cz, w] of CABINS) {
    const smoke = particleField({
      count: 55,
      area: [2.2, 7.5, 2.2],
      origin: [cx + w / 2 - 1.1, groundY(cx, cz) + 4.9, cz - 0.7],
      color: '#c9c4bb',
      size: 2.4,
      fall: -0.5,
      sway: 0.55,
      opacity: 0.26,
      sizeJitter: 0.6,
    });
    group.add(smoke);
    clocks.push(smoke.material as THREE.ShaderMaterial);
  }
  // Golden leaves drifting down along both forest edges.
  const leafColors = ['#d8a53f', '#c97f2e', '#e0b45c', '#b8641f'];
  for (const field of [
    petalField({
      count: 120,
      area: [100, 7, 11],
      origin: [0, 2.4, 13],
      size: [0.16, 0.22],
      colors: leafColors,
      fall: 0.9,
      sway: 0.85,
      spin: 1.5,
      opacity: 0.9,
    }),
    petalField({
      count: 55,
      area: [32, 6, 24],
      origin: [-12, 2.2, -10],
      size: [0.15, 0.2],
      colors: leafColors,
      fall: 0.9,
      sway: 0.7,
      spin: 1.3,
      opacity: 0.85,
    }),
  ]) {
    group.add(field);
    clocks.push(field.material as THREE.ShaderMaterial);
  }
  // Low lake mist sliding slowly across the bay at four different speeds.
  const drifts: { mesh: THREE.Mesh; speed: number; phase: number }[] = [];
  const mistTex = mistTexture();
  for (const [w, h, y, z, speed, opacity] of [
    [64, 8, 0.7, -4, 1.25, 0.3],
    [84, 9, 0.95, -22, -0.85, 0.26],
    [72, 8, 0.6, -38, 1.6, 0.3],
    [58, 7, 1.15, -52, -1.15, 0.24],
  ] as const) {
    const mesh = addMesh(
      group,
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity, depthWrite: false }),
      [0, y, z],
    );
    mesh.rotation.x = -Math.PI / 2;
    drifts.push({ mesh, speed, phase: random() * 150 });
  }
  // Mist drift, shader clocks, and windows/lamps warming up as night falls.
  const warm: { material: THREE.MeshStandardMaterial; base: number; gain: number }[] = [
    { material: windowMat, base: 0.3, gain: 1.7 },
    { material: lampMat, base: 0.4, gain: 2.1 },
  ];
  registerUpdate(group, (t, night) => {
    for (const d of drifts)
      d.mesh.position.x = ((((d.phase + t * d.speed) % 150) + 150) % 150) - 75;
    for (const clock of clocks) clock.uniforms.uTime!.value = t;
    for (const w of warm) w.material.emissiveIntensity = w.base + night * w.gain;
    for (const lamp of lamps) lamp.intensity = 0.25 + night * 2.2;
    glowMat.opacity = 0.12 + night * 0.5;
  });
  return group;
}
