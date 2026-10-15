import * as THREE from 'three';
import { seededRandom } from './math';
import type { Painting } from '../types';
import { groundHeight } from './terrain';

type Point = readonly [number, number];

/** Painted dabs follow authored cloud ribbons; there is no repeating sine-wave wallpaper. */
function paintedSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 3072;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const random = seededRandom(1889);
  const px = (yaw: number) => ((yaw + Math.PI) / (Math.PI * 2)) * canvas.width;
  const py = (pitch: number) => ((1.15 - pitch) / 1.5) * canvas.height;
  const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, '#173e69');
  background.addColorStop(0.53, '#102e56');
  background.addColorStop(1, '#132842');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const dab = (
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    color: string,
    alpha: number,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.quadraticCurveTo(0, width * (random() - 0.5), length / 2, 0);
    ctx.stroke();
    ctx.restore();
  };
  // Sparse underlying impasto, with directions changing around the principal cloud.
  const baseColors = ['#234c75', '#193d65', '#285681', '#315c7e', '#183454'];
  for (let i = 0; i < 31000; i++) {
    const x = random() * canvas.width,
      y = random() * canvas.height;
    const cx = px(-0.37),
      cy = py(0.22);
    const angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
    dab(
      x,
      y,
      angle * 0.45,
      3 + random() * 10,
      0.7 + random() * 1.5,
      baseColors[Math.floor(random() * baseColors.length)]!,
      0.18 + random() * 0.22,
    );
  }
  const ribbon = (points: Point[], breadth: number, palette: string[]) => {
    const coords = points.map(([x, y]) => new THREE.Vector2(px(x), py(y)));
    // Several broken brush paths across a broad ribbon, not continuous concentric lines.
    for (let row = -7; row <= 7; row++) {
      const offset = (row / 7) * breadth;
      for (let i = 2; i < coords.length - 2; i += 1 + Math.floor(random() * 2)) {
        if (random() < 0.16) continue;
        const before = coords[i - 1]!,
          at = coords[i]!,
          after = coords[i + 1]!;
        const tangent = after.clone().sub(before).normalize();
        const taper = Math.sin((i / (coords.length - 1)) * Math.PI) ** 0.3;
        const x = at.x - tangent.y * offset * taper + (random() - 0.5) * 2;
        const y = at.y + tangent.x * offset * taper + (random() - 0.5) * 2;
        dab(
          x,
          y,
          Math.atan2(tangent.y, tangent.x),
          3 + random() * 6,
          1.3 + random() * 2,
          palette[Math.floor(random() * palette.length)]!,
          (0.24 + random() * 0.42) * (1 - Math.abs(row) / 11),
        );
      }
    }
  };
  const curve = (a: Point, b: Point, c: Point, d: Point, count = 240): Point[] =>
    Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1),
        u = 1 - t;
      return [
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ];
    });
  const cloud = ['#477ba4', '#668fa9', '#86a8b8', '#5688aa', '#9eafa8'];
  ribbon(curve([-1.6, 0.12], [-1.03, 0.35], [-0.56, 0.31], [-0.15, 0.19]), 14, cloud);
  const spiral: Point[] = Array.from({ length: 320 }, (_, i) => {
    const t = i / 319,
      a = -0.55 + t * Math.PI * 2.15,
      r = 0.21 * (1 - t) ** 1.3 + 0.006;
    return [-0.35 + Math.cos(a) * r * 1.45, 0.14 + Math.sin(a) * r * 0.53];
  });
  ribbon(spiral, 15, cloud);
  ribbon(curve([-1.45, -0.02], [-1.04, 0.15], [-0.72, -0.035], [-0.36, 0.04]), 9, [
    '#345c86',
    '#6094ae',
    '#94b6bd',
    '#496d8c',
  ]);
  ribbon(curve([-0.65, 0.34], [-0.03, 0.22], [0.3, 0.21], [0.6, 0.28]), 10, cloud);
  // Individual, irregular golden nimbuses. Eleven stars, not an evenly spaced string.
  const stars: Point[] = [
    [-1.17, 0.2],
    [-0.98, 0.27],
    [-0.79, 0.1],
    [-0.68, 0.31],
    [-0.56, 0.035],
    [-0.35, 0.28],
    [-0.13, 0.14],
    [-0.02, 0.35],
    [0.22, 0.1],
    [0.47, 0.26],
    [0.7, 0.1],
  ];
  for (const [sx, sy] of stars) {
    const x = px(sx),
      y = py(sy),
      radius = 6 + random() * 5;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
    halo.addColorStop(0, '#e4d299');
    halo.addColorStop(0.25, '#a6aa7d99');
    halo.addColorStop(1, '#b7b98300');
    ctx.fillStyle = halo;
    ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
    for (let i = 0; i < 110; i++) {
      const a = random() * Math.PI * 2,
        r = radius * (0.5 + random() * 2);
      dab(
        x + Math.cos(a) * r,
        y + Math.sin(a) * r,
        a + Math.PI / 2,
        2 + random() * 4,
        1 + random() * 1.5,
        i % 3 ? '#c7bd7f' : '#e1d59d',
        0.25 + random() * 0.4,
      );
    }
    ctx.fillStyle = '#eee2ad';
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.38, radius * 0.48, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const mx = px(0.05),
    my = py(0.22),
    mr = 29;
  const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 2.5);
  moonGlow.addColorStop(0, '#d9c58480');
  moonGlow.addColorStop(1, '#b2af7a00');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
  ctx.fillStyle = '#ead49a';
  ctx.beginPath();
  ctx.arc(mx, my, mr, Math.PI / 3, (Math.PI * 5) / 3);
  ctx.bezierCurveTo(
    mx - mr * 0.6,
    my - mr * 0.7,
    mx - mr * 0.6,
    my + mr * 0.7,
    mx + mr * 0.5,
    my + (mr * Math.sqrt(3)) / 2,
  );
  ctx.fill();
  // Paint within the crescent silhouette: the moon is pigment, not a flat UI icon.
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 640; i++) {
    const x = mx + (random() - 0.5) * mr * 2;
    const y = my + (random() - 0.5) * mr * 2;
    const angle = Math.atan2(y - my, x - mx) + Math.PI / 2;
    dab(
      x,
      y,
      angle,
      2 + random() * 6,
      0.7 + random(),
      ['#f4e4ad', '#b5a465', '#dfc67d', '#eedda8'][i % 4]!,
      0.25 + random() * 0.45,
    );
  }
  ctx.restore();
  for (let i = 0; i < 65; i++) {
    const a = Math.PI / 3 + (random() * Math.PI * 4) / 3;
    dab(
      mx + Math.cos(a) * (mr - 2),
      my + Math.sin(a) * (mr - 2),
      a + Math.PI / 2,
      3,
      1.3,
      i % 2 ? '#f1e2b4' : '#d7bb77',
      0.5,
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function createPainterlyStarrySky(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPainting: { value: paintedSkyTexture() } },
    vertexShader: `varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vPosition;uniform sampler2D uPainting;uniform float uTime;
    void main(){vec3 d=normalize(vPosition);float yaw=atan(d.x,-d.z);float pitch=asin(d.y);
      vec2 uv=vec2((yaw+3.14159265)/6.2831853,(pitch+.35)/1.5);
      uv.x+=sin(uTime*.018)*.00022;
      vec3 color=texture2D(uPainting,uv).rgb;
      color=mix(vec3(.016,.031,.061),color,smoothstep(-.12,.04,pitch));
      gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), material);
  sky.name = 'Authored broken-brush starry sky';
  return sky;
}

/** Quiet ground brushwork and a meandering lane, visible when entering the village. */
export function buildStarryDetails(painting: Painting): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(18891);
  const positions: number[] = [],
    colors: number[] = [];
  const path = new THREE.Color('#394d62');
  const vertex = (x: number, z: number, tint: THREE.Color) => {
    positions.push(x, groundHeight(painting, x, z) + 0.035, z);
    colors.push(tint.r, tint.g, tint.b);
  };
  const centre = (t: number) => ({ x: Math.sin(t * 4.2) * 3.1, z: 53 - t * 73 });
  for (let i = 0; i < 130; i++) {
    const a = centre(i / 130),
      b = centre((i + 1) / 130);
    const width = 0.9 + Math.sin(i * 0.07) * 0.14;
    for (const [x, z] of [
      [a.x - width, a.z],
      [a.x + width, a.z],
      [b.x - width, b.z],
      [a.x + width, a.z],
      [b.x + width, b.z],
      [b.x - width, b.z],
    ])
      vertex(x!, z!, path);
  }
  // Dashes are short strips laid on the actual ground, not emissive floating particles.
  const tints = ['#2c4660', '#294354', '#344e66', '#233d53'].map((hex) => new THREE.Color(hex));
  for (let i = 0; i < 2100; i++) {
    const x = -90 + random() * 180,
      z = -4 + random() * 62;
    const y = groundHeight(painting, x, z);
    if (y < 0.25 || Math.abs(x - Math.sin(((53 - z) / 73) * 4.2) * 3.1) < 1.8) continue;
    const length = 0.25 + random() * 1.4,
      width = 0.035 + random() * 0.06;
    const tint = tints[Math.floor(random() * tints.length)]!;
    for (const [dx, dz] of [
      [-length, -width],
      [length, -width],
      [-length, width],
      [length, -width],
      [length, width],
      [-length, width],
    ])
      vertex(x + dx!, z + dz!, tint);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
  );
  mesh.name = 'Blue field strokes and quiet village lane';
  group.add(mesh);
  return group;
}
