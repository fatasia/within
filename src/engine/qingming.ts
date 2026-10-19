import { buildQingmingAirLife } from './qingmingAirLife';
import { installQingmingSurfaceLight } from './qingmingSurfaceLight';
import * as THREE from 'three';
import { buildQingmingBridgeMarket } from './qingmingBridgeMarket';
import { buildQingmingGateRoof } from './qingmingGateRoof';
import { createQingmingMaterials } from './qingmingRendering';
import { buildQingmingMerchantHallSteps } from './qingmingMerchantHall';
import { buildQingmingNarrativeSteps } from './qingmingNarrative';
import { buildQingmingNightLife, type QingmingLightSite } from './qingmingNightLife';
import { buildQingmingQuartersSteps, QINGMING_QUARTERS } from './qingmingQuarters';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Painting } from '../types';
import { seededRandom } from './math';
import { boat } from './props';
import { curveRod, rod } from './modelGeometry';
import {
  roofGeometry,
  roofTilesGeometry,
  roofGableGeometry,
  roofSurfaceY,
  type RoofProfile,
} from './qingmingRoof';
import { buildQingmingShopFront } from './qingmingCommerce';
import { buildQingmingDailyLife } from './qingmingDailyLife';
import { buildQingmingRiverCraft } from './qingmingRiverCraft';
import { disposeObject } from './resources';
import { batchQingmingSteps } from './qingmingBatch';
import { buildQingmingLife, prepareQingmingBoats } from './qingmingLife';
import { featuredUpdate, registerUpdate } from './featuredShared';
import { buildQingmingEpisodes, rammedWallSegment } from './qingmingEpisodes';
import { prepareQingmingTransportSteps } from './qingmingTransport';
import {
  buildQingmingScrollSteps,
  QINGMING_SCROLL_FOCI,
  QINGMING_RURAL_HOUSES,
} from './qingmingScroll';
import {
  clothCanopy,
  potteryJar,
  qingmingCitizen,
  qingmingPassageBoat,
  wovenBasket,
} from './qingmingDetails';

import {
  cityGround,
  qingmingRiver,
  qingmingBridgeHeight,
  qingmingMainStreet,
  qingmingRiverTangent,
} from './cityLayout';
export { qingmingRiver, qingmingBridgeHeight } from './cityLayout';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);

/** Hand-built Song street sections, batched by material after placement. */
export function buildQingming(painting: Painting): THREE.Group {
  const steps = buildQingmingSteps(painting);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

export function* buildQingmingSteps(painting: Painting): Generator<void, THREE.Group> {
  const city = new THREE.Group();
  const mat = createQingmingMaterials();
  const random = seededRandom(painting.seed);
  const wood = mat('#736051', 'wood'),
    dark = mat('#494238', 'wood'),
    plaster = mat('#d9d2c2', 'plaster');
  const tile = mat('#555e5b', 'tile'),
    tileLight = mat('#6a726c', 'tile'),
    stone = mat('#94958b', 'stone');
  const earth = mat('#9f9787', 'earth'),
    linen = mat('#c5bdab', 'plaster'),
    red = mat('#775951', 'plaster');
  const leaf = mat('#697555', 'plaster'),
    leafDark = mat('#4b624a', 'plaster'),
    skin = mat('#ba926b', 'plaster');
  const blue = mat('#526d6a', 'plaster'),
    ochre = mat('#a58b59', 'plaster');
  const glow = new THREE.MeshStandardMaterial({
    color: '#d9b36e',
    emissive: '#ffb158',
    emissiveIntensity: 1.1,
    roughness: 1,
  });
  const streetMaterials = {
    wood,
    dark,
    linen,
    earth: mat('#a09782', 'earth'),
    stone,
    blue,
    clay: red,
    skin,
  };
  const lightSites: QingmingLightSite[] = [];
  const signGeometry: THREE.BufferGeometry[] = [];
  const shopInventory: { kind: string; position: number[] }[] = [];
  const box = (g: THREE.Group, size: Point, p: Point, m: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
    mesh.position.set(...p);
    g.add(mesh);
    return mesh;
  };
  const beam = (g: THREE.Group, a: Point, b: Point, r = 0.09, m: THREE.Material = wood) => {
    const mesh = rod(g, v(a), v(b), r, m, 1, 5);
    // Thin attached beams do not need hidden end-cap triangles.
    if (r < 0.1) {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.CylinderGeometry(r, r, v(a).distanceTo(v(b)), 5, 1, true);
    }
    return mesh;
  };

  function roof(g: THREE.Group, w: number, d: number, y: number, h: number, detail = true) {
    const profile: RoofProfile = { width: w, depth: d, base: y - 0.2, rise: h, detailed: detail };
    const roofMat = tile.clone();
    roofMat.side = THREE.DoubleSide;
    const surface = new THREE.Mesh(roofGeometry(profile), roofMat);
    surface.name = 'qingming-roof-surface';
    g.add(surface);
    const tiles = new THREE.Mesh(roofTilesGeometry(profile), tileLight);
    tiles.name = 'qingming-roof-cover-tiles';
    g.add(tiles);
    beam(g, [-w / 2, y - 0.2 + h + 0.08, 0], [w / 2, y - 0.2 + h + 0.08, 0], 0.1, tileLight);
    // A continuous fascia underneath each eave, not freestanding disks above it.
    for (const side of [-1, 1]) {
      curveRod(
        g,
        Array.from({ length: 9 }, (_, i) => {
          const x = (i / 8 - 0.5) * w;
          const z = (side * d) / 2;
          return v([x, roofSurfaceY(profile, x, z) - 0.065, z]);
        }),
        0.055,
        dark,
        8,
      );
    }
    return profile;
  }

  function sign(g: THREE.Group, x: number, y: number, z: number, index: number) {
    box(g, [2, 0.68, 0.13], [x, y, z], dark);
    const geo = new THREE.PlaneGeometry(1.85, 0.52);
    const uv = geo.attributes.uv!;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i), (uv.getY(i) + (7 - (index % 8))) / 8);
    geo.translate(x, y, z + 0.071);
    g.updateMatrixWorld(true);
    geo.applyMatrix4(g.matrixWorld);
    signGeometry.push(geo);
  }

  function house(x: number, z: number, w: number, d: number, tall: boolean, facing = 0, index = 0) {
    const g = new THREE.Group();
    // Anchor the complete house (including its roof) to the local bank height.
    // The riverbanks are not perfectly level, so a fixed 2.8m lift makes roofs
    // visibly float when a house crosses the shore transition.
    g.position.set(x, cityGround(x, z), z);
    g.rotation.y = facing;
    city.add(g);
    const h = tall ? 6.4 : 3.9;
    const hero = Math.abs(x + 20) < 27;
    const openShop = z > -60 && x > -66;
    const lightSite = (
      px: number,
      py: number,
      pz: number,
      kind: QingmingLightSite['kind'],
      size?: [number, number],
    ) => {
      lightSites.push({
        position: [
          x + Math.cos(facing) * px + Math.sin(facing) * pz,
          g.position.y + py,
          z - Math.sin(facing) * px + Math.cos(facing) * pz,
        ],
        yaw: facing,
        kind,
        size,
      });
    };
    if (openShop) {
      for (const side of index % 3 === 0 ? [-1, 1] : [index % 2 ? -1 : 1]) {
        lightSite(side * w * 0.36, 3.1, d / 2 + 0.9, 'lantern');
        beam(g, [side * w * 0.36, 3.65, d / 2], [side * w * 0.36, 3.65, d / 2 + 0.9], 0.035, dark);
      }
    }
    if (tall)
      for (let j = -1; j <= 1; j++)
        lightSite(j * w * 0.29, 4.6, d / 2 + 0.025, 'window', [w * 0.215, 1.17]);

    box(g, [w + 0.5, 0.3, d + 0.45], [0, 0.15, 0], stone);
    if (openShop) {
      // Real recessed storefront, not a door painted onto a solid building.
      box(g, [w - 0.3, h, 0.2], [0, h / 2 + 0.3, -d / 2 + 0.25], plaster);
      for (const side of [-1, 1])
        box(g, [0.2, h, d - 0.3], [side * (w / 2 - 0.25), h / 2 + 0.3, 0], plaster);
      box(
        g,
        [w - 0.3, Math.max(0.3, h - 2.5), 0.18],
        [0, 2.8 + Math.max(0.3, h - 2.5) / 2, d / 2 - 0.12],
        plaster,
      );
      box(g, [w - 0.5, 0.08, d - 0.5], [0, 0.34, 0], earth);
      box(g, [w - 0.5, 0.12, d - 0.5], [0, 2.82, 0], wood);
      const furnishing = buildQingmingShopFront(index, w - 0.65, d - 0.15, streetMaterials);
      furnishing.position.y = 0.38;
      g.add(furnishing);
      shopInventory.push({ kind: furnishing.userData.shopKind, position: [x, z] });
      for (const side of [-1, 1]) {
        const shutter = box(
          g,
          [0.42, 2.28, 0.09],
          [side * (w / 2 - 0.56), 1.5, d / 2 + 0.14],
          wood,
        );
        shutter.rotation.y = side * 0.5;
      }
    } else box(g, [w - 0.3, h, d - 0.3], [0, h / 2 + 0.3, 0], plaster);
    for (const s of [-1, 1])
      for (const q of [-1, 1])
        box(g, [0.18, h, 0.18], [s * (w / 2 - 0.12), h / 2 + 0.3, q * (d / 2 - 0.12)], wood);
    box(g, [w, 0.16, 0.18], [0, 3.1, d / 2], wood);
    box(g, [w, 0.11, 0.1], [0, 2.9, -d / 2], wood);
    for (const s of [-1, 1]) {
      box(g, [0.13, h, 0.12], [s * w * 0.23, h / 2 + 0.3, -d / 2], wood);
      box(g, [1.05, 0.85, 0.06], [s * w * 0.24, 2.15, -d / 2 - 0.04], dark);
      for (let k = -2; k <= 2; k++)
        box(g, [0.04, 0.85, 0.04], [s * w * 0.24 + k * 0.2, 2.15, -d / 2 - 0.09], linen);
    }
    for (let j = 0; j < 3; j++) {
      const xx = (j - 1) * w * 0.29;
      if (!openShop) box(g, [w * 0.23, 1.8, 0.04], [xx, 1.35, d / 2], j === 1 ? dark : wood);
      if (j !== 1 && !openShop)
        for (let k = -2; k <= 2; k++)
          box(g, [0.045, 1.5, 0.05], [xx + k * w * 0.035, 1.45, d / 2 + 0.05], linen);
      if (tall) {
        box(g, [w * 0.22, 1.2, 0.04], [xx, 4.6, d / 2], dark);
        for (let k = -2; k <= 2; k++)
          box(g, [0.055, 1.3, 0.06], [xx + k * w * 0.04, 4.6, d / 2 + 0.08], dark);
        box(g, [w * 0.25, 0.08, 0.06], [xx, 4.6, d / 2 + 0.08], dark);
      }
    }
    // Seat the roof against the actual wall edge, not its lower, overhanging eave.
    // Otherwise the wall cap cuts a bright horizontal line through the shallow slope.
    const roofHeight = w * 0.34;
    const wallT = (d - 0.3) / (d + 1.5);
    const roofBase = h + 0.365 - roofHeight * (1 - wallT + 0.23 * wallT ** 4);
    const mainRoof = roof(g, w + 1.3, d + 1.5, roofBase + 0.2, roofHeight, hero);
    const gable = new THREE.Mesh(roofGableGeometry(mainRoof, w - 0.3, d - 0.3, h + 0.3), plaster);
    gable.name = 'qingming-roof-gable';
    g.add(gable);
    if (tall) {
      roof(g, w + 1.3, 2.4, 3.05, 0.55, hero);
      box(g, [w + 0.6, 0.15, 1], [0, 3.5, d / 2 + 0.25], wood);
      for (let i = 0; i < 11; i++)
        box(g, [0.065, 0.7, 0.065], [(i / 10 - 0.5) * w, 3.9, d / 2 + 0.7], wood);
      box(g, [w + 0.2, 0.09, 0.08], [0, 4.25, d / 2 + 0.7], wood);
    }
    const awning = box(g, [w - 0.7, 0.09, 2.5], [0, 2.9, d / 2 + 0.85], index % 3 ? linen : blue);
    awning.rotation.x = 0.1;
    if (openShop) {
      // A few folds and a hanging edge replace the rigid solid awning slab.
      g.remove(awning);
      awning.geometry.dispose();
      const fabric = (index % 3 ? linen : blue).clone();
      fabric.side = THREE.DoubleSide;
      const geo = new THREE.PlaneGeometry(w - 0.7, 2.5, 8, 2);
      const p = geo.getAttribute('position');
      for (let j = 0; j < p.count; j++) {
        const xx = p.getX(j),
          zz = p.getY(j);
        p.setXYZ(
          j,
          xx,
          2.95 - Math.cos((xx / (w - 0.7)) * Math.PI) * 0.12 - zz * 0.075,
          d / 2 + 0.85 + zz,
        );
      }
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, fabric));
      const trim = new THREE.PlaneGeometry(w - 0.7, 0.25, 8, 1);
      const tp = trim.getAttribute('position');
      for (let j = 0; j < tp.count; j++) tp.setZ(j, Math.sin(tp.getX(j) * 7) * 0.025);
      trim.computeVertexNormals();
      const edge = new THREE.Mesh(trim, fabric);
      edge.position.set(0, 2.69, d / 2 + 2.1);
      g.add(edge);
    }
    for (const s of [-1, 1])
      beam(g, [s * (w / 2 - 0.5), 0, d / 2 + 1.9], [s * (w / 2 - 0.5), 2.9, d / 2 + 1.9]);
    sign(g, 0, tall ? 5.9 : 3.2, d / 2 + 0.15, index);
    // Warm lantern pools separate the timber frontage from the cool Song-night street.
    if (tall || index % 4 === 0) {
      const lamp = new THREE.PointLight('#ff9a43', tall ? 1.45 : 0.72, tall ? 12 : 7, 2);
      lamp.position.set(0, tall ? 4.55 : 2.55, d / 2 + 0.28);
      lamp.castShadow = false;
      g.add(lamp);
    }
    if (hero && !openShop) {
      // Street-level construction: stone footings, beam shoulders and diagonal brackets.
      for (const side of [-1, 1]) {
        const xx = side * (w / 2 - 0.38);
        box(g, [0.52, 0.18, 0.52], [xx, 0.39, d / 2 + 0.3], stone);
        beam(g, [xx, 0.48, d / 2 + 0.3], [xx, 3.2, d / 2 + 0.3], 0.12);
        box(g, [0.7, 0.15, 0.28], [xx, 3.1, d / 2 + 0.3], wood);
        beam(g, [xx, 2.65, d / 2 + 0.3], [xx - side * 0.48, 3.18, d / 2 + 0.3], 0.07);
        box(g, [0.7, 0.12, 0.4], [side * 0.68, 0.38, d / 2 + 0.55], stone);
      }
      // Open shutters fold beside the recessed doorway; no texture-painted fake openings.
      for (const side of [-1, 1]) {
        const shutter = new THREE.Group();
        shutter.position.set(side * 0.86, 0.4, d / 2 + 0.12);
        shutter.rotation.y = side * 0.55;
        g.add(shutter);
        box(shutter, [0.55, 1.95, 0.055], [side * 0.27, 0.98, 0], wood);
        for (let k = 0; k < 7; k++)
          box(shutter, [0.48, 0.035, 0.075], [side * 0.27, 0.15 + k * 0.27, 0.045], dark);
        for (let k = 0; k < 4; k++)
          box(g, [w * 0.23, 0.035, 0.06], [side * w * 0.29, 0.8 + k * 0.29, d / 2 + 0.07], linen);
      }
      for (let i = 0; i < 17; i++) {
        const xx = (i / 16 - 0.5) * (w + 0.7);
        const innerZ = d / 2 - 0.05,
          outerZ = d / 2 + 0.68;
        beam(
          g,
          [xx, roofSurfaceY(mainRoof, xx, innerZ) - 0.14, innerZ],
          [xx, roofSurfaceY(mainRoof, xx, outerZ) - 0.14, outerZ],
          0.045,
        ).name = 'qingming-eave-rafter';
      }
      // Replace the rigid awning board with sagging woven cloth and a loose valance.
      g.remove(awning);
      awning.geometry.dispose();
      const clothMat = (index % 3 ? linen : blue).clone();
      clothMat.side = THREE.DoubleSide;
      const canopy = clothCanopy(w - 0.7, 2.5, clothMat);
      canopy.position.set(0, 3.04, d / 2 + 0.85);
      g.add(canopy);
      const valance = new THREE.PlaneGeometry(w - 0.7, 0.34, 20, 2);
      const vp = valance.attributes.position!;
      for (let j = 0; j < vp.count; j++) vp.setZ(j, Math.sin(vp.getX(j) * 14) * 0.035);
      valance.computeVertexNormals();
      const clothEdge = new THREE.Mesh(valance, clothMat);
      clothEdge.position.set(0, 2.69, d / 2 + 2.1);
      g.add(clothEdge);
      // The fabric merchant displays cloth, while food and wine shops keep earthenware.
      const basket = wovenBasket(0.35, 0.46, ochre);
      basket.position.set(w * 0.31, 0.31, d / 2 + 0.9);
      g.add(basket);
      for (let k = 0; k < 3; k++) {
        if (index % 8 === 4) {
          box(
            g,
            [0.95, 0.12, 0.6],
            [-w * 0.23, 0.38 + k * 0.13, d / 2 + 0.8],
            k % 2 ? blue : linen,
          );
          for (let j = 0; j < 3; j++)
            box(
              g,
              [0.015, 0.014, 0.59],
              [-w * 0.23 - 0.32 + j * 0.3, 0.45 + k * 0.13, d / 2 + 0.8],
              wood,
            );
          const bolt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.11, 0.72, 10),
            k % 2 ? linen : blue,
          );
          bolt.position.set(-w * 0.23 + k * 0.25, 0.9, d / 2 + 0.8);
          g.add(bolt);
          continue;
        }
        const jar = potteryJar(red);
        jar.position.set(-w * 0.29 + k * 0.38, 0.32, d / 2 + 0.8);
        jar.scale.setScalar(1.4);
        g.add(jar);
      }
    }
    if (x > 60 && index % 2 === 0) {
      const rear = new THREE.Group();
      rear.position.set(w * 0.12, 0, -d / 2 - 1.6);
      g.add(rear);
      box(rear, [w * 0.72, 2.5, 3.1], [0, 1.25, 0], plaster);
      const rearRoof = roof(rear, w * 0.72 + 1, 4, 2.565, 0.65, false);
      rear.add(new THREE.Mesh(roofGableGeometry(rearRoof, w * 0.72, 3.1, 2.5), plaster));
      for (let k = 0; k < 5; k++) box(rear, [0.1, 1.3, 0.1], [(k - 2) * w * 0.12, 1.7, 1.6], wood);
    }
    return g;
  }

  function person(x: number, z: number, yaw: number, variant: number, y = 2.8) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    city.add(g);
    const robe = [blue, linen, ochre, red, dark][variant % 5]!;
    const detail = Math.abs(x + 20) < 22;
    g.add(
      qingmingCitizen(
        { robe, skin, hair: dark, trim: variant % 2 ? wood : linen },
        variant,
        detail,
      ),
    );
    if (variant % 7 === 0) {
      beam(g, [-0.95, 1.4, 0], [0.95, 1.4, 0], 0.035);
      for (const s of [-1, 1]) {
        beam(g, [s * 0.85, 1.4, 0], [s * 0.85, 0.55, 0], 0.018);
        const basket = detail
          ? wovenBasket(0.21, 0.32, ochre)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.16, 0.32, 8), ochre);
        basket.position.set(s * 0.85, 0.25, 0);
        g.add(basket);
      }
    }
  }

  function stall(x: number, z: number, yaw: number, index: number, y = 2.8) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    city.add(g);
    box(g, [2.5, 0.14, 1.15], [0, 0.85, 0], wood);
    for (const a of [-1, 1])
      for (const b of [-1, 1]) beam(g, [a * 1.1, 0, b * 0.5], [a * 1.1, 2.45, b * 0.5], 0.05);
    const detail = Math.abs(x + 20) < 27;
    if (detail) {
      const fabric = (index % 3 === 0 ? blue : linen).clone();
      fabric.side = THREE.DoubleSide;
      const canopy = clothCanopy(2.8, 1.8, fabric);
      canopy.position.y = 2.5;
      g.add(canopy);
      for (let i = 0; i < 8; i++)
        box(g, [0.27, 0.07, 1.15], [-1.1 + i * 0.31, 0.94, 0], i % 2 ? wood : ochre);
      for (const side of [-1, 1]) beam(g, [side * 1.1, 0.1, -0.5], [-side * 1.1, 0.75, -0.5], 0.04);
      for (const side of [-1, 1]) {
        const basket = wovenBasket(0.28, 0.36, ochre);
        basket.position.set(side * 0.76, 0.02, 0.15);
        g.add(basket);
      }
    } else box(g, [2.8, 0.07, 1.8], [0, 2.4, 0], index % 3 === 0 ? blue : linen);
    for (let k = 0; k < 8; k++) {
      const item = new THREE.Mesh(
        index % 2
          ? new THREE.SphereGeometry(0.16, 6, 4)
          : new THREE.CylinderGeometry(0.13, 0.18, 0.3, 7),
        index % 2 ? ochre : red,
      );
      item.position.set(((k % 4) - 1.5) * 0.46, 1.04, k < 4 ? -0.23 : 0.23);
      if (detail && index % 2 === 0) {
        item.geometry.dispose();
        const jar = potteryJar(red);
        jar.position.copy(item.position);
        jar.position.y = 0.98;
        g.add(jar);
      } else g.add(item);
    }
    person(x + Math.sin(yaw) * 0.8, z + Math.cos(yaw) * 0.8, yaw, index, y);
  }

  function tree(x: number, z: number, size: number) {
    const g = new THREE.Group();
    g.position.set(x, 2.8, z);
    city.add(g);
    beam(g, [0, 0, 0], [0.2, size * 0.8, 0], size * 0.035);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4,
        xx = Math.cos(a) * size * 0.22,
        zz = Math.sin(a) * size * 0.22,
        yy = size * (0.6 + i * 0.07);
      beam(g, [0, size * 0.38, 0], [xx, yy, zz], size * 0.014);
      // Fine drooping willow shoots leave sky visible between branches.
      const leafMaterial = (i % 2 ? leaf : leafDark).clone();
      leafMaterial.side = THREE.DoubleSide;
      for (let strand = 0; strand < 5; strand++) {
        const angle = a + (strand - 2) * 0.48;
        const tx = xx + Math.cos(angle) * size * 0.23,
          tz = zz + Math.sin(angle) * size * 0.23;
        const drop = size * (0.25 + strand * 0.055);
        // More, finer shoots at the same tube budget: 3 sides / 4 spans instead of 4 / 5.
        g.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3([
                v([xx, yy, zz]),
                v([tx, yy - drop * 0.25, tz]),
                v([tx + 0.17, yy - drop, tz + 0.12]),
              ]),
              4,
              0.014,
              3,
              false,
            ),
            leafDark,
          ),
        );
        for (let j = 1; j < 6; j++) {
          const t = j / 6,
            lx = tx + t * 0.17,
            ly = yy - drop * t,
            lz = tz + t * 0.12;
          const points = [0, 0, 0, -0.035, -0.09, 0, 0, -0.31, 0, 0.035, -0.09, 0];
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
          geometry.setIndex([0, 1, 2, 0, 2, 3]);
          geometry.computeVertexNormals();
          const spray = new THREE.Mesh(geometry, leafMaterial);
          spray.position.set(lx, ly, lz);
          spray.rotation.y = angle + j * 0.9;
          spray.rotation.z = (j % 2 ? -1 : 1) * 0.3;
          g.add(spray);
        }
      }
    }
  }

  // Earthen lanes remain open: a waterfront path and the east-west city street.
  let result: THREE.Group | undefined;
  const detached = new THREE.Group();
  let completed = false;
  try {
    box(city, [80, 0.04, 7], [93, 2.82, -45], earth);
    const approachVertices: number[] = [],
      approachIndices: number[] = [];
    for (let i = 0; i <= 65; i++) {
      const x = -20 + i,
        center = qingmingMainStreet(x),
        width = 7.2 + 3.4 * Math.exp(-(((x + 18) / 18) ** 2));
      for (const side of [-1, 1]) approachVertices.push(x, 2.87, center + (side * width) / 2);
      if (i < 65) {
        const a = i * 2;
        approachIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const approach = new THREE.BufferGeometry();
    approach.setAttribute('position', new THREE.Float32BufferAttribute(approachVertices, 3));
    approach.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        approachVertices.flatMap((_, i) =>
          i % 3 === 0 ? [approachVertices[i]! * 0.08, approachVertices[i + 2]! * 0.08] : [],
        ),
        2,
      ),
    );
    approach.setIndex(approachIndices);
    approach.computeVertexNormals();
    const mainApproach = new THREE.Mesh(approach, earth);
    mainApproach.name = 'qingming-bridge-to-gate-street';
    city.add(mainApproach);
    for (const side of [-1, 1]) {
      const path: number[] = [],
        uv: number[] = [],
        index: number[] = [];
      for (let i = 0; i <= 104; i++) {
        const x = -126 + i * 2.5;
        for (const edge of [-1, 1]) {
          const z = qingmingRiver(x) + side * 17 + edge * 2.5;
          path.push(x, 2.835, z);
          uv.push(x * 0.1, z * 0.1);
        }
        if (i < 104) {
          const n = i * 2;
          index.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const strip = new THREE.BufferGeometry();
      strip.setAttribute('position', new THREE.Float32BufferAttribute(path, 3));
      strip.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      strip.setIndex(index);
      strip.computeVertexNormals();
      city.add(new THREE.Mesh(strip, earth));
    }
    for (let x = -56; x < 135; x += 7)
      for (const side of [-1, 1]) {
        const slope = qingmingRiverTangent(x),
          length = 7.1 * Math.sqrt(1 + slope * slope);
        const quay = box(
          city,
          [length, 1.2, 0.6],
          [x, 2.18, qingmingRiver(x) + side * 12.4],
          stone,
        );
        quay.rotation.y = -Math.atan(slope);
        yield;
      }
    // Rural western quarter, then a progressively denser waterfront and city.
    city.add(yield* buildQingmingScrollSteps(streetMaterials));
    city.add(yield* buildQingmingQuartersSteps(streetMaterials, tile));
    const narrative = yield* buildQingmingNarrativeSteps(streetMaterials, tile);
    city.add(narrative);
    // Keep boats in the existing skinned river batch instead of freezing them into the city.
    for (const vessel of [...narrative.children])
      if (vessel.userData.riverCraft) {
        vessel.removeFromParent();
        detached.add(vessel);
      }
    const riverCraft = buildQingmingRiverCraft(streetMaterials);
    const craftInventory = riverCraft.userData.inventory;
    city.add(riverCraft);
    const bridgeMarket = buildQingmingBridgeMarket(streetMaterials);
    city.add(bridgeMarket);
    yield;
    for (let i = 0; i < 22; i++) {
      const x = -65 + i * 8.5;
      if (Math.abs(x + 20) < 7) continue;
      const px = x + Math.sin(i * 2.1) * 0.65;
      const streetEdge = x > -14 ? qingmingMainStreet(x) + 10.4 : qingmingRiver(x) - 26.5;
      const facing =
        x > -14
          ? Math.PI - Math.atan((qingmingMainStreet(x + 0.1) - qingmingMainStreet(x - 0.1)) / 0.2)
          : Math.sin(i * 1.3) * 0.1;
      house(
        px,
        streetEdge - (i % 4) * 0.55,
        6.7 + random(),
        6.2 + (i % 3) * 0.5,
        i % 4 === 1,
        facing,
        i,
      );
      yield;
    }
    for (let i = 0; i < 16; i++) {
      const x = -8 + i * 8.4;
      if (Math.abs(x - 55) < 7 || [10, 11, 12].includes(i)) continue;
      house(
        x,
        qingmingMainStreet(x) - 10 - (i % 3) * 0.7,
        6.2 + (i % 3) * 0.25,
        7 + (i % 2),
        i === 11 || i % 3 === 0,
        -Math.atan((qingmingMainStreet(x + 0.1) - qingmingMainStreet(x - 0.1)) / 0.2),
        i === 11 ? 0 : i + 3,
      );
      // Rear lanes stagger around courts instead of repeating the front street's rigid grid.
      if (x > 55 || i % 3 === 0)
        house(
          x < 55 ? 75 + i * 4 : x + Math.sin(i * 1.7) * 1.3,
          x < 55 ? -2 + (i % 2) * 1.2 : -79 + Math.sin(i * 0.8) * 4.5,
          6.5,
          8,
          i % 4 === 0,
          i % 3 === 0 ? Math.PI / 2 : 0.13 * Math.sin(i),
          i + 5,
        );
      yield;
    }
    const merchantHall = yield* buildQingmingMerchantHallSteps(streetMaterials, tile, plaster);
    city.add(merchantHall);
    sign(merchantHall, 0, 5.8, 2.88, 0);
    for (const x of [77.4, 80.9, 84.4, 87.9, 91.4]) {
      lightSites.push({ position: [x, 5.8, -51.8], yaw: 0, kind: 'lantern' });
    }
    for (let i = 0; i < 8; i++) {
      lightSites.push({
        position: [84.4 - 5.95 + i * 1.7, 7.85, -54.25],
        yaw: 0,
        kind: 'window',
        size: [1.45, 1.6],
      });
    }
    for (let i = 0; i < 13; i++) {
      const x = -46 + i * 12;
      if (Math.abs(x + 20) < 8) continue;
      // Reallocate existing southern-bank houses to city courts: denser composition, no extra models.
      const town = [
        [69, -19],
        [79, -17],
        [90, -20],
        [101, -16],
        [113, -21],
        [125, -17],
        [127, -2],
      ];
      const townAt = i >= 6 ? town[i - 6] : undefined;
      house(
        townAt?.[0] ?? x,
        townAt?.[1] ?? qingmingRiver(x) + 31 + (i % 3) * 1.5,
        6.2 + (i % 4) * 0.3,
        6,
        i % 5 === 0,
        Math.PI + Math.sin(i * 1.7) * 0.14,
        i,
      );
      yield;
    }
    for (let i = 0; i < 36; i++) {
      const x = -64 + i * 5.4;
      if (Math.abs(x + 20) < 8) continue;
      stall(
        x,
        x > -14 ? qingmingMainStreet(x) + 5.8 : qingmingRiver(x) - 18.5,
        x > -14 ? Math.PI : 0,
        i,
      );
      yield;
    }
    for (let i = 0; i < 20; i++) {
      const x = -4 + i * 6.4;
      if (Math.abs(x - 55) < 7) continue;
      stall(x, qingmingMainStreet(x) - 5.3, 0, i);
      yield;
    }
    for (let i = 0; i < 115; i++) {
      // The moving walkers replace part of the crowd, rather than duplicating it.
      if (i % 10 === 0) continue;
      const x = -125 + random() * 254;
      const z =
        i % 3 === 0
          ? (i % 2 ? -48 : -42.05) + (random() - 0.5) * 0.25
          : qingmingRiver(x) + (i % 2 ? 16 : -15) + (random() - 0.5) * 2;
      const yaw = random() * Math.PI * 2;
      // The city street already has an authored moving crowd. Random duplicates intersect it.
      if (i % 3 === 0 && x > -12) continue;
      person(x, z, yaw, i);
      yield;
    }

    // Rainbow bridge: a clear river span with interlocking timber ribs, no masonry arch.
    const riverZ = qingmingRiver(-20);
    for (let i = 0; i < 55; i++) {
      yield;
      const z = riverZ - 22 + i * 0.8,
        y = qingmingBridgeHeight(z);
      const slope = ((z - riverZ) * 13.4) / (22 * 22);
      const deck = box(
        city,
        [8.6, 0.28, 0.82 * Math.sqrt(1 + slope * slope)],
        [-20, y - 0.14, z],
        wood,
      );
      deck.rotation.x = Math.atan(slope);
      const grain = new THREE.Group();
      grain.position.copy(deck.position);
      grain.rotation.copy(deck.rotation);
      city.add(grain);
      for (let j = 0; j < 4; j++) {
        const mark = box(
          grain,
          [1.1 + (j % 2) * 0.6, 0.006, 0.012],
          [-3 + j * 1.9, 0.145, (j % 2 ? -1 : 1) * 0.18],
          dark,
        );
        mark.rotation.y = (j % 2 ? 1 : -1) * 0.012;
      }
      if (i % 5 === 0) {
        const knot = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 3, 8), dark);
        knot.rotation.x = Math.PI / 2;
        knot.scale.x = 2.2;
        knot.position.set(1.6, 0.148, 0.1);
        grain.add(knot);
      }
      if (i % 3 === 0)
        for (const s of [-1, 1]) {
          beam(city, [-20 + s * 4.2, y, z], [-20 + s * 4.2, y + 1.2, z], 0.085);
          if (i < 52) {
            beam(
              city,
              [-20 + s * 4.2, y + 0.25, z],
              [-20 + s * 4.2, qingmingBridgeHeight(z + 2.4) + 0.95, z + 2.4],
              0.045,
            );
            box(city, [0.24, 0.1, 0.25], [-20 + s * 4.2, y + 1.22, z], wood);
            beam(
              city,
              [-20 + s * 4.2, y + 1.12, z],
              [-20 + s * 4.2, qingmingBridgeHeight(z + 2.4) + 1.12, z + 2.4],
              0.09,
            );
          }
        }
    }
    for (const x of [-23.5, -21.2, -18.8, -16.5])
      for (let i = 0; i < 10; i++) {
        yield;
        const z1 = riverZ - 22 + i * 4.4,
          z2 = z1 + 4.4;
        beam(
          city,
          [x, qingmingBridgeHeight(z1) - 0.9, z1],
          [x, qingmingBridgeHeight(z2) - 0.9, z2],
          0.27,
        );
        if (i < 9)
          beam(
            city,
            [x, qingmingBridgeHeight(z1) - 1.7, z1],
            [x, qingmingBridgeHeight(z2 + 4.4) - 0.5, z2 + 4.4],
            0.16,
          );
        beam(
          city,
          [-24, qingmingBridgeHeight(z1) - 0.65, z1],
          [-16, qingmingBridgeHeight(z1) - 0.65, z1],
          0.15,
        );
      }
    for (let i = 0; i < 18; i++) {
      const z = riverZ - 20 + i * 2.2;
      if (i % 4 !== 0)
        person(-20 + (i % 2 ? -3.2 : 3.2), z, i % 2 ? 0 : Math.PI, i, qingmingBridgeHeight(z));
      yield;
    }
    for (const z of [riverZ - 12, riverZ + 12])
      stall(-23, z, Math.PI / 2, 1, qingmingBridgeHeight(z));

    // Approaching from the west, the bow enters the span without an upright mast.
    const passageBoat = qingmingPassageBoat({ timber: wood, dark, cloth: linen, robe: blue, skin });
    passageBoat.position.set(-25, 0.45, riverZ - 0.5);
    detached.add(passageBoat);
    const movingBoats = [passageBoat];
    yield;

    // The gate is aligned with the principal street; an actual open arch is retained.
    const gate = new THREE.Group();
    gate.position.set(55, 2.8, -45);
    gate.rotation.y = Math.PI / 2;
    city.add(gate);
    for (const s of [-1, 1]) box(gate, [9, 10, 7], [s * 9, 5, 0], stone);
    box(gate, [10, 2.8, 7], [0, 9, 0], stone);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.6, 4, 18, Math.PI), stone);
    arch.position.y = 4;
    arch.scale.z = 5;
    gate.add(arch);
    for (const face of [-1, 1])
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI + 0.008,
          b = ((i + 1) / 22) * Math.PI - 0.008;
        const shape = new THREE.Shape();
        shape.moveTo(Math.cos(a) * 3.71, Math.sin(a) * 3.71);
        shape.lineTo(Math.cos(a) * 4.9, Math.sin(a) * 4.9);
        shape.absarc(0, 0, 4.9, a, b, false);
        shape.lineTo(Math.cos(b) * 3.71, Math.sin(b) * 3.71);
        shape.absarc(0, 0, 3.71, b, a, true);
        shape.closePath();
        const wedge = new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 2 }),
          stone,
        );
        wedge.position.set(0, 4, face > 0 ? 3.51 : -3.67);
        gate.add(wedge);
        yield;
      }
    // Recessed brick joints, jambs and door leaves give the gateway a human-scale edge.
    const mortar = mat('#827c68');
    for (const face of [-1, 1])
      for (const side of [-1, 1]) {
        for (let row = 0; row < 17; row++) {
          yield;
          box(gate, [8.9, 0.035, 0.025], [side * 9, row * 0.56 + 0.3, face * 3.515], mortar);
          for (let j = 0; j < 6; j++)
            box(
              gate,
              [0.035, 0.53, 0.03],
              [side * 9 - 4.1 + j * 1.45 + (row % 2) * 0.5, row * 0.56 + 0.58, face * 3.52],
              mortar,
            );
        }
        box(gate, [0.18, 4.1, 6.6], [side * 4.55, 2.05, 0], wood);
        for (let j = 0; j < 9; j++)
          box(gate, [0.2, 3.95, 0.06], [side * 4.42, 2.05, -2.9 + j * 0.7], dark);
      }
    for (let i = -7; i <= 7; i++) box(gate, [1.05, 1.05, 0.8], [i * 1.8, 10.5, 3.1], stone);
    // Recessed enclosed core behind an open timber gallery, rather than a solid yellow block.
    box(gate, [8.4, 3.6, 0.18], [0, 12.3, -1.7], plaster);
    for (const side of [-1, 1]) box(gate, [0.18, 3.6, 3.2], [side * 4.1, 12.3, -0.2], plaster);
    box(gate, [8.4, 0.75, 0.16], [0, 10.7, 1.3], wood);
    box(gate, [8.4, 0.9, 0.16], [0, 13.65, 1.3], wood);
    for (let i = -15; i <= 15; i++) box(gate, [0.055, 2.15, 0.1], [i * 0.26, 12.15, 1.38], dark);
    for (const y of [11.35, 12.2, 13.05]) box(gate, [8.2, 0.06, 0.12], [0, y, 1.39], dark);
    for (const x of [-2.6, 0, 2.6]) {
      box(gate, [0.22, 4.1, 0.22], [x, 12.2, -0.5], wood);
      box(gate, [0.7, 0.18, 0.8], [x, 14.15, -0.5], wood);
    }
    for (const face of [-1, 1])
      for (let i = -2; i <= 2; i++) {
        box(gate, [0.25, 4.3, 0.25], [i * 2.65, 12.3, face * 2.85], wood);
        if (Math.abs(i) === 2)
          box(gate, [0.55, 1.5, 0.08], [i * 1.8, 11.9, face * 1.65 - 0.5], dark);
      }
    for (const face of [-1, 1]) {
      box(gate, [11.2, 0.24, 0.3], [0, 14.25, face * 2.85], wood);
      box(gate, [11.2, 0.16, 0.18], [0, 10.95, face * 2.85], wood);
    }
    gate.add(buildQingmingGateRoof(tile, wood));
    for (const s of [-1, 1])
      for (let j = 0; j < 3; j++) {
        const z = -45 + s * (22 + j * 12);
        if (z > -11 || z < -100) continue;
        const wall = rammedWallSegment(streetMaterials);
        wall.position.set(55, 2.8, z);
        city.add(wall);
        for (let k = 0; k < 5; k++)
          box(city, [0.8, 1, 1.1], [56.7, 10.5, z - 5 + k * 2.5], streetMaterials.earth);
      }

    // Cargo boats, riverside timber jetties, sacks and handcarts.
    const moorings: [number, number, number, number, number][] = [
      [-91, -7, 1.3, 0.08, 1],
      [-80, -7, 1.2, -0.1, 0],
      [-72, 6, 1.5, Math.PI + 0.12, 0],
      [-64, -7, 1.4, 0.16, 1],
      [-52, 5.5, 1.6, Math.PI - 0.12, 0],
      [4, -6, 1.3, 0.12, 1],
      [31, 6.2, 1.4, Math.PI + 0.1, 0],
    ];
    for (const [x, offset, scale, yaw, hasDock] of moorings) {
      yield;
      const vessel = boat();
      // Moored working craft furl their sail against a standing mast, not seven identical full sails.
      if (x < 0 || hasDock)
        for (const part of vessel.children) {
          if (!(part instanceof THREE.Mesh)) continue;
          part.updateMatrix();
          const bounds = new THREE.Box3().setFromObject(part);
          if (bounds.min.y < 1.3 || bounds.max.y < 2) continue;
          part.geometry.applyMatrix4(part.matrix);
          part.position.set(0, 0, 0);
          part.rotation.set(0, 0, 0);
          part.scale.set(1, 1, 1);
          const p = part.geometry.getAttribute('position');
          for (let k = 0; k < p.count; k++) p.setY(k, 1.4 + (p.getY(k) - 1.4) * 0.08);
          part.geometry.computeVertexNormals();
        }
      vessel.position.set(x!, 0.6, qingmingRiver(x!) + offset!);
      vessel.scale.setScalar(scale!);
      vessel.rotation.y = yaw!;
      detached.add(vessel);
      movingBoats.push(vessel);
      if (hasDock) {
        const z = qingmingRiver(x!) - 10;
        box(city, [8, 0.3, 4.8], [x, 2, z], wood);
        for (const a of [-1, 1])
          for (const b of [-1, 1])
            beam(city, [x + a * 3.5, 0, z + b * 2], [x + a * 3.5, 2.5, z + b * 2], 0.16);
        for (let k = 0; k < 8; k++)
          box(city, [0.8, 0.6, 0.7], [x - 2 + (k % 4), 2.5, z + Math.floor(k / 4)], linen);
      }
    }
    for (let i = 0; i < 8; i++) {
      if ([2, 3, 4, 5].includes(i)) continue; // Keep the travelling cart lane and gate queue clear.
      yield;
      const x = -90 + i * 28,
        z = -44;
      box(city, [2.5, 0.2, 1.4], [x, 3.55, z], wood);
      for (const s of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 4, 12), dark);
        wheel.position.set(x, 3.45, z + s * 0.85);
        city.add(wheel);
        for (let k = 0; k < 4; k++)
          beam(
            city,
            [
              x - Math.cos((k * Math.PI) / 4) * 0.6,
              3.45 - Math.sin((k * Math.PI) / 4) * 0.6,
              z + s * 0.85,
            ],
            [
              x + Math.cos((k * Math.PI) / 4) * 0.6,
              3.45 + Math.sin((k * Math.PI) / 4) * 0.6,
              z + s * 0.85,
            ],
            0.035,
          );
        beam(city, [x, 3.55, z + s * 0.55], [x + 2.8, 3.25, z + s * 0.55], 0.055);
      }
      for (let k = 0; k < 3; k++) box(city, [0.65, 0.6, 1.05], [x - 0.8 + k * 0.8, 3.95, z], linen);
    }
    for (let i = 0; i < 26; i++) {
      const x = -131 + random() * 260;
      tree(x, i < 16 ? qingmingRiver(x) + 22 : -95 + random() * 13, 4.8 + random() * 3);
      yield;
    }
    // Farm furrows and woven fences keep the western approach intentionally quiet.
    for (let i = 0; i < 12; i++) box(city, [48, 0.07, 0.18], [-108, 2.88, 27 + i * 1.2], ochre);
    for (let i = 0; i < 20; i++) {
      const x = -133 + i * 2.4;
      beam(city, [x, 2.8, 44], [x, 3.85, 44], 0.05);
      if (i < 19) beam(city, [x, 3.4, 44], [x + 2.4, 3.4, 44], 0.045);
    }

    // Broken, slightly uneven paving; never a single featureless street plane.
    const paving = [mat('#afa99a'), mat('#a39e90')];
    for (let i = 57; i < 230; i++)
      for (let row = 0; row < 4; row++) {
        if (row === 0 && i % 8 === 0) yield;
        const x = -129 + i * 1.14 + (row % 2) * 0.55;
        // Most of the painted street is packed earth, not a continuous modern pavement.
        if (x < 49 || x > 62) continue;
        const flag = box(
          city,
          [1.02, 0.035, 1.1],
          [x, 2.85 + random() * 0.015, -46.8 + row * 1.2],
          paving[(i + row) % 2]!,
        );
        flag.rotation.y = (random() - 0.5) * 0.08;
      }

    const episodes = buildQingmingEpisodes(streetMaterials);
    city.add(episodes);
    yield;
    const transport = episodes.getObjectByName('gate-donkey-cart') as THREE.Group;
    transport.removeFromParent();
    const livingTransport = yield* prepareQingmingTransportSteps(transport);
    detached.add(livingTransport);
    yield;
    const streetLife = buildQingmingLife(streetMaterials);
    detached.add(streetLife);
    yield;
    const extraBoats = detached.children.filter((v) => v.userData.riverCraft) as THREE.Group[];
    const riverLife = prepareQingmingBoats([...movingBoats, ...extraBoats]);
    detached.add(riverLife);
    yield;
    const dailyLife = buildQingmingDailyLife(streetMaterials);
    detached.add(dailyLife);
    yield;
    for (const [x, z, , d, yaw] of QINGMING_RURAL_HOUSES) {
      const world = (px: number, py: number, pz: number): Point => [
        x + Math.cos(yaw) * px + Math.sin(yaw) * pz,
        2.8 + py,
        z - Math.sin(yaw) * px + Math.cos(yaw) * pz,
      ];
      lightSites.push({ kind: 'lantern', position: world(-1.3, 2.05, d / 2 + 0.5), yaw });
      lightSites.push({
        kind: 'window',
        position: world(0.4, 0.95, d / 2 + 0.071),
        yaw,
        size: [1.01, 1.86],
      });
      beam(city, world(-1.3, 2.58, d / 2 - 0.1), world(-1.3, 2.58, d / 2 + 0.5), 0.035, dark);
    }
    const nightLife = buildQingmingNightLife(lightSites);
    detached.add(nightLife);
    result = yield* batchQingmingSteps(city);
    const airLife = buildQingmingAirLife();
    result.add(livingTransport, streetLife, riverLife, dailyLife, nightLife, airLife);
    const streetUpdate = featuredUpdate(streetLife)!;
    const riverUpdate = featuredUpdate(riverLife)!;
    registerUpdate(result, (time, night) => {
      surfaceUpdate(time, night);
      featuredUpdate(airLife)?.(time, night);
      streetUpdate(time, night);
      riverUpdate(time, night);
      featuredUpdate(dailyLife)?.(time, night);
      featuredUpdate(nightLife)?.(time, night);
    });
    result.userData.detailInventory = {
      shops: shopInventory,
      craft: craftInventory,
      daily: dailyLife.userData.inventory,
      narratives: narrative.userData.inventory,
      merchantHall: merchantHall.userData.inventory,
      evening: nightLife.userData.inventory,
      bridgeMarket: bridgeMarket.userData.inventory,
    };
    result.userData.streetFoci = {
      huanmen: [84.4, 6.0, -48.2],
      counter: [76.1, 3.8, -48.7],
      transport: [47, 4.0, -45.2],
      rammedWall: [57.5, 6, -67],
    };
    result.userData.scrollFoci = QINGMING_SCROLL_FOCI;
    result.userData.layoutRevision = {
      bridgeToGate: true,
      cityCourts: 10,
      infillCourts: QINGMING_QUARTERS.length,
      infillWings: QINGMING_QUARTERS.length * 3,
      mooredBoats: moorings.map(([x, z]) => [x, qingmingRiver(x) + z]),
      riverRecedesAtCity: true,
    };
    result.userData.scrollSections = ['郊野', '汴河', '虹桥', '城门', '城内'];
    result.userData.bridgePassage = {
      name: 'qingming-bridge-passage-boat',
      position: [-25, 0.45, riverZ - 0.5],
      pose: 'fixed-lowered-rig',
    };
    // One atlas for all legible shop signs, kept separate from material-color batching.
    if (typeof document !== 'undefined' && signGeometry.length) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#3d392d';
        ctx.fillRect(0, 0, 512, 1024);
        ctx.fillStyle = '#d8c59a';
        ctx.font = '64px "Kaiti SC", KaiTi, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ['酒肆', '茶食', '药铺', '布帛', '竹木', '纸铺', '米行', '客舍'].forEach((word, i) =>
          ctx.fillText(word, 256, i * 128 + 64),
        );
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const geo = mergeGeometries(signGeometry);
        if (geo)
          result.add(
            new THREE.Mesh(
              geo,
              new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 1,
                side: THREE.DoubleSide,
              }),
            ),
          );
      }
    }
    signGeometry.forEach((geometry) => geometry.dispose());
    result.name = 'qingming-city';
    const surfaceUpdate = installQingmingSurfaceLight(result);
    completed = true;
    return result;
  } finally {
    signGeometry.forEach((geometry) => geometry.dispose());
    if (!completed) {
      disposeObject(city);
      disposeObject(detached);
      if (result) disposeObject(result);
      [
        wood,
        dark,
        plaster,
        tile,
        tileLight,
        stone,
        earth,
        linen,
        red,
        leaf,
        leafDark,
        skin,
        blue,
        ochre,
        glow,
        ...Object.values(streetMaterials),
      ].forEach((material) => material.dispose());
    }
  }
}
