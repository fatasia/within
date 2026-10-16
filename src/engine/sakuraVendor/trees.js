// Adapted from Sakura Fantasy, Copyright (c) 2026 Bill Chan. MIT.
// See public/assets/sakura/LICENSE and docs/sakura-reference.md.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { rng, clamp } from './math.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

function randUnit(R) {
  const u = R.range(-1, 1), a = R.next() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return V(Math.cos(a) * s, u, Math.sin(a) * s);
}


function bough(R, p0, dir, len, steps, sag, wander) {
  const pts = [p0.clone()];
  const d = dir.clone().normalize();
  const p = p0.clone();
  const turn = V();
  for (let i = 0; i < steps; i++) {
    turn.multiplyScalar(0.55).addScaledVector(randUnit(R), wander);
    d.add(turn).addScaledVector(UP, (-sag * 2 * (i + 1)) / (steps * steps)).normalize();
    p.addScaledVector(d, len / steps);
    pts.push(p.clone());
  }
  return { pts, dir: d };
}

// the blossom atlas, rendered from a photoscanned Somei Yoshino cluster: three sprays whose twig enters the card at a
// known point on its left edge ([cell, u, v]), and one dense mass for the inside of a lobe. The cell rides in the
// quarter of aAux.y, so the per-card hash the shader takes from it stays random.
const SPRAYS = [[0, 0.0656, 0.4547], [1, 0.0847, 0.3456], [3, 0.0431, 0.2629]];
const MASS = 2;

// a spray whose painted twig carries on from the real one at p along d; it faces out of the crown as far as the twig's
// line allows, twisted at random, and mirrored half the time
function sprayCard(R, p, d, h, out, lobe, sprays = SPRAYS) {
  const [cell, ub, vb] = R.pick(sprays);
  const T = d.clone().normalize();
  const N = out.clone().addScaledVector(randUnit(R), 0.9);
  N.addScaledVector(T, -N.dot(T));
  if (N.lengthSq() < 1e-4) N.copy(randUnit(R)).addScaledVector(T, -T.dot(N));
  N.normalize();
  const B = V().crossVectors(N, T);
  if (R.next() < 0.5) B.negate();
  const c = p.clone().addScaledVector(T, -(2 * ub - 1) * h).addScaledVector(B, -(2 * vb - 1) * h);
  return { c, T, B, h, cell, lobe };
}

function massCard(R, p, h, out, lobe) {
  const N = out.clone().addScaledVector(randUnit(R), 0.6).normalize();
  const T = V().crossVectors(N, randUnit(R)).normalize();
  const B = V().crossVectors(N, T);
  return { c: p.clone(), T, B, h, cell: MASS, lobe };
}


function emitBlossom(leaf, R, cards, cells = 4) {
  const C = V();
  for (const k of cards) C.add(k.c);
  C.multiplyScalar(1 / cards.length);
  let rxz = 0, ry = 0;
  for (const k of cards) { rxz = Math.max(rxz, Math.hypot(k.c.x - C.x, k.c.z - C.z)); ry = Math.max(ry, Math.abs(k.c.y - C.y)); }
  const lobes = new Map();
  for (const k of cards) {
    if (!lobes.has(k.lobe)) lobes.set(k.lobe, { c: V(), n: 0, r: 0 });
    const l = lobes.get(k.lobe);
    l.c.add(k.c); l.n++;
  }
  for (const l of lobes.values()) l.c.multiplyScalar(1 / l.n);
  for (const k of cards) { const l = lobes.get(k.lobe); l.r = Math.max(l.r, k.c.distanceTo(l.c)); }
  const e = V(), lo = V();
  for (const k of cards) {
    const l = lobes.get(k.lobe);
    e.set((k.c.x - C.x) / rxz, (k.c.y - C.y) / Math.max(ry, 0.5), (k.c.z - C.z) / rxz);
    const crownShell = clamp(e.length(), 0, 1);
    lo.subVectors(k.c, l.c);
    const lobeShell = clamp(lo.length() / Math.max(l.r, 0.3), 0, 1);
    const shade = e.normalize().multiplyScalar(0.6).addScaledVector(lo.normalize(), 0.5).addScaledVector(UP, 0.45).normalize();
    const shell = clamp(0.1 + 0.55 * crownShell + 0.45 * lobeShell, 0, 1);
    leaf.card(k.c, k.T, k.B, k.h, shade, [shell, (k.cell + R.next() * 0.999) / cells]);
  }
}

// sakura: an old Somei Yoshino. A short trunk flaring into its roots parts low into a few scaffold limbs that climb,
// spread and sag under their own weight; their twigs carry the blossom, so the crown is lobes of cumulus with sky
// between them, and in winter a fine net of twigs
export function sakura(seed, lod = false) {
  const R = rng(seed);
  const wood = new Builder(), leaf = new Builder(2);
  leaf.withCtr = true;
  if (lod) { wood.minR = lod === 2 ? 0.07 : 0.03; wood.lodSides = true; }
  const lean = V(R.range(-0.15, 0.15), 1, R.range(-0.15, 0.15)).normalize();
  const r0 = R.range(0.2, 0.25);
  const tr = bough(R, V(0, -0.25, 0), lean, R.range(1.5, 2.0), 6, 0, 0.035);
  wood.tube(tr.pts, tr.pts.map((_, i) => r0 * (i === 0 ? 1.5 : i === 1 ? 1.12 : 1 - i * 0.035)), 12, 1.4, null, true);
  // buttress roots run out from the foot and dive into the ground
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + R.range(-0.3, 0.3);
    const b = bough(R, V(0, 0.3, 0), V(Math.cos(a), -0.6, Math.sin(a)), R.range(0.75, 1.05), 3, 0.25, 0.04);
    wood.tube(b.pts, b.pts.map((_, i) => r0 * 0.55 * (1 - i * 0.24)), 6, 1.2);
  }
  const cards = [];
  let lobeId = 0;
  const STEPS = [9, 6, 4, 2], SIDES = [8, 6, 4, 3], SAG = [0.55, 0.5, 0.3, 0.05], WANDER = [0.05, 0.07, 0.09, 0.12];
  const grow = (p, dir, len, r, depth, lobe) => {
    const b = bough(R, p, dir, len, STEPS[depth], SAG[depth], WANDER[depth]);
    const n = b.pts.length - 1;
    const rad = b.pts.map((_, i) => r * (1 - (i / n) * (depth === 3 ? 0.4 : 0.55)));
    wood.tube(b.pts, rad, SIDES[depth], 1.4, null, true);
    if (depth === 1) lobe = lobeId++;
    if (depth < 3) {
      const nc = depth === 0 ? R.int(4, 5) : R.int(3, 5);
      for (let k = 0; k < nc; k++) {
        // the first shoot carries the limb on from its end, as thick as the end, so no limb stops in a cut stub
        const cont = k === 0;
        const t = depth === 0 ? R.range(0.3, 1) : R.range(0.25, 1);
        const i = cont ? n : Math.min(n, Math.max(1, Math.round(t * n)));
        const pd = b.pts[Math.min(n, i + 1)].clone().sub(b.pts[i - 1]).normalize();
        const side = randUnit(R);
        side.addScaledVector(pd, -side.dot(pd)).normalize();
        // side shoots leave at 35-60 degrees and turn up toward the light
        const nd = pd.clone().addScaledVector(side, cont ? R.range(0.2, 0.4) : R.range(0.7, 1.4)).add(V(0, depth === 0 ? 0.15 : 0.35, 0)).normalize();
        const cl = depth === 2 ? R.range(0.32, 0.55) : len * (depth === 0 ? R.range(0.48, 0.62) : R.range(0.42, 0.58));
        grow(b.pts[i], nd, cl, cont ? rad[n] * 0.95 : Math.max(0.006, rad[i] * 0.62), depth + 1, lobe);
      }
    }
    if (depth >= 2) {
      const out = V(b.pts[n].x, 0, b.pts[n].z).normalize().add(V(0, 0.35, 0)).normalize();
      // sprays along the twig, each leaving on its own spur, and one carrying on from the tip
      const ns = depth === 3 ? 3 : 2;
      for (let k = 0; k < ns; k++) {
        const t = depth === 3 ? (k + R.range(0.1, 0.9)) / ns : R.range(0.45, 1);
        const i = Math.min(n - 1, Math.floor(t * n));
        const p = b.pts[i].clone().lerp(b.pts[i + 1], t * n - i);
        const td = b.pts[i + 1].clone().sub(b.pts[i]).normalize();
        const sd = td.clone().addScaledVector(randUnit(R), 0.75).normalize();
        cards.push(sprayCard(R, p, sd, R.range(0.27, 0.34), out, lobe));
      }
      if (depth === 3) cards.push(sprayCard(R, b.pts[n], b.dir.clone().addScaledVector(randUnit(R), 0.3), R.range(0.28, 0.34), out, lobe));
      else {
        // the dense middle of a lobe, so it reads as a mass and not a lace
        for (let k = 0; k < 4; k++) {
          const p = b.pts[R.int(1, n)].clone().addScaledVector(out, R.range(0.05, 0.3)).addScaledVector(randUnit(R), 0.18);
          cards.push(massCard(R, p, R.range(0.26, 0.32), out, lobe));
        }
      }
    }
  };
  const nS = R.int(4, 5);
  const top = tr.pts.length - 1;
  for (let k = 0; k < nS; k++) {
    const a = (k / nS) * Math.PI * 2 + R.range(-0.35, 0.35);
    const elev = R.range(0.6, 0.95);
    const at = tr.pts[top - (k % 2)];
    grow(at, V(Math.cos(a) * Math.cos(elev), Math.sin(elev), Math.sin(a) * Math.cos(elev)), R.range(3.3, 4.0), r0 * 0.66, 0, -1);
  }
  emitBlossom(leaf, R, cards);
  return { wood: wood.build(), leaf: leaf.build() };
}


function limb(R, p0, dir, len, steps, pull, wander) {
  const pts = [p0.clone()];
  const d = dir.clone();
  const p = p0.clone();
  for (let i = 0; i < steps; i++) {
    d.add(pull.clone().multiplyScalar(1 / steps)).add(randUnit(R).multiplyScalar(wander)).normalize();
    p.addScaledVector(d, len / steps);
    pts.push(p.clone());
  }
  return { pts, dir: d };
}


const SUGI_BASE = [0.0429, 0.7143];
// a conifer card: its painted twig carries on from p along T, the foliage kept upright (needles and fronds have an up),
// rolled about T by `roll` from vertical
function conCard(p, T, roll, h, cell, [ub, vb], lobe) {
  T = T.clone().normalize();
  const perp = V().crossVectors(T, UP);
  if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0);
  perp.normalize();
  const N = perp.multiplyScalar(Math.cos(roll)).addScaledVector(UP, Math.sin(roll)).normalize();
  const B = V().crossVectors(N, T).normalize();
  if (B.y < 0) B.negate();
  B.multiplyScalar(0.5);
  const c = p.clone().addScaledVector(T, -(2 * ub - 1) * h).addScaledVector(B, -(2 * vb - 1) * h);
  return { c, T, B, h, cell, lobe };
}

// shading for blossom cards: each lobe of the crown is lit as its own cumulus, set into the crown's overall dome;
// aux.x is how far out a card sits (inner cards fall into shade), aux.y the cell plus a random hash

export function cedar(seed, lod = false) {
  const R = rng(seed);
  const wood = new Builder(), leaf = new Builder(2);
  leaf.withCtr = true;
  if (lod) { wood.minR = lod === 2 ? 0.07 : 0.03; wood.lodSides = true; }
  const H = 18;
  const tr = limb(R, V(), V(R.range(-0.03, 0.03), 1, R.range(-0.03, 0.03)).normalize(), H, 8, V(), 0.02);
  // the leader thins to a whip inside the spire, so no bare pole stands above the foliage
  wood.tube(tr.pts, tr.pts.map((_, i) => 0.37 * Math.pow(1 - i / 8.6, 1.2) + 0.012), 7, 2.0);
  const at = (y) => {
    const f = clamp(y / H, 0, 1) * 8, i = Math.min(7, Math.floor(f));
    return tr.pts[i].clone().lerp(tr.pts[i + 1], f - i);
  };
  const cards = [];
  const crownBase = R.range(3.5, 5.5);
  let a = R.next() * Math.PI * 2, lobe = 0;
  for (let y = crownBase; y < H - 0.4; y += R.range(0.2, 0.28)) {
    const t = (y - crownBase) / (H - crownBase);
    const reach = Math.pow(1 - t, 0.9) * R.range(2.0, 2.6) + 0.45;
    a += 2.39996 + R.range(-0.25, 0.25);
    const d = V(Math.cos(a), R.range(-0.2, 0.05) + t * 0.35, Math.sin(a)).normalize();
    const b = bough(R, at(y), d, reach, 3, 0.2 + 0.25 * (1 - t), 0.06);
    if (reach > 0.8) wood.tube(b.pts, b.pts.map((_, i) => (0.055 * (1 - t) + 0.015) * (1 - i * 0.25)), 3, 1);
    // fronds crowd the bough in layers: one level, one rolled up, one rolled down at every station, so from any side
    // the bough reads as a dense, feathery mass
    const n = Math.max(1, Math.round(reach / 0.32));
    for (let k = 0; k < n; k++) {
      const f = ((k + R.range(0.2, 0.9)) / n) * 3;
      const i = Math.min(2, Math.floor(f));
      const q = b.pts[i].clone().lerp(b.pts[i + 1], f - i);
      const seg = b.pts[i + 1].clone().sub(b.pts[i]).normalize();
      const h = R.range(0.6, 0.78) * (0.65 + 0.35 * (1 - t));
      for (const roll of [R.range(-0.25, 0.25), R.range(0.6, 0.95), -R.range(0.6, 0.95)]) {
        const sw = R.range(-0.75, 0.75);
        const T = V(seg.x * Math.cos(sw) - seg.z * Math.sin(sw), seg.y + R.range(-0.12, 0.05), seg.x * Math.sin(sw) + seg.z * Math.cos(sw)).normalize();
        cards.push(conCard(q, T, roll, h * R.range(0.85, 1.05), 2 + R.int(0, 1), SUGI_BASE, lobe));
      }
    }
    lobe++;
  }
  // the spire
  for (let k = 0; k < 8; k++) {
    const aa = (k / 8) * Math.PI * 2;
    const T = V(Math.cos(aa) * 0.45, 1, Math.sin(aa) * 0.45).normalize();
    cards.push(conCard(at(H - 0.95 - k * 0.14), T, R.range(-0.3, 0.3), 0.66, 2 + (k % 2), SUGI_BASE, lobe));
  }
  emitBlossom(leaf, R, cards);
  return { wood: wood.build(), leaf: leaf.build() };
}

// bamboo: a tall thin culm leaning slightly, its branches rising from the nodes of its upper half, each a spray of
// drooping leaf fans from the bamboo atlas (the twig enters at BAMBOO_SPRAY's base)
