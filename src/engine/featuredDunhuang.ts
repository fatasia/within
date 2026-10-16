import * as THREE from 'three';
import { clamp, fbm } from './math';
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

/** Mineral pigments sampled from Mogao mural palettes. */
const MINERAL = {
  blue: '#2e5f8a',
  green: '#3f7d6a',
  red: '#b4622d',
  gold: '#d9a441',
  ground: '#c9b290',
};
/** Begin a path, optionally fill and/or stroke it — keeps the mural painters flat. */
function shape(
  ctx: CanvasRenderingContext2D,
  fill: string | null,
  stroke: string | null,
  lw: number,
  draw: () => void,
): void {
  if (fill) ctx.fillStyle = fill;
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
  }
  ctx.beginPath();
  draw();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
/** Soft irregular pigment stains layered over a mural base. */
function blotch(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  count: number,
  colors: readonly string[],
  rMax: number,
  alpha: number,
): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.35 + rand() * 0.65);
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)] as string;
    ctx.beginPath();
    ctx.ellipse(
      rand() * w,
      rand() * h,
      4 + rand() * rMax,
      3 + rand() * rMax * 0.7,
      rand() * 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
/** Punch flaking losses out of the paint layer so murals read as aged plaster. */
function chipOff(ctx: CanvasRenderingContext2D, rand: () => number, count: number): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.2 + rand() * 0.5;
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, 1 + rand() * 6, 1 + rand() * 4, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
/** Stroke-drawn flying-apsara silhouette: streaming gold ribbons, arced torso, halo. */
function drawApsara(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  dir: number,
  tint: string,
): void {
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    shape(ctx, null, MINERAL.gold, s * (0.12 - k * 0.04), () => {
      ctx.moveTo(x, y - s * 0.18 + k * s * 0.2);
      ctx.bezierCurveTo(
        x - dir * s * 0.9,
        y - s * 0.55 + k * s * 0.3,
        x - dir * s * 1.7,
        y + s * 0.32 + k * s * 0.2,
        x - dir * s * 2.4,
        y - s * 0.1 + k * s * 0.3,
      );
    });
  }
  shape(ctx, null, tint, s * 0.2, () => {
    ctx.moveTo(x - dir * s * 0.22, y + s * 0.58);
    ctx.quadraticCurveTo(x + dir * s * 0.08, y + s * 0.02, x + dir * s * 0.3, y - s * 0.3);
  });
  shape(ctx, null, tint, s * 0.09, () => {
    ctx.moveTo(x + dir * s * 0.16, y - s * 0.08);
    ctx.quadraticCurveTo(x + dir * s * 0.72, y - s * 0.5, x + dir * s * 1.1, y - s * 0.12);
  });
  shape(ctx, tint, null, 0, () =>
    ctx.arc(x + dir * s * 0.32, y - s * 0.52, s * 0.11, 0, Math.PI * 2),
  );
  shape(ctx, null, MINERAL.gold, s * 0.045, () =>
    ctx.arc(x + dir * s * 0.32, y - s * 0.52, s * 0.19, 0, Math.PI * 2),
  );
}
/** One thumbnail of the thousand-buddha grid: tinted cell, gold halo, seated robe. */
function buddhaCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  rand: () => number,
): void {
  const bgs = ['#4c7a6d', '#b4622d', '#566d8f', '#a05a2c'];
  ctx.fillStyle = bgs[Math.floor(rand() * bgs.length)] as string;
  ctx.fillRect(x, y, s, s);
  shape(ctx, null, 'rgba(217,164,65,0.9)', 1.4, () =>
    ctx.arc(x + s * 0.5, y + s * 0.36, s * 0.19, 0, Math.PI * 2),
  );
  shape(ctx, '#ecd9b0', null, 0, () =>
    ctx.arc(x + s * 0.5, y + s * 0.34, s * 0.07, 0, Math.PI * 2),
  );
  shape(ctx, rand() > 0.5 ? MINERAL.red : '#d8b46a', null, 0, () => {
    ctx.moveTo(x + s * 0.5, y + s * 0.42);
    ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.7, x + s * 0.24, y + s * 0.94);
    ctx.lineTo(x + s * 0.76, y + s * 0.94);
    ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.7, x + s * 0.5, y + s * 0.42);
  });
}
function paintSand(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.fillStyle = '#c8a06b';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 95; i++) {
    // paired dark/light wind-ripple strokes
    const y0 = rand() * h,
      amp = 3 + rand() * 9,
      period = 26 + rand() * 60,
      phase = rand() * 7;
    for (const [color, lw, off] of [
      ['rgba(92,62,38,0.16)', 2.6, -1.4],
      ['rgba(240,215,172,0.15)', 1.6, 1.6],
    ] as const) {
      shape(ctx, null, color, lw, () => {
        for (let x = 0; x <= w; x += 14) {
          const y = y0 + Math.sin(x / period + phase) * amp + off;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      });
    }
  }
  blotch(ctx, rand, 240, ['rgba(70,48,28,0.05)', 'rgba(232,206,160,0.05)'], 5, 1);
}
function paintCliff(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.fillStyle = '#8a6248';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 12; i++) {
    // sedimentary strata bands
    ctx.fillStyle = ['rgba(122,84,60,0.5)', 'rgba(150,108,76,0.45)', 'rgba(104,72,52,0.5)'][
      i % 3
    ] as string;
    ctx.fillRect(0, i * (h / 12) + rand() * 4, w, h / 12 - 2);
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(58,38,26,0.13)';
    ctx.fillRect(rand() * w, rand() * h * 0.8, 2 + rand() * 4, 20 + rand() * 80);
  } // erosion streaks
  blotch(ctx, rand, 120, ['rgba(60,40,28,0.1)', 'rgba(178,138,100,0.12)'], 8, 1);
}
function paintPavilionWall(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.fillStyle = '#6e4128';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = 'rgba(40,22,12,0.5)';
    ctx.fillRect(i * (w / 9), 0, 2, h);
  } // plank joints
  ctx.fillStyle = '#8c3226';
  ctx.fillRect(0, 0, 26, h);
  ctx.fillRect(w - 26, 0, 26, h); // vermilion columns
  ctx.fillStyle = '#20100b';
  ctx.fillRect(52, 46, w - 104, h - 92); // lattice window
  ctx.strokeStyle = 'rgba(198,150,86,0.9)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i <= 4; i++) {
    const x = 52 + ((w - 104) * i) / 4,
      y = 46 + ((h - 92) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, 46);
    ctx.lineTo(x, h - 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(52, y);
    ctx.lineTo(w - 52, y);
    ctx.stroke();
  }
  blotch(ctx, rand, 40, ['rgba(30,16,8,0.2)'], 6, 1);
}
/** Unrolled barrel-vault mural: story register, thousand-buddha grid, apsara crown. */
function paintVaultMural(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.fillStyle = MINERAL.ground;
  ctx.fillRect(0, 0, w, h);
  blotch(ctx, rand, 70, ['#b39a78', '#e2d2b2', '#9a8262'], 70, 0.16);
  for (const x0 of [0, 0.8]) {
    // narrative registers near both springings
    ctx.fillStyle = '#b98d5e';
    ctx.fillRect(x0 * w, 0, w * 0.2, h);
    for (let row = 0; row < 5; row++) {
      const y = row * (h / 5);
      shape(ctx, null, '#5c3a22', 3, () =>
        ctx.strokeRect(x0 * w + 10, y + 8, w * 0.2 - 20, h / 5 - 16),
      );
      shape(ctx, null, 'rgba(63,125,106,0.85)', 5, () =>
        ctx.arc(x0 * w + w * 0.1, y + h / 5 - 20, h / 9, Math.PI, Math.PI * 2),
      );
      for (let f = 0; f < 3; f++)
        shape(ctx, MINERAL.red, null, 0, () =>
          ctx.arc(
            x0 * w + 26 + f * 24 + rand() * 10,
            y + h / 10 + rand() * 14,
            4.5,
            0,
            Math.PI * 2,
          ),
        );
      shape(ctx, null, 'rgba(217,164,65,0.85)', 2, () => {
        ctx.moveTo(x0 * w + 6, y);
        ctx.lineTo(x0 * w + w * 0.2 - 6, y);
      });
    }
  }
  for (const x0 of [0.2, 0.62]) {
    // thousand-buddha grids on the mid walls
    ctx.fillStyle = MINERAL.blue;
    ctx.fillRect(x0 * w, 0, w * 0.18, h);
    for (let x = x0 * w + 4; x < (x0 + 0.18) * w - 20; x += 24)
      for (let y = 4; y < h - 20; y += 24) buddhaCell(ctx, x, y, 22, rand);
  }
  ctx.fillStyle = '#7c4526';
  ctx.fillRect(w * 0.38, 0, w * 0.24, h); // apsara crown around the apex
  for (let i = 0; i < 5; i++) {
    drawApsara(
      ctx,
      w * 0.5 + (rand() - 0.5) * 50,
      (h * (i + 0.5)) / 5,
      40,
      i % 2 ? 1 : -1,
      '#ecd9b0',
    );
    shape(ctx, null, 'rgba(63,125,106,0.6)', 3, () =>
      ctx.arc(
        w * (0.42 + rand() * 0.16),
        (h * (i + 0.5)) / 5 + 22,
        9 + rand() * 8,
        0,
        Math.PI * 1.4,
      ),
    );
  }
  for (const x of [0.2, 0.38, 0.62, 0.8])
    shape(ctx, null, MINERAL.gold, 4, () => {
      ctx.moveTo(x * w, 0);
      ctx.lineTo(x * w, h);
    });
  const stain = ctx.createLinearGradient(0, h * 0.68, 0, h);
  stain.addColorStop(0, 'rgba(70,48,30,0)');
  stain.addColorStop(1, 'rgba(70,48,30,0.4)');
  ctx.fillStyle = stain;
  ctx.fillRect(0, 0, w, h);
  chipOff(ctx, rand, 240);
}
/** West-wall preaching scene: canopy, haloed Buddha, attendants, lotus dais. */
function paintEndWall(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.fillStyle = MINERAL.ground;
  ctx.fillRect(0, 0, w, h);
  blotch(ctx, rand, 46, ['#b39a78', '#e2d2b2', '#9a8262'], 50, 0.15);
  ctx.fillStyle = 'rgba(46,95,138,0.9)';
  ctx.fillRect(52, 36, w - 104, 46); // canopy band
  for (let x = 52; x < w - 52; x += 34)
    shape(ctx, null, MINERAL.gold, 3, () => ctx.arc(x + 17, 82, 17, 0, Math.PI));
  shape(ctx, null, MINERAL.gold, 5, () => ctx.arc(w / 2, 226, 86, 0, Math.PI * 2)); // double halo
  shape(ctx, null, MINERAL.green, 3, () => ctx.arc(w / 2, 226, 62, 0, Math.PI * 2));
  shape(ctx, '#ecd9b0', null, 0, () => ctx.arc(w / 2, 176, 21, 0, Math.PI * 2)); // head and ushnisha
  shape(ctx, '#ecd9b0', null, 0, () => ctx.arc(w / 2, 152, 8, 0, Math.PI * 2));
  shape(ctx, MINERAL.red, null, 0, () => {
    // seated robe
    ctx.moveTo(w / 2, 198);
    ctx.quadraticCurveTo(w / 2 - 78, 260, w / 2 - 88, 366);
    ctx.lineTo(w / 2 + 88, 366);
    ctx.quadraticCurveTo(w / 2 + 78, 260, w / 2, 198);
  });
  shape(ctx, MINERAL.green, null, 0, () => ctx.ellipse(w / 2, 378, 112, 24, 0, 0, Math.PI * 2)); // lotus dais
  for (let x = -90; x <= 90; x += 30)
    shape(ctx, null, MINERAL.gold, 2.4, () => ctx.arc(w / 2 + x, 372, 15, Math.PI, Math.PI * 2));
  for (const [fx, robe] of [
    [118, MINERAL.blue],
    [394, '#a05a2c'],
  ] as const) {
    // flanking attendants
    shape(ctx, robe as string, null, 0, () => {
      ctx.moveTo(fx, 200);
      ctx.quadraticCurveTo(fx - 26, 280, fx - 22, 368);
      ctx.lineTo(fx + 22, 368);
      ctx.quadraticCurveTo(fx + 26, 280, fx, 200);
    });
    shape(ctx, '#ecd9b0', null, 0, () => ctx.arc(fx, 186, 11, 0, Math.PI * 2));
  }
  shape(ctx, null, MINERAL.gold, 4, () => ctx.strokeRect(16, 16, w - 32, h - 32));
  shape(ctx, null, MINERAL.red, 2, () => ctx.strokeRect(28, 28, w - 56, h - 56));
  chipOff(ctx, rand, 170);
}
/** Square stepped caisson (斗四): nested squares, lotus heart, hanging valances. */
function paintCaisson(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const w = ctx.canvas.width,
    c = w / 2;
  ctx.fillStyle = '#33201a';
  ctx.fillRect(0, 0, w, w);
  const fills = [
    'rgba(46,95,138,0.8)',
    'rgba(63,125,106,0.75)',
    'rgba(180,98,45,0.7)',
    'rgba(120,72,40,0.75)',
  ];
  for (let i = 0; i < 4; i++) {
    // nested squares of the 斗四 caisson
    const inset = 26 + i * 52;
    ctx.fillStyle = fills[i] as string;
    ctx.fillRect(inset, inset, w - inset * 2, w - inset * 2);
    shape(ctx, null, MINERAL.gold, 4, () =>
      ctx.strokeRect(inset, inset, w - inset * 2, w - inset * 2),
    );
  }
  for (let p = 0; p < 8; p++) {
    // eight-petal lotus heart
    const a = (p / 8) * Math.PI * 2;
    shape(ctx, MINERAL.red, MINERAL.gold, 2, () =>
      ctx.ellipse(c + Math.cos(a) * 52, c + Math.sin(a) * 52, 26, 15, a, 0, Math.PI * 2),
    );
  }
  shape(ctx, MINERAL.gold, null, 0, () => ctx.arc(c, c, 18, 0, Math.PI * 2));
  const valance = [MINERAL.blue, MINERAL.green, MINERAL.red];
  for (let e = 0; e < 4; e++) {
    // valances draped inward along the four edges
    for (let i = 0; i < 6; i++) {
      const t = -c + 46 + i * 38;
      ctx.fillStyle = valance[(i + e) % 3] as string;
      ctx.beginPath();
      if (e < 2) {
        const py = e === 0 ? 190 : w - 190;
        ctx.moveTo(c + t, py);
        ctx.lineTo(c + t + 34, py);
        ctx.lineTo(c + t + 17, py + (e === 0 ? 30 : -30));
      } else {
        const px = e === 2 ? 190 : w - 190;
        ctx.moveTo(px, c + t);
        ctx.lineTo(px, c + t + 34);
        ctx.lineTo(px + (e === 2 ? 30 : -30), c + t + 17);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  chipOff(ctx, rand, 120);
}
function paintMoon(ctx: CanvasRenderingContext2D): void {
  const c = ctx.canvas.width / 2,
    halo = ctx.createRadialGradient(c, c, 12, c, c, c);
  halo.addColorStop(0, 'rgba(250,240,220,0.85)');
  halo.addColorStop(0.45, 'rgba(250,240,220,0.22)');
  halo.addColorStop(1, 'rgba(250,240,220,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, c * 2, c * 2);
  shape(ctx, '#f7ecd2', null, 0, () => ctx.arc(c, c, 30, 0, Math.PI * 2));
  for (const [dx, dy, r] of [
    [-9, -5, 8],
    [8, 6, 6],
    [2, -12, 5],
    [-4, 10, 4],
  ] as const)
    shape(ctx, 'rgba(178,168,148,0.4)', null, 0, () => ctx.arc(c + dx, c + dy, r, 0, Math.PI * 2));
}
/** Shared additive shader for the god-ray and the apsara ribbons. */
function glowShaderMaterial(a: string, b: string, alpha: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 1 },
      uAlpha: { value: alpha },
      uColorA: { value: new THREE.Color(a) },
      uColorB: { value: new THREE.Color(b) },
    },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform float uTime; uniform float uStrength; uniform float uAlpha; uniform vec3 uColorA; uniform vec3 uColorB; varying vec2 vUv;',
      'void main() {',
      '  float sheen = 0.78 + 0.22 * sin(vUv.y * 24.0 - uTime * 2.3);',
      '  float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);',
      '  vec3 col = mix(uColorA, uColorB, vUv.x) * sheen * 1.3 * uStrength; gl_FragColor = vec4(col, fade * uAlpha);',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}',
    ].join('\n'),
  });
}

// Dune field: wind-aligned ridges plus swell, flattened across the walkway
// corridor, softened over the cliff apron.  Module scope so terrain.ts can
// share the exact same surface for walking collision.
const smooth = THREE.MathUtils.smoothstep;
export function duneHeight(x: number, z: number): number {
  const warp = fbm(x * 0.012, z * 0.012, 7) * 3.1;
  const ridge = Math.pow(1 - Math.abs(Math.sin(x * 0.052 + warp * 0.9 + z * 0.012)), 2.6);
  const swell = (fbm(x * 0.021, z * 0.021, 23) - 0.5) * 3.4,
    micro = (fbm(x * 0.32, z * 0.32, 41) - 0.5) * 0.5;
  const flat = Math.max(1 - smooth(-z, 12, 26), 1 - smooth(Math.abs(x - 15), 13, 29));
  const amp = (1 - flat) * smooth(-z, 12, 30) * (0.38 + 0.62 * smooth(-z, 34, 54));
  const h = micro * (0.35 + 0.65 * amp) + swell * (0.18 + 0.82 * amp) + ridge * 4.4 * amp;
  return h * (1 - flat) + clamp(h, 0.05, 0.4) * flat;
}

/** Eroded conglomerate cliff with a level terrace and irregular weathered crown. */
function cliffGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, Math.ceil(width / 3), 12, 4);
  const p = geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const above = (y + height / 2) / height;
    const erosion = fbm(x * 0.22, y * 0.12, 96) - 0.5;
    p.setXYZ(
      i,
      x,
      y + Math.pow(above, 8) * (Math.sin(x * 0.23) * 0.9 + erosion * 1.8),
      z +
        (z > 0 ? 1 : 0.25) *
          (erosion * 1.25 + Math.sin(y * 1.5) * 0.13) *
          Math.sin((x / width + 0.5) * Math.PI),
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Nine-story facade eaves lean back into the cliff, not freestanding pagoda pyramids. */
function caveEaveGeometry(): THREE.BufferGeometry {
  const p: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= 5; row++)
    for (let col = 0; col <= 16; col++) {
      const x = (col / 16) * 2 - 1,
        t = row / 5;
      p.push(x, (1 - t) * 0.9 + 0.3 * t ** 4 + 0.48 * Math.abs(x) ** 7, t * 2 - 1);
      if (row < 5 && col < 16) {
        const n = row * 17 + col;
        indices.push(n, n + 17, n + 1, n + 1, n + 17, n + 18);
      }
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Dunhuang Mogao caves: sand sea, nine-story pavilion, mural cave with
 *  caisson, god-ray, apsara ribbons, lanterns and a moonlit camel caravan. */
export function buildDunhuang(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Dunhuang Mogao caves · murals';
  // Sand sea: displaced plane, ripple texture, moonlit crests, warm halo from the cave lanterns on nearby dunes.
  const groundGeo = new THREE.PlaneGeometry(320, 260, 120, 96);
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0.02, -30);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tint = new THREE.Color(),
    white = new THREE.Color('#ffffff');
  const crestCool = new THREE.Color('#d8e2f2'),
    warmZone = new THREE.Color('#e8b072');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      h = duneHeight(x, z);
    pos.setY(i, h);
    tint
      .copy(white)
      .lerp(crestCool, clamp((h - 0.8) / 3.4) * 0.55)
      .lerp(warmZone, (1 - smooth(Math.hypot(x - 2, z + 42), 12, 34)) * 0.6);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  groundGeo.attributes.position.needsUpdate = true;
  groundGeo.computeVertexNormals();
  const sandTex = canvasTexture(512, 512, paintSand, [9, 7]);
  addMesh(group, groundGeo, mat('#ffffff', { map: sandTex, roughness: 1, vertexColors: true }));
  // Sandstone cliff: blocks leave a void for the cave hall and entrance tunnel.
  const cliffMat = mat('#d0b38b', {
    map: canvasTexture(256, 256, paintCliff, [3, 1.4]),
    roughness: 1,
  });
  for (const [width, x, height] of [
    [78.5, -32.75, 35],
    [46.5, 48.75, 32.5],
  ] as const)
    addMesh(group, cliffGeometry(width, height, 26), cliffMat, [x, height / 2, -53]);
  // The cave vault must remain empty below 10m; the old central box filled it.
  addMesh(group, cliffGeometry(19, 24, 26), cliffMat, [16, 22, -53]);
  const talus: Placement[] = [-60, -46, -32, -18, -4, 30, 44, 60].map((x) => ({
    position: [x, 1.1, -38.6] as const,
    scale: [11, 3.6, 8] as const,
    rotationY: x,
  }));
  scatterInstanced(
    group,
    new THREE.ConeGeometry(1, 1, 7),
    mat('#a97f52', { map: sandTex, roughness: 1 }),
    talus,
  );
  // Two fog-separated layers of far dune-ridge silhouettes.
  const ridgeLayer = (z: number, color: string, count: number, seed: number): void => {
    const placements: Placement[] = [];
    for (let i = 0; i < count; i++) {
      const r = ((i * 37 + seed) % 10) / 10;
      placements.push({
        position: [-100 + (200 * i) / (count - 1) + r * 14, 5.2 + r * 2, z],
        scale: [52 + r * 22, 9 + r * 6, 18],
        rotationY: r * 3,
      });
    }
    scatterInstanced(
      group,
      new THREE.ConeGeometry(1, 1, 7),
      mat(color, { roughness: 1 }),
      placements,
    );
  };
  ridgeLayer(-83, '#7c5844', 8, 3);
  ridgeLayer(-89, '#6a5148', 7, 71);
  // Nine-story pavilion: shrinking tiers, flared eaves with upturned hook beams, lantern string, gilded finial.
  const woodMat = mat('#a65030', { roughness: 0.85 });
  const roofMat = mat('#5e655b', { roughness: 0.92, side: THREE.DoubleSide });
  const walls: Placement[] = [],
    roofs: Placement[] = [],
    columns: Placement[] = [],
    rails: Placement[] = [],
    windows: Placement[] = [],
    stringLamps: Placement[] = [];
  const tiers = [
    [19, 0, 6.7],
    [18.2, 7, 6.1],
    [17.4, 13.5, 5.4],
    [16.3, 19.3, 4.6],
    [14.9, 24.3, 4],
    [13.5, 28.7, 3.4],
    [11.9, 32.5, 2.8],
    [10, 35.7, 2.4],
    [7.6, 38.5, 2.1],
  ] as const;
  for (const [w, y, h] of tiers) {
    walls.push({ position: [-14, y + h / 2, -38.5], scale: [w - 0.7, h, 1.1] });
    roofs.push({ position: [-14, y + h - 0.12, -35.8], scale: [w / 2 + 1.2, 1, 4.4] });
    const bays = w > 14 ? 6 : 4;
    for (let bay = 0; bay <= bays; bay++) {
      const x = -14 - w / 2 + 0.35 + (bay * (w - 0.7)) / bays;
      columns.push({ position: [x, y + h / 2, -33.3], scale: [0.16, h, 0.2] });
      if (bay < bays)
        windows.push({
          position: [x + (w - 0.7) / bays / 2, y + h * 0.54, -37.9],
          scale: [((w - 0.7) / bays) * 0.63, h * 0.55, 1],
        });
    }
    for (const elevation of [h - 0.32, h - 0.65, 0.58])
      rails.push({ position: [-14, y + elevation, -33.24], scale: [w - 0.35, 0.13, 0.16] });
    for (let picket = 0; picket < Math.floor(w / 0.4); picket++)
      rails.push({
        position: [-14 - w / 2 + 0.4 + picket * 0.4, y + 0.34, -33.22],
        scale: [0.055, 0.55, 0.08],
      });
    if (y < 20) stringLamps.push({ position: [-14, y + h - 1, -33.05], scale: [0.75, 1, 0.75] });
  }
  scatterInstanced(
    group,
    new THREE.BoxGeometry(1, 1, 1),
    mat('#cbb18c', { roughness: 1 }),
    walls,
  ).name = 'mogao-nine-storey-infill';
  scatterInstanced(group, caveEaveGeometry(), roofMat, roofs).name = 'mogao-nine-cliff-eaves';
  scatterInstanced(group, new THREE.BoxGeometry(1, 1, 1), woodMat, [...columns, ...rails]).name =
    'mogao-red-column-galleries';
  scatterInstanced(
    group,
    new THREE.PlaneGeometry(1, 1),
    mat('#ffffff', { map: canvasTexture(256, 256, paintPavilionWall), roughness: 0.9 }),
    windows,
  );
  const stringMat = mat('#9f3929', { emissive: '#ff9d4e', intensity: 0.65, roughness: 0.8 });
  scatterInstanced(group, new THREE.SphereGeometry(0.26, 8, 6), stringMat, stringLamps);
  addMesh(
    group,
    new THREE.PlaneGeometry(3.4, 4.6),
    mat('#201713', { roughness: 1 }),
    [-14, 2.3, -33.2],
  );
  const goldMat = mat('#b89b63', { roughness: 0.65, metalness: 0.15 });
  addMesh(group, new THREE.CylinderGeometry(0.045, 0.09, 1.65, 6), goldMat, [-14, 42, -36.8]);
  addMesh(group, new THREE.SphereGeometry(0.19, 8, 6), goldMat, [-14, 42.9, -36.8]);
  // The surrounding grotto facade has staggered niches and narrow access galleries.
  const mouths: Placement[] = [],
    frames: Placement[] = [],
    galleries: Placement[] = [];
  for (const [row, y] of [2.2, 9.5, 17, 24.5].entries())
    for (let col = 0; col < 16; col++) {
      const x = -67 + col * 8.6 + (row % 2) * 2.4;
      if ((x > -25 && x < -2) || (x > 6 && x < 26) || x > 68) continue;
      const w = 1.25 + (col % 3) * 0.4,
        h = 2 + (col % 2) * 0.5;
      mouths.push({ position: [x, y + h / 2, -39.15], scale: [w, h, 1] });
      for (const side of [-1, 1])
        frames.push({
          position: [x + side * (w / 2 + 0.15), y + h / 2, -39.08],
          scale: [0.18, h + 0.3, 0.4],
        });
      frames.push({ position: [x, y + h + 0.15, -39.08], scale: [w + 0.45, 0.22, 0.4] });
      if (row === 1 || row === 2)
        galleries.push({ position: [x, y - 0.15, -38.7], scale: [7.9, 0.22, 1.4] });
    }
  scatterInstanced(
    group,
    new THREE.PlaneGeometry(1, 1),
    mat('#30281f', { roughness: 1 }),
    mouths,
  ).name = 'mogao-staggered-cave-mouths';
  scatterInstanced(group, new THREE.BoxGeometry(1, 1, 1), mat('#b39a79', { roughness: 1 }), frames);
  scatterInstanced(
    group,
    new THREE.BoxGeometry(1, 1, 1),
    mat('#8a7962', { roughness: 1 }),
    galleries,
  );
  const pavilionLight = new THREE.PointLight('#f0a45c', 1.6, 44, 2).translateX(-14);
  pavilionLight.translateY(11);
  pavilionLight.translateZ(-31);
  group.add(pavilionLight);
  // Boardwalk from open sand to the cave mouth; timber tunnel into the hall.
  addMesh(
    group,
    new THREE.BoxGeometry(3.6, 0.22, 26.5),
    mat('#7a5432', { roughness: 0.95 }),
    [15, 0.68, -25.2],
  );
  const posts: Placement[] = [];
  for (let z = -14; z >= -38; z -= 4.8)
    for (const x of [13.4, 16.6]) posts.push({ position: [x, 0.75, z] });
  scatterInstanced(
    group,
    new THREE.CylinderGeometry(0.09, 0.11, 1.3, 5),
    mat('#5c3d22', { roughness: 1 }),
    posts,
  );
  for (const x of [13.4, 16.6])
    addMesh(group, new THREE.BoxGeometry(0.1, 0.1, 26.5), mat('#5c3d22', { roughness: 1 }), [
      x,
      1.5,
      -25.2,
    ]);
  const plaster = mat('#a5825c', { roughness: 1 });
  for (const x of [12.85, 19.15])
    addMesh(group, new THREE.BoxGeometry(0.5, 6.2, 13), plaster, [x, 3.1, -33.5]);
  addMesh(group, new THREE.BoxGeometry(7, 0.5, 13), plaster, [16, 6.35, -33.5]);
  const timber = mat('#4c3220', { roughness: 0.95 });
  for (const x of [12.6, 19.4])
    addMesh(group, new THREE.BoxGeometry(0.5, 6.4, 0.5), timber, [x, 3.2, -27]);
  addMesh(group, new THREE.BoxGeometry(7.6, 0.5, 0.6), timber, [16, 6.55, -27]);
  addMesh(
    group,
    new THREE.BoxGeometry(17, 0.5, 16.6),
    mat('#8d6f4e', { roughness: 1 }),
    [16, 0.25, -48],
  );
  addMesh(
    group,
    new THREE.BoxGeometry(6.6, 0.5, 13.2),
    mat('#8d6f4e', { roughness: 1 }),
    [16, 0.25, -33.5],
  );
  // Barrel-vault hall: mural canvas unrolls around the vault (story register, thousand-buddha grid, apsara crown), preaching west wall.
  const vaultGeo = new THREE.CylinderGeometry(8.5, 8.5, 16.4, 28, 6, true, -Math.PI / 2, Math.PI);
  vaultGeo.rotateX(-Math.PI / 2);
  const vaultTex = canvasTexture(1024, 512, paintVaultMural, [1, 2]);
  addMesh(
    group,
    vaultGeo,
    mat('#ffffff', {
      map: vaultTex,
      roughness: 0.9,
      side: THREE.DoubleSide,
      emissive: '#1c0e08',
      intensity: 0.18,
    }),
    [16, 0, -48],
  );
  addMesh(
    group,
    new THREE.PlaneGeometry(17, 8.5),
    mat('#ffffff', {
      map: canvasTexture(512, 512, paintEndWall),
      roughness: 0.92,
      emissive: '#1c0e08',
      intensity: 0.18,
    }),
    [16, 4.25, -55.9],
  );
  // Lotus caisson (斗四) with a hanging lamp at the vault crown.
  const caissonMat = mat('#ffffff', {
    map: canvasTexture(512, 512, paintCaisson),
    roughness: 0.9,
    emissive: '#241108',
    intensity: 0.3,
  });
  addMesh(group, new THREE.PlaneGeometry(3, 3), caissonMat, [16, 8.05, -48]).rotation.x =
    Math.PI / 2;
  addMesh(group, new THREE.BoxGeometry(3.3, 0.14, 3.3), goldMat, [16, 8.12, -48]);
  addMesh(
    group,
    new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4),
    mat('#2a1a10', { roughness: 1 }),
    [16, 7.35, -48],
  );
  const lampMat = mat('#c9792f', { emissive: '#ffc06a', intensity: 2.4, roughness: 0.5 });
  addMesh(group, new THREE.CylinderGeometry(0.3, 0.34, 0.55, 8), lampMat, [16, 6.5, -48]);
  const glowMat = new THREE.SpriteMaterial({
    map: glowTexture(96),
    color: '#ffc078',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.85,
  });
  const hangGlow = new THREE.Sprite(glowMat);
  hangGlow.position.set(16, 6.5, -48);
  hangGlow.scale.set(3.4, 3.4, 1);
  group.add(hangGlow);
  // Skylight god-ray falling from the caisson oculus, dust drifting inside.
  const beamMat = glowShaderMaterial('#f6dfae', '#f2c98a', 0.34);
  for (const [r1, r2, seg] of [
    [1.2, 2.9, 20],
    [0.55, 1.6, 16],
  ] as const) {
    addMesh(
      group,
      new THREE.CylinderGeometry(r1, r2, 7.9, seg, 1, true),
      beamMat,
      [16, 4.15, -48],
    ).renderOrder = 5;
  }
  addMesh(
    group,
    new THREE.CircleGeometry(1.45, 20),
    mat('#0d0908', { roughness: 1 }),
    [16, 8.3, -48],
  ).rotation.x = Math.PI / 2;
  const pool = addMesh(
    group,
    new THREE.PlaneGeometry(7.5, 7.5),
    new THREE.MeshBasicMaterial({
      map: glowTexture(128),
      color: '#f2d9a8',
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    [16, 0.56, -48],
  );
  pool.rotation.x = -Math.PI / 2;
  pool.renderOrder = 4;
  const dust = particleField({
    count: 150,
    area: [4.8, 7.4, 4.8],
    origin: [16, 0.5, -48],
    color: '#f6dfb2',
    size: 0.16,
    additive: true,
    opacity: 0.5,
    fall: 0.1,
    sway: 0.25,
    twinkle: 0.6,
  });
  group.add(dust); // Apsara ribbons spiralling around the cave heart, riders on the crests.
  const apsaras = new THREE.Group();
  apsaras.position.set(16, 4.8, -48);
  group.add(apsaras);
  const ribbonMats = [
    glowShaderMaterial('#e6b45c', '#f6e2b0', 0.7),
    glowShaderMaterial('#e08a9a', '#f6cdc4', 0.66),
  ];
  const apsaraMat = new THREE.MeshBasicMaterial({
    map: canvasTexture(256, 256, (ctx, rand) => {
      drawApsara(ctx, 148, 128, 86, -1, '#ecd9b0');
      chipOff(ctx, rand, 12);
    }),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.92,
  });
  const ribbons: THREE.Mesh[] = [];
  for (let r = 0; r < 3; r++) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r * 2.09,
        rad = 3.4 + 1.7 * Math.sin(i * 1.9 + r * 1.3);
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * rad,
          1.5 * Math.sin(i * 2.3 + r * 2.1) + 0.6 * ((i % 3) - 1),
          Math.sin(a) * rad * 0.72,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const ribbon = new THREE.Mesh(
      ribbonGeometry(curve, 96, 0.95, (t) => 0.15 + 0.85 * Math.sin(Math.PI * t)),
      ribbonMats[r % 2],
    );
    const rider = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), apsaraMat);
    rider.position.copy(curve.getPointAt(0.62));
    rider.rotation.y = r * 2.1 + 0.9;
    ribbon.add(rider);
    ribbon.renderOrder = 6;
    apsaras.add(ribbon);
    ribbons.push(ribbon);
  }
  // Two lantern stands with their point lights (three lights inside the cave).
  const standLampMat = mat('#c33b22', { emissive: '#ff9d4e', intensity: 2, roughness: 0.55 });
  const frameMat = mat('#4c3220', { roughness: 0.95 });
  const standGlow = new THREE.SpriteMaterial({
    map: glowTexture(96),
    color: '#ffb168',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.8,
  });
  const lamps: Array<{ light: THREE.PointLight; base: number; phase: number }> = [];
  for (const [x, z, phase] of [
    [10.2, -43.5, 0],
    [21.6, -51.5, 2.3],
  ] as const) {
    addMesh(group, new THREE.CylinderGeometry(0.07, 0.11, 2.4, 6), frameMat, [x, 1.7, z]);
    addMesh(group, new THREE.ConeGeometry(0.3, 0.22, 8), frameMat, [x, 2.98, z]);
    addMesh(group, new THREE.CylinderGeometry(0.24, 0.28, 0.55, 8), standLampMat, [x, 2.62, z]);
    const sprite = new THREE.Sprite(standGlow);
    sprite.position.set(x, 2.62, z);
    sprite.scale.set(2.8, 2.8, 1);
    group.add(sprite);
    const light = new THREE.PointLight('#ffb168', 2.2, 20, 2).translateX(x);
    light.translateY(2.6);
    light.translateZ(z);
    group.add(light);
    lamps.push({ light, base: 2.2, phase });
  }
  const hangLight = new THREE.PointLight('#ffc078', 2.6, 30, 2).translateX(16);
  hangLight.translateY(6.3);
  hangLight.translateZ(-48);
  group.add(hangLight);
  lamps.push({ light: hangLight, base: 2.6, phase: 4.1 });
  // Moonlit camel caravan on the eastern ridge, drover's lantern at the head.
  const caravan = new THREE.Group();
  caravan.rotation.y = Math.PI / 2;
  caravan.position.set(78, 0.4, -30);
  group.add(caravan);
  const silhouette = mat('#221912', { roughness: 1 });
  const bodies: Placement[] = [],
    humps: Placement[] = [],
    necks: Placement[] = [],
    heads: Placement[] = [],
    legs: Placement[] = [];
  for (let k = 0; k < 3; k++) {
    const z = k * 3.4;
    bodies.push({ position: [0, 1.45, z], scale: [0.78, 0.92, 1.55] });
    humps.push(
      { position: [0, 2.18, z - 0.42], scale: 0.42 },
      { position: [0, 2.18, z + 0.42], scale: 0.42 },
    );
    necks.push({ position: [0, 2, z + 1.12], tilt: 0.95 });
    heads.push({ position: [0, 2.55, z + 2.05], tilt: 0.35, scale: [0.3, 0.3, 0.72] });
    for (const sx of [-0.38, 0.38])
      for (const sz of [-0.6, 0.6]) legs.push({ position: [sx, 0.75, z + sz] });
  }
  scatterInstanced(caravan, new THREE.SphereGeometry(1, 10, 8), silhouette, bodies);
  scatterInstanced(caravan, new THREE.SphereGeometry(1, 8, 6), silhouette, humps);
  scatterInstanced(caravan, new THREE.CylinderGeometry(0.13, 0.19, 1.7, 6), silhouette, necks);
  scatterInstanced(caravan, new THREE.BoxGeometry(1, 1, 1), silhouette, heads);
  scatterInstanced(caravan, new THREE.CylinderGeometry(0.06, 0.09, 1.5, 5), silhouette, legs);
  addMesh(caravan, new THREE.CylinderGeometry(0.2, 0.3, 1.15, 6), silhouette, [0.95, 1.05, 9.2]);
  addMesh(caravan, new THREE.SphereGeometry(0.22, 8, 6), silhouette, [0.95, 1.85, 9.2]);
  addMesh(
    caravan,
    new THREE.CylinderGeometry(0.03, 0.03, 2.1, 5),
    silhouette,
    [1.28, 1.05, 9.5],
  ).rotation.x = 0.1;
  const bellMat = mat('#c98a3a', { emissive: '#ffb45e', intensity: 2.2, roughness: 0.5 });
  addMesh(caravan, new THREE.SphereGeometry(0.14, 8, 6), bellMat, [1.28, 2.12, 9.5]);
  const bellGlow = new THREE.Sprite(standGlow);
  bellGlow.position.set(1.28, 2.12, 9.5);
  bellGlow.scale.set(1.8, 1.8, 1);
  caravan.add(bellGlow);
  // Star river and moon for the final chapter.
  const stars = particleField({
    count: 420,
    area: [330, 66, 290],
    origin: [0, 66, -30],
    color: '#e8edff',
    size: 1.15,
    additive: true,
    opacity: 0.8,
    twinkle: 0.85,
  });
  group.add(stars);
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: canvasTexture(128, 128, paintMoon),
      transparent: true,
      depthWrite: false,
    }),
  );
  moon.position.set(-64, 56, -88);
  moon.scale.set(13, 13, 1);
  group.add(moon);
  // Per-frame: lantern flicker, ribbon orbit and bob, dust, drifting caravan.
  const flickerMats: Array<{ m: THREE.MeshStandardMaterial; base: number; phase: number }> = [
    { m: stringMat, base: 1.7, phase: 1.1 },
    { m: standLampMat, base: 2, phase: 0.6 },
    { m: lampMat, base: 2.4, phase: 4.1 },
    { m: bellMat, base: 2.2, phase: 3.2 },
  ];
  lamps.push({ light: pavilionLight, base: 1.6, phase: 1.4 });
  registerUpdate(group, (elapsed, night) => {
    const warmth = 0.5 + 0.5 * night; // lanterns take over as night falls
    for (const f of flickerMats) {
      f.m.emissiveIntensity =
        f.base *
        warmth *
        (0.8 +
          0.13 * Math.sin(elapsed * 7.1 + f.phase) +
          0.07 * Math.sin(elapsed * 13.3 + f.phase * 2.7));
    }
    for (const l of lamps) {
      l.light.intensity =
        l.base *
        warmth *
        (0.82 +
          0.11 * Math.sin(elapsed * 6.3 + l.phase) +
          0.07 * Math.sin(elapsed * 12.7 + l.phase * 1.9));
    }
    apsaras.rotation.y = elapsed * 0.13;
    for (let i = 0; i < ribbons.length; i++)
      ribbons[i].position.y = Math.sin(elapsed * 0.42 + i * 2.1) * 0.35;
    for (const m of ribbonMats) m.uniforms.uTime.value = elapsed;
    beamMat.uniforms.uTime.value = elapsed;
    beamMat.uniforms.uStrength.value = 0.55 + 0.8 * (1 - night); // daylight keeps the shaft bright
    (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    (stars.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    caravan.position.x = 78 + Math.sin(elapsed * 0.017) * 9;
    caravan.position.z = -30 + Math.sin(elapsed * 0.041) * 2.2;
    caravan.position.y = duneHeight(caravan.position.x, caravan.position.z) + 0.08;
  });
  return group;
}
