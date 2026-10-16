import * as THREE from 'three';

import {
  addMesh, canvasTexture, glowTexture, mat, particleField, petalField,
  registerUpdate, scatterInstanced, type Placement,
} from './featuredShared';
import { clamp, fbm, seededRandom } from './math';
import { buildSakuraGrove, buildSakuraForest } from './sakuraGrove';
import { sampleSakuraVoyage } from './sakuraVoyage';
import { installSakuraBoat } from './sakuraBoat';

/**
 * Sakura river · a boat journey — a procedural Japanese river valley: morning
 * mist under a snow-capped Fuji, cherry avenues shedding petals onto the
 * current, a vermillion drum bridge, a pagoda town, a thousand-torii lane and
 * the great torii standing in the lake. Lanterns, fox fire and sky lanterns
 * wake as `night` rises toward 1.
 */

/** Materials whose emissive breathes with `night`, kept at authored base. */
interface NightMat { m: THREE.MeshStandardMaterial; base: number }

/** River half-width; the channel meanders and opens into a lake past z -72. */
const bankX = (z: number): number =>
  14 + 3.4 * Math.sin(z * 0.043) + 1.5 * Math.sin(z * 0.117 + 1.6) + Math.max(0, -72 - z) * 1.35;
const pathX = (z: number): number => -26 + 1.2 * Math.sin(z * 0.13);

/** Valley cross-section: sunken beach, grass banks, wooded slopes rising outward. */
export function bankHeight(x: number, z: number): number {
  const d = Math.abs(x) - bankX(z);
  if (d <= 0) return -0.45;
  const t = Math.min(d / 6.5, 1);
  return -0.45 + t * t * (3 - 2 * t) * 2 + fbm(x * 0.045, z * 0.045, 9) * 1.7 * Math.min(d / 14, 1) + Math.max(0, d - 26) * 0.1;
}

/** Displace a horizontal strip so it drapes over the bank terrain (+lift). */
function drape(geo: THREE.PlaneGeometry, px: number, pz: number, lift = 0): void {
  geo.rotateX(-Math.PI / 2);
  geo.translate(px, 0, pz);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, bankHeight(pos.getX(i), pos.getZ(i)) + lift);
  geo.computeVertexNormals();
}

/** Base coat plus deterministic speckle strokes — bark, grass, plaster. */
function speckle(w: number, h: number, base: string, colors: string[], count: number, sw: number, sh: number, repeat?: readonly [number, number]): THREE.CanvasTexture {
  return canvasTexture(w, h, (ctx, rand) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.fillRect(rand() * w, rand() * h, sw + rand() * sw, sh + rand() * sh);
    }
  }, repeat);
}
const barkTexture = (): THREE.CanvasTexture =>
  speckle(64, 128, '#4a382a', ['#3a2a1e', '#5e4834'], 46, 2.5, 22, [2, 3]);
const plasterTexture = (): THREE.CanvasTexture =>
  speckle(64, 64, '#e9e1d2', ['#ddd3c1', '#f2ecdf'], 260, 3, 3, [2, 2]);

const tileTexture = (): THREE.CanvasTexture =>
  canvasTexture(64, 64, (ctx, rand) => {
    ctx.fillStyle = '#232930'; ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      ctx.fillStyle = '#333b44'; ctx.fillRect(0, y, 64, 3);
      for (let x = 0; x < 64; x += 16) {
        ctx.fillStyle = rand() > 0.5 ? '#1b2025' : '#2c343c'; ctx.fillRect(x + (y % 16 ? 8 : 0), y + 3, 3, 5);
      }
    }
  }, [3, 2]);

/** Warm shoji panes behind dark lattice — doubles as its own emissive map. */
const latticeTexture = (): THREE.CanvasTexture =>
  canvasTexture(64, 64, (ctx) => {
    ctx.fillStyle = '#e8a558'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#241a12';
    for (const [x, y, w, h] of [[0, 0, 64, 5], [0, 59, 64, 5], [0, 0, 5, 64], [59, 0, 5, 64]] as const) ctx.fillRect(x, y, w, h);
    for (let i = 10; i < 60; i += 10) { ctx.fillRect(i - 1, 5, 2, 54); ctx.fillRect(5, i - 1, 54, 2); }
  });

/** Offset a torii-part placement by local dx/dy/dz under slot rotation+scale. */
function partAt(s: Placement, dx: number, dy: number, dz: number): Placement {
  const k = typeof s.scale === 'number' ? s.scale : 1;
  const c = Math.cos(s.rotationY ?? 0);
  const n = Math.sin(s.rotationY ?? 0);
  return {
    position: [s.position[0] + (dx * c + dz * n) * k, s.position[1] + dy * k, s.position[2] + (dz * c - dx * n) * k],
    rotationY: s.rotationY, scale: s.scale,
  };
}

/** Thousand-torii lane plus the great torii in the lake; all parts instanced. */
function buildToriiLane(parent: THREE.Group, red: THREE.MeshStandardMaterial): void {
  const slots: Placement[] = [];
  for (let i = 0; i < 9; i++) {
    const z = -10 - i * 4.1;
    slots.push({ position: [pathX(z), bankHeight(pathX(z), z), z], rotationY: Math.cos(z * 0.13) * 0.16 });
  }
  slots.push({ position: [0, -0.2, -85], scale: 3.4 });
  const parts = (geo: THREE.BufferGeometry, offsets: readonly (readonly [number, number, number])[]) =>
    scatterInstanced(parent, geo, red, slots.flatMap((s) => offsets.map((o) => partAt(s, o[0], o[1], o[2]))));
  parts(new THREE.CylinderGeometry(0.17, 0.21, 3.3, 7), [[-1.12, 1.65, 0], [1.12, 1.65, 0]]);
  parts(new THREE.BoxGeometry(2.95, 0.2, 0.26), [[0, 2.25, 0]]); parts(new THREE.BoxGeometry(0.24, 0.62, 0.22), [[0, 2.78, 0]]); // nuki, gakuzuka
  parts(new THREE.BoxGeometry(0.44, 0.66, 0.09), [[0, 2.78, 0.2]]); parts(new THREE.BoxGeometry(3.1, 0.2, 0.44), [[0, 3.26, 0]]); // plaque, shimaki
  const kasagi = new THREE.Shape(); // myojin kasagi: ends sweep upward
  kasagi.moveTo(-1.8, 0.22); kasagi.quadraticCurveTo(0, -0.26, 1.8, 0.22);
  kasagi.lineTo(1.8, -0.04); kasagi.quadraticCurveTo(0, -0.52, -1.8, -0.04); kasagi.closePath();
  parts(new THREE.ExtrudeGeometry(kasagi, { depth: 0.5, bevelEnabled: false }).translate(0, 0, -0.25), [[0, 3.48, 0]]);
}

/** Stone lanterns along the torii path; fire boxes glow once night falls. */
function buildStoneLanterns(parent: THREE.Group, nightMats: NightMat[]): void {
  const slots: Placement[] = [-16, -27, -38].map((z) => {
    const x = pathX(z) + 1.35;
    return { position: [x, bankHeight(x, z), z] };
  });
  const stone = mat('#8d8b84', { roughness: 0.95 });
  const part = (geo: THREE.BufferGeometry, dy: number) =>
    scatterInstanced(parent, geo, stone, slots.map((s) => partAt(s, 0, dy, 0)));
  part(new THREE.BoxGeometry(0.64, 0.32, 0.64), 0.16);
  part(new THREE.CylinderGeometry(0.09, 0.12, 0.75, 6), 0.7);
  part(new THREE.BoxGeometry(0.46, 0.42, 0.46), 1.28);
  part(new THREE.ConeGeometry(0.52, 0.3, 7), 1.63);
  part(new THREE.SphereGeometry(0.1, 8, 6), 1.83);
  const flame = mat('#ffd9a2', { emissive: '#ff9d42' });
  nightMats.push({ m: flame, base: 2.4 });
  scatterInstanced(parent, new THREE.PlaneGeometry(0.28, 0.26), flame,
    slots.map((s) => ({ ...partAt(s, -0.24, 1.28, 0), rotationY: -Math.PI / 2 })));
}

/** Machiya row on the east bank: plaster walls, tiled gables, lattice windows. */
function buildTown(parent: THREE.Group, nightMats: NightMat[]): void {
  const spots: Array<[number, number]> = [[31.5, -36.5], [40, -35.5], [31, -45], [40.5, -44.5]];
  const base = spots.map(([x, z]) => ({ x, y: bankHeight(x, z), z }));
  const gable = new THREE.Shape();
  gable.moveTo(-3.3, 0); gable.lineTo(3.3, 0); gable.lineTo(0, 1.6); gable.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(gable, { depth: 7.8, bevelEnabled: false });
  roofGeo.translate(0, 0, -3.9);
  scatterInstanced(parent, new THREE.BoxGeometry(5.4, 3.5, 7), mat('#e6ddcc', { map: plasterTexture() }),
    base.map((b) => ({ position: [b.x, b.y + 1.75, b.z] as [number, number, number] })));
  scatterInstanced(parent, roofGeo, mat('#262c33', { map: tileTexture(), roughness: 0.72 }),
    base.map((b) => ({ position: [b.x, b.y + 3.5, b.z] as [number, number, number] })));
  const lattice = latticeTexture();
  const winMat = mat('#241a12', { map: lattice });
  winMat.emissive = new THREE.Color('#ffb066'); winMat.emissiveMap = lattice;
  nightMats.push({ m: winMat, base: 1.5 });
  const winSlots: Placement[] = [];
  for (const b of base) for (const wy of [1.35, 2.45]) for (const wz of [-1.9, 0, 1.9])
    winSlots.push({ position: [b.x - 2.72, b.y + wy, b.z + wz], rotationY: -Math.PI / 2 });
  scatterInstanced(parent, new THREE.PlaneGeometry(1.05, 0.85), winMat, winSlots);
  scatterInstanced(parent, new THREE.PlaneGeometry(1.15, 1.9), mat('#3d2f22', { map: barkTexture() }),
    base.map((b) => ({ position: [b.x - 2.72, b.y + 0.95, b.z + 3.1], rotationY: -Math.PI / 2 })));
  // Paper lantern string sagging under each eave.
  const paper = mat('#ffe2b0', { emissive: '#ff9d42' });
  nightMats.push({ m: paper, base: 1.8 });
  const hangs: Placement[] = [];
  for (const b of base) for (let k = 0; k < 4; k++)
    hangs.push({ position: [b.x - 3.0, b.y + 3.02 - Math.sin((k / 3) * Math.PI) * 0.22, b.z - 2.4 + k * 1.6], scale: [1, 1.3, 1] });
  scatterInstanced(parent, new THREE.SphereGeometry(0.17, 8, 7), paper, hangs);
}

/** Five-story pagoda: stone base, tapering tiers, flared roofs, golden sorin. */
function buildPagoda(parent: THREE.Group): void {
  const x = 43, z = -41, y = bankHeight(x, z) + 0.1;
  addMesh(parent, new THREE.BoxGeometry(5.6, 1.2, 5.6), mat('#9a938a', { roughness: 0.9 }), [x, y + 0.6, z]);
  const tiers: Placement[] = [];
  const caps: Placement[] = [];
  for (let i = 0; i < 5; i++) {
    const lvl = y + 1.2 + i * 2.3;
    const k = (3.7 - i * 0.42) / 3.7;
    tiers.push({ position: [x, lvl + 0.85, z], scale: [k, 1, k] });
    caps.push({ position: [x, lvl + 1.7, z], scale: k });
  }
  scatterInstanced(parent, new THREE.BoxGeometry(3.7, 1.7, 3.7), mat('#e2d8c6', { map: plasterTexture() }), tiers);
  const profile = [[3.5, 0], [2.5, 0.36], [1.1, 0.7], [0, 0.88]].map(([r, h]) => new THREE.Vector2(r, h));
  const roofs = new THREE.LatheGeometry(profile, 4).rotateY(Math.PI / 4);
  scatterInstanced(parent, roofs, mat('#2b323a', { map: tileTexture(), roughness: 0.7 }), caps);
  const gold = mat('#d9b45c', { roughness: 0.35, metalness: 0.7 });
  addMesh(parent, new THREE.CylinderGeometry(0.06, 0.1, 2.5, 6), gold, [x, y + 13.1, z]);
  const rings = new THREE.TorusGeometry(0.3, 0.05, 5, 14).rotateX(Math.PI / 2);
  scatterInstanced(parent, rings, gold, [0, 1, 2, 3].map((i) => ({ position: [x, y + 12.5 + i * 0.4, z] })));
  addMesh(parent, new THREE.SphereGeometry(0.17, 8, 6), gold, [x, y + 14.4, z]);
}

/** High vermillion drum bridge arching over the channel at z -26. */
function buildBridge(parent: THREE.Group, red: THREE.MeshStandardMaterial): void {
  const band = (cy: number, rx: number, ry: number, half: number): THREE.Shape => {
    const s = new THREE.Shape();
    s.moveTo(rx, cy); s.absellipse(0, cy, rx, ry, 0, Math.PI, false);
    s.lineTo(-rx, cy - half * 2); s.absellipse(0, cy - half * 2, rx, ry, Math.PI, 0, true); s.closePath();
    return s;
  };
  addMesh(parent, new THREE.ExtrudeGeometry(band(-0.55, 11, 4.9, 0.27), { depth: 3.4, bevelEnabled: false }).translate(0, 0, -1.7),
    red, [0, 0.95, -26]);
  const railGeo = new THREE.ExtrudeGeometry(band(0.55, 10.6, 4.9, 0.09), { depth: 0.12, bevelEnabled: false });
  railGeo.translate(0, 0, -0.06);
  scatterInstanced(parent, railGeo, red, [{ position: [0, 0.95, -27.6] }, { position: [0, 0.95, -24.4] }]);
  const posts: Placement[] = [];
  for (let k = 0; k < 12; k++) {
    const x = -10 + k * (20 / 11), top = 0.4 + 4.9 * Math.sqrt(Math.max(0, 1 - (x / 11) ** 2));
    for (const side of [-1, 1]) posts.push({ position: [x, top + 0.35, -26 + side * 1.55] });
  }
  for (const sx of [-1, 1]) for (const side of [-1, 1])
    posts.push({ position: [sx * 10.6, 1.85, -26 + side * 1.55], scale: [2.2, 1.5, 2.2] });
  scatterInstanced(parent, new THREE.BoxGeometry(0.09, 0.9, 0.09), red, posts);
  scatterInstanced(parent, new THREE.BoxGeometry(2.2, 1.7, 3.9), mat('#84816f', { roughness: 1 }),
    [{ position: [-11.6, 0.45, -26] }, { position: [11.6, 0.45, -26] }]);
}

/** Sightseeing scull: hull, boatman silhouette and a paper bow lantern. */
function buildBoat(parent: THREE.Group, glowMat: THREE.SpriteMaterial, nightMats: NightMat[]): { boat: THREE.Group; pole: THREE.Mesh } {
  const boat = new THREE.Group();
  boat.name = 'sakura-tomabune';
  const hull = new THREE.Shape();
  hull.moveTo(-2.1, 0.62); hull.quadraticCurveTo(-2.55, 0.2, -1.7, 0.02); hull.lineTo(1.55, 0.02);
  hull.quadraticCurveTo(2.6, 0.35, 2.75, 0.85); hull.quadraticCurveTo(2.2, 0.6, 1.4, 0.62); hull.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hull, { depth: 1.35, bevelEnabled: false }).translate(0, 0, -0.675);
  addMesh(boat, hullGeo, mat('#6b4e33', { map: barkTexture(), roughness: 0.9 }));
  const timber = mat('#59402d', { roughness: 0.95 });
  const ribs: Placement[] = [];
  // Longitudinal planks, thwarts and a woven toma canopy leave the ends of the boat open.
  for (let i = 0; i < 9; i++) ribs.push({ position: [-1.7 + i * 0.42, 0.55, 0] });
  scatterInstanced(boat, new THREE.BoxGeometry(0.055, 0.1, 1.36), timber, ribs);
  const canopy = new THREE.PlaneGeometry(2.35, Math.PI, 12, 24);
  const canopyPosition = canopy.attributes.position;
  for (let i = 0; i < canopyPosition.count; i++) {
    const a = canopyPosition.getY(i);
    canopyPosition.setXYZ(i, canopyPosition.getX(i) + 0.1, 0.67 + Math.cos(a) * 0.76, Math.sin(a) * 0.67);
  }
  canopy.computeVertexNormals();
  const straw = speckle(256, 128, '#9a875d', ['#b29e70', '#6d5c3d', '#c2ae7d'], 1200, 1, 10, [3, 1]);
  addMesh(boat, canopy, mat('#e2d6b8', { map: straw, roughness: 1, side: THREE.DoubleSide }));
  const hoops: Placement[] = [];
  for (let i = 0; i < 6; i++) hoops.push({ position: [-1.04 + i * 0.46, 0.67, 0], rotationY: Math.PI / 2 });
  scatterInstanced(boat, new THREE.TorusGeometry(0.69, 0.025, 5, 24, Math.PI), timber, hoops);
  for (const z of [-0.7, 0.7]) addMesh(boat, new THREE.BoxGeometry(4.1, 0.055, 0.055), timber, [0.1, 0.64, z]);
  const ink = mat('#2c2620', { roughness: 0.95 });
  addMesh(boat, new THREE.CylinderGeometry(0.14, 0.27, 1.1, 7), ink, [-1.72, 1.15, 0]);
  addMesh(boat, new THREE.SphereGeometry(0.15, 8, 6), ink, [-1.72, 1.82, 0]);
  addMesh(boat, new THREE.ConeGeometry(0.34, 0.18, 9), mat('#8a7a56'), [-1.72, 1.95, 0]);
  const pole = addMesh(boat, new THREE.CylinderGeometry(0.03, 0.03, 3.1, 5), mat('#54402c'), [-1.4, 0.85, 0.75]);
  pole.rotation.z = 0.42;
  const lantern = mat('#ffdca8', { emissive: '#ffab4e' });
  nightMats.push({ m: lantern, base: 2.6 });
  addMesh(boat, new THREE.BoxGeometry(0.24, 0.34, 0.24), lantern, [2.2, 1.05, 0]).name = 'sakura-loading-bow-lantern';
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(2.6); glow.position.set(2.2, 1.25, 0);
  glow.name = 'sakura-loading-bow-lantern';
  boat.add(glow);
  parent.add(boat);
  return { boat, pole };
}

/** Three warm sky lanterns that climb, drift, fade and relaunch. */
function buildSkyLanterns(parent: THREE.Group, glowMat: THREE.SpriteMaterial, nightMats: NightMat[]) {
  const bodyMat = mat('#ffca8e', { emissive: '#ff9440' });
  nightMats.push({ m: bodyMat, base: 2 });
  const geo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
  const rand = seededRandom(6407);
  const spots: Array<[number, number]> = [[-13, -58], [7, -68], [20, -46]];
  return spots.map(([bx, bz], i) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, bodyMat));
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(2.8); glow.position.y = 0.1;
    g.add(glow);
    parent.add(g);
    return { g, x: bx + rand() * 6, z: bz + rand() * 8, speed: 0.32 + rand() * 0.2, off: i * 7.3 };
  });
}

/** Assemble the whole valley; the returned group owns every resource. */
export function buildSakura(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Sakura river · a boat journey';
  let voyageProgress = 0;
  group.userData.setVoyageProgress = (progress: number) => { voyageProgress = clamp(progress); };
  const nightMats: NightMat[] = [];
  // Water is owned by Experience's global reflector at y=0.04; an in-scene
  // Reflector would sit coplanar with it and z-fight every frame.
  // Banks with meandering shorelines and rising wooded slopes.
  const textureJobs: Promise<THREE.Texture>[] = [];
  const scannedTexture = (name: string, color: boolean, repeats: [number, number]) => {
    let resolve: (texture: THREE.Texture) => void = () => {};
    let reject: (error: unknown) => void = () => {};
    textureJobs.push(new Promise<THREE.Texture>((yes, no) => { resolve = yes; reject = no; }));
    const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/sakura/${name}.webp`, resolve, undefined, reject);
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeats); texture.anisotropy = 8;
    return texture;
  };
  const grass = new THREE.MeshStandardMaterial({ color: '#a8ad85',
    map: scannedTexture('leafy_grass_c', true, [52, 74]),
    normalMap: scannedTexture('leafy_grass_n', false, [52, 74]),
    normalScale: new THREE.Vector2(0.5, 0.5), roughness: 1,
  });
  for (const side of [-1, 1] as const) {
    const geo = new THREE.PlaneGeometry(104, 148, 30, 56); drape(geo, side * 58, -40);
    addMesh(group, geo, grass);
  }
  const trail = mat('#9a917c', { roughness: 1 });
  for (const [px, pw, pz, pl] of [[-26, 3.4, -26, 44], [27.5, 4.6, -41, 22]] as const) {
    const geo = new THREE.PlaneGeometry(pw, pl, 2, 24); drape(geo, px, pz, 0.05);
    addMesh(group, geo, trail);
  }
  // Fuji is one continuous volcanic flank: the snow line follows gullies instead of a second floating cone.
  const mountain = new THREE.ConeGeometry(54, 40, 72, 28, true);
  const mountainPosition = mountain.attributes.position;
  const mountainColors = new Float32Array(mountainPosition.count * 3);
  const rock = new THREE.Color('#76828f'), snow = new THREE.Color('#e6e9eb');
  for (let i = 0; i < mountainPosition.count; i++) {
    const x = mountainPosition.getX(i), y = mountainPosition.getY(i), z = mountainPosition.getZ(i);
    const a = Math.atan2(z, x), h = (y + 20) / 40;
    const ridge = (Math.sin(a * 13 + h * 3) * 0.025 + Math.sin(a * 23 - h * 2) * 0.015) * (1 - h);
    mountainPosition.setXYZ(i, x * (1 + ridge), y, z * (1 + ridge));
    const line = 0.76 + Math.sin(a * 11) * 0.026 + Math.sin(a * 19) * 0.018;
    const color = rock.clone().lerp(snow, clamp((h - line) / 0.035));
    color.multiplyScalar(0.94 + Math.sin(a * 13 + h * 3) * 0.045);
    color.toArray(mountainColors, i * 3);
  }
  mountain.setAttribute('color', new THREE.BufferAttribute(mountainColors, 3));
  mountain.computeVertexNormals();
  addMesh(group, mountain, mat('#ffffff', { vertexColors: true, roughness: 1 }), [10, 18, -180]);
  // Fog banks have soft extinction, not an opaque ellipsoid surface.
  const mistMaterial = new THREE.SpriteMaterial({ map: glowTexture(), color: '#dfe5df', opacity: 0.1, transparent: true, depthWrite: false });
  const mistBanks: THREE.Sprite[] = [];
  for (let i = 0; i < 7; i++) {
    const mist = new THREE.Sprite(mistMaterial);
    mist.position.set(-34 + i * 12, 3 + (i % 3), -101 - (i % 2) * 10);
    mist.scale.set(34, 7, 1); group.add(mist); mistBanks.push(mist);
  }
  // Original Sakura Fantasy old Somei Yoshino: real scaffold limbs and scanned blossom sprays.
  const palette = ['#f7eef2', '#f2c7d8', '#e79fc0'];
  const rand = seededRandom(7712);
  const groveSlots: Placement[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 21; i++) {
      const z = 13 - i * 4.6 + (rand() - 0.5) * 2.2;
      // Leave the bridge approaches and torii walk open; canopies lean toward the water.
      const offset = i % 3 === 0 ? 9 : 4.2;
      const x = side * (bankX(z) + offset + rand() * 1.8);
      if (Math.abs(z + 26) < 3.4) continue;
      groveSlots.push({ position: [x, bankHeight(x, z), z], rotationY: rand() * Math.PI * 2, scale: 0.95 + rand() * 0.27 });
    }
  }
  const grove = buildSakuraGrove(group, groveSlots);
  // Petal rain down the river corridor plus a drifting layer on the water.
  const petals = petalField({ count: 1600, area: [60, 26, 110], origin: [0, 0.12, -20], size: [0.16, 0.11], colors: palette, fall: 0.7, sway: 1.4, spin: 2 });
  const drift = petalField({ count: 240, area: [56, 0.2, 112], origin: [0, 0.1, -24], size: [0.2, 0.13], colors: ['#f2c7d8', '#e79fc0'], fall: 0.02, sway: 0.4, spin: 0.5, opacity: 0.8 });
  group.add(petals, drift);
  // Forest mass, shore reeds and waterline pebbles for depth and texture.
  const rand2 = seededRandom(3301);
  const trees: Placement[] = [];
  for (let i = 0; i < 84; i++) {
    const side = i % 2 ? 1 : -1, x = side * (44 + rand2() * 34), z = -96 + rand2() * 124, h = 9 + rand2() * 8;
    trees.push({ position: [x, bankHeight(x, z), z], scale: [h / 15, h / 18, h / 15] });
  }
  const forest = buildSakuraForest(group, trees);
  const assetsReady = Promise.all([grove.ready, forest.ready, ...textureJobs]);
  assetsReady.catch(error => { group.userData.sakuraAssetError = String(error); });
  group.userData.sakuraAssetsReady = assetsReady;
  const reeds: Placement[] = [];
  const stones: Placement[] = [];
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1, z = 24 - rand2() * 100, x = side * (bankX(z) + 0.4 + rand2() * 1.6);
    reeds.push({ position: [x, bankHeight(x, z) + 0.5, z], tilt: (rand2() - 0.5) * 0.3 });
    if (i >= 40) continue;
    const sx = side * (bankX(z) - 0.5 + rand2() * 1.4);
    stones.push({ position: [sx, bankHeight(sx, z) + 0.05, z], rotationY: rand2() * 6.28, scale: 0.18 + rand2() * 0.3 });
  }
  scatterInstanced(group, new THREE.ConeGeometry(0.045, 1.1, 5), mat('#5c6b45'), reeds);
  scatterInstanced(group, new THREE.DodecahedronGeometry(1, 0), mat('#7e7b70', { roughness: 1 }), stones);
  const red = mat('#c23a2c', { roughness: 0.58 });
  buildToriiLane(group, red);
  buildStoneLanterns(group, nightMats);
  buildBridge(group, red);
  buildTown(group, nightMats);
  buildPagoda(group);
  // Fox fire: cold green will-o'-wisps that only wake after dusk.
  const foxFire = particleField({ count: 46, area: [86, 5, 108], origin: [0, 1.4, -30], color: '#5ff0d2', size: 0.15, additive: true, opacity: 0.1, twinkle: 1, sizeJitter: 0.8 });
  const townGlow = particleField({ count: 40, area: [26, 5, 26], origin: [33, 3, -41], color: '#ffb066', size: 0.5, additive: true, opacity: 0.05, sizeJitter: 0.9 });
  const pathGlow = particleField({ count: 30, area: [7, 4, 40], origin: [-26, 2.2, -26], color: '#ffab5e', size: 0.42, additive: true, opacity: 0.05, sizeJitter: 0.9 });
  group.add(foxFire, townGlow, pathGlow);
  // Two warm night lights: the town street and the lake torii.
  const streetLight = new THREE.PointLight('#ffb066', 0, 46, 2);
  const lakeLight = new THREE.PointLight('#ff9d5c', 0, 60, 2);
  streetLight.position.set(34, 5.5, -41); lakeLight.position.set(0, 6, -83); group.add(streetLight, lakeLight);
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb066', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const { boat, pole } = buildBoat(group, glowMat, nightMats);
  const originalBoat = installSakuraBoat(group, boat);
  group.userData.setQuality = (quality: 'low' | 'balanced' | 'high') => {
    grove.setQuality(quality);
    // Retain all photographed flower clusters; trim only rain particles and sub-pixel timber.
    (petals.geometry as THREE.InstancedBufferGeometry).instanceCount = quality === 'high' ? 1600 : quality === 'balanced' ? 1000 : 560;
    (drift.geometry as THREE.InstancedBufferGeometry).instanceCount = quality === 'high' ? 240 : quality === 'balanced' ? 160 : 100;
  };
  const skyLanterns = buildSkyLanterns(group, glowMat, nightMats);
  // Per-frame life: petals, the cruise, lantern heat, rising sky lanterns.
  registerUpdate(group, (t, night) => {
    grove.update(t);
    forest.update(t);
    mistBanks.forEach((mist, i) => { mist.position.x = -34 + i * 12 + Math.sin(t * 0.025 + i) * 3; });
    mistMaterial.opacity = 0.1 - night * 0.05;
    (petals.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (drift.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    const heat = 0.04 + night * 1.4;
    for (const { m, base } of nightMats) m.emissiveIntensity = base * heat;
    streetLight.intensity = night * 2.6;
    lakeLight.intensity = night * 1.9;
    glowMat.opacity = night * 0.75;
    const foxUniforms = (foxFire.material as THREE.ShaderMaterial).uniforms;
    foxUniforms.uOpacity.value = 0.05 + night * 0.5; foxUniforms.uTime.value = t;
    (townGlow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (pathGlow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (townGlow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.04 + night * 0.4;
    (pathGlow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.04 + night * 0.4;
    const voyage = sampleSakuraVoyage(voyageProgress, t);
    boat.position.set(...voyage.boatPosition);
    boat.rotation.set(...voyage.boatRotation);
    pole.rotation.y = Math.sin(t * 1.6) * 0.3;
    originalBoat.update(t, night);
    // Sky lanterns climb, wander sideways and shrink out before relaunching.
    for (const l of skyLanterns) {
      const y = 9 + ((t * l.speed + l.off) % 22);
      l.g.position.set(l.x + Math.sin((t + l.off) * 0.12) * 2.6, y, l.z + Math.cos((t + l.off) * 0.09) * 2.2);
      l.g.scale.setScalar(Math.max(clamp((31 - y) / 6), 0.001));
    }
  });
  return group;
}
