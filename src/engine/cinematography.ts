import { CatmullRomCurve3, Vector3 } from 'three';
import type { Painting, Vec3 } from '../types';
import { clamp, seededRandom } from './math';
import { groundHeight } from './terrain';
import { landscapeRiverCenter } from './geography';
import { qingmingBridgeHeight, qingmingRiver } from './cityLayout';
import { wuhanPath } from './wuhanLayout';
import { XISHAN_CARAVAN_FOCUS, XISHAN_EAVE_FOCUS } from './xishanLayout';

export interface CinematicView {
  eye: Vec3;
  target: Vec3;
}
export interface CinematicKeyframe extends CinematicView {
  progress: number;
  subject: string;
  detail?: boolean;
}
const cache = new WeakMap<Painting, readonly CinematicKeyframe[]>();
const ground = (p: Painting, x: number, z: number, height: number): Vec3 => [
  x,
  Math.max(0, groundHeight(p, x, z)) + height,
  z,
];
const offset = (v: Vec3, x: number, y: number, z: number): Vec3 => [v[0] + x, v[1] + y, v[2] + z];
const frame = (
  progress: number,
  subject: string,
  eye: Vec3,
  target: Vec3,
  detail = false,
): CinematicKeyframe => ({ progress, subject, eye, target, detail });
const overview = (p: Painting, progress: number): CinematicKeyframe =>
  frame(progress, '完整构图', p.overview.eye, p.overview.target);

/** Matches the first pavilion placed by buildVillage, including its seeded scale. */
function firstPavilion(p: Painting): Vec3 {
  const peak = p.peaks.find((peak) => peak.height < 20)!;
  const random = seededRandom(p.seed);
  const x = peak.x + (random() - 0.5) * peak.radius;
  const z = peak.z + (random() - 0.5) * peak.radius * 0.7;
  const scale = 0.65 + random() * 0.25;
  return [x, Math.max(0.45, groundHeight(p, x, z)) + scale * 3.75, z + scale * 1.5];
}
function routeBoat(p: Painting, index: number): Vec3 {
  const route = new CatmullRomCurve3(p.route.map((point) => new Vector3(...point)));
  const point = route.getPointAt((index + 0.4) / 6);
  return [point.x, 0.4 + (0.6 + index * 0.04) * 1.3, point.z];
}
/** First western house: reproduce only its placement numbers, not another full model. */
function starryWindow(p: Painting): Vec3 {
  const random = seededRandom(p.seed);
  const x = -24 + (random() - 0.5) * 30,
    z = -13 + (random() - 0.5) * 10;
  const scale = 0.68 + random() * 0.44;
  const height = 2 + random() * 2,
    width = 2.6 + random() * 1.5;
  random();
  random();
  const left = random(),
    right = random();
  const baseYaw = (random() - 0.5) * 0.45;
  const scaleY = scale * (0.85 + random() * 0.5);
  const yaw = baseYaw + (random() - 0.5) * 0.8;
  const dx = (left > right ? -1 : 1) * width * 0.28 * scale,
    dz = 1.62 * scale;
  return [
    x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    groundHeight(p, x, z) + 0.08 + height * 0.65 * scaleY,
    z - dx * Math.sin(yaw) + dz * Math.cos(yaw),
  ];
}
function winterDetails(p: Painting): { tree: Vec3; stone: Vec3 } {
  const random = seededRandom(p.seed);
  for (let i = 0; i < 136 * 6; i++) random();
  const x = -(59 + random() * 37),
    z = 35 + random() * 52;
  random();
  const scale = 1.5 + random() * 0.75;
  const tree = ground(p, x, z, scale * 4.4);
  for (let i = 0; i < 23 * 4; i++) random();
  const sx = -(39 + random() * random() * 74),
    sz = random() * 63 + 8;
  const radius = 0.12 + random() * 0.52;
  return { tree, stone: ground(p, sx, sz, radius * 0.5) };
}

/** Each chapter arrives at an actual authored object, with room to see its construction. */
export function getCinematicKeyframes(p: Painting): readonly CinematicKeyframe[] {
  const existing = cache.get(p);
  if (existing) return existing;
  let frames: CinematicKeyframe[];
  switch (p.id) {
    case 'qianli': {
      const boat = routeBoat(p, 1);
      frames = [
        overview(p, 0),
        frame(0.1, '洲岸与江面', [-68, 19, 55], [-44, 6, 10]),
        frame(0.2, '帆舟与竹篷', offset(boat, 6, 3, 8), boat, true),
        frame(0.31, '船舷与帆索', offset(boat, 3.5, 1.9, 5.5), boat, true),
        frame(0.4, '石桥木栏', [5, 5.3, 13], [1, 3.8, 7.9], true),
        frame(0.62, '青绿主峰', [34, 30, 31], [20, 35, -27]),
        frame(0.85, '江天与村落', [69, 46, 102], [18, 20, -19]),
        overview(p, 1),
      ];
      break;
    }
    case 'fuchun': {
      const house = firstPavilion(p),
        boat = routeBoat(p, 1);
      frames = [
        overview(p, 0),
        frame(0.11, '低洲与淡山', [-62, 12, 42], [-38, 5, 7]),
        frame(0.22, '沙洲泊舟', offset(boat, 5, 2.3, 7), boat, true),
        frame(0.34, '岸边屋檐', offset(house, -6, 1, 9), house, true),
        frame(0.44, '瓦垄与木柱', offset(house, -3, 0.3, 5.4), house, true),
        frame(0.65, '远岫留白', [28, 16, 38], [40, 13, -34]),
        frame(0.87, '一江闲意', [60, 31, 96], [16, 12, -23]),
        overview(p, 1),
      ];
      break;
    }
    case 'xishan': {
      const eave = XISHAN_EAVE_FOCUS,
        caravan = XISHAN_CARAVAN_FOCUS;
      const waterfall = ground(p, 14.6, -28, 1.1);
      frames = [
        overview(p, 0),
        frame(0.1, '行旅与前景溪石', offset(caravan, -10, 3, 13), caravan, true),
        frame(0.22, '驮包、缰绳与行旅', offset(caravan, -3.2, 1.2, 5.5), caravan, true),
        frame(0.34, '树间亭屋', offset(eave, -8, 2, 11), eave, true),
        frame(0.43, '亭檐与瓦脊', offset(eave, -4, 1, 7), eave, true),
        frame(0.63, '贴壁飞瀑', offset(waterfall, 14, 7, 22), waterfall),
        frame(0.87, '仰望主峰', [22, 21, 66], [0, 50, -32]),
        overview(p, 1),
      ];
      break;
    }
    case 'starry': {
      const window = starryWindow(p),
        cypress = ground(p, -44, 21, 6);
      frames = [
        overview(p, 0),
        frame(0.11, '村庄与教堂', [-6, 9, 31], [0, 8, -22]),
        frame(0.22, '柏树轮廓', offset(cypress, 7, 2, 8), cypress, true),
        frame(0.34, '街边屋顶', offset(window, 7, 3.5, 12), offset(window, 0, 1.1, 0)),
        frame(0.44, '窗格与暖光', offset(window, 2.5, 0.8, 6), window, true),
        frame(0.65, '笔触星河', [3, 8, 4], [0, 39, -48]),
        frame(0.87, '弯月与蓝丘', [42, 22, 72], [6, 25, -50]),
        overview(p, 1),
      ];
      break;
    }
    case 'empire': {
      const random = seededRandom(136);
      let hutZ = 0;
      for (let i = 0; i <= 4; i++) hutZ = -18 - random() * 13;
      frames = [
        overview(p, 0),
        frame(0.11, '尚无城市的海湾', [-44, 14, 42], [-26, 6, -27]),
        frame(0.22, '田园茅屋', [2, 5.2, hutZ + 8], [-3, 3.5, hutZ], true),
        frame(0.34, '茅檐与门口', [0.5, 3.6, hutZ + 5.6], [-3, 2.8, hutZ + 1.4], true),
        frame(0.44, '柱础与檐口', [10, 4.5, -3], [5.9, 4.9, -10.1], true),
        frame(0.65, '倒柱与残石', [9, 3.7, -2.8], [3, 2.3, -9.4], true),
        frame(0.87, '残柱之外的山海', [52, 16, 37], [8, 8, -21]),
        overview(p, 1),
      ];
      break;
    }
    case 'winter': {
      const { tree, stone } = winterDetails(p);
      frames = [
        overview(p, 0),
        frame(0.11, '冬树与雪谷', offset(tree, 14, 3, 17), offset(tree, 0, 2, -3)),
        frame(0.22, '冬枝的分杈', offset(tree, 6, 1, 7), tree, true),
        frame(0.33, '树干与细枝', offset(tree, 4, -2, 5), offset(tree, 0, -3, 0), true),
        frame(0.44, '近处覆雪石', offset(stone, 3.2, 1.9, 3.6), stone, true),
        frame(0.65, '群峰雪脊', [1, 13, 19], [0, 38, -110]),
        frame(0.87, '雪峰上方的微星', [-5, 22, 90], [0, 45, -119]),
        overview(p, 1),
      ];
      break;
    }
    case 'qingming': {
      const river = qingmingRiver(-20),
        bridgeY = qingmingBridgeHeight(river + 5);
      const boat: Vec3 = [-68, 1.9, qingmingRiver(-68) + 6];
      frames = [
        frame(0, '郊野村舍', [-128, 23, 12], [-106, 4, -33]),
        frame(0.1, '郊舍瓦檐', [-102, 8.8, -24], [-106, 7.4, -30.3], true),
        frame(0.2, '汴河货船', offset(boat, 6, 2.5, 7), boat, true),
        frame(0.32, '虹桥卧桅过船', [-33, 4.5, river + 7], [-25, 1.6, river - 0.5], true),
        frame(
          0.4,
          '虹桥木栏与铺席',
          [-19, qingmingBridgeHeight(river + 10) + 2.1, river + 10],
          [-23, bridgeY + 1, river + 5],
          true,
        ),
        frame(0.65, '城门砖缝与窗格', [43, 5.2, -45], [55, 7.2, -45], true),
        frame(0.83, '市井檐窗与招牌', [71, 6.5, -43.6], [67.6, 7, -50.8], true),
        overview(p, 1),
      ];
      break;
    }
    case 'zhangjiajie': {
      const pathX = -34,
        pathZ = landscapeRiverCenter(p, pathX) + 9;
      const stone = ground(p, pathX, pathZ, 0.1);
      const peak = p.peaks.find((peak) => peak.x === -49) ?? p.peaks[0]!;
      const pine = ground(p, peak.x, peak.z, 3.3);
      frames = [
        overview(p, 0),
        frame(0.1, '溪谷与峰林', [-42, 12, 44], [-29, 21, -20]),
        frame(0.22, '溪边石路', offset(stone, 4, 2.1, 5.2), stone, true),
        frame(0.32, '石面与浅水', offset(stone, 2.7, 1.7, 3.5), stone, true),
        frame(0.43, '峰顶松冠与岩壁', offset(pine, 6, 2.4, 9), pine, true),
        frame(0.66, '云过群峰', [18, 56, 28], [5, 40, -59]),
        frame(0.87, '谷地回望', [59, 52, 94], [-12, 31, -38]),
        overview(p, 1),
      ];
      break;
    }
    case 'guilin': {
      const bamboo = ground(p, -35.5, landscapeRiverCenter(p, -35.5) + 24, 3.1);
      const raft: Vec3 = [8, 1.1, 1];
      frames = [
        overview(p, 0),
        frame(0.1, '临江山色', [-36, 13, 52], [-9, 11, -32]),
        frame(0.21, '竹节与细叶', offset(bamboo, 4.2, 0.7, 6), bamboo, true),
        frame(0.32, '竹岸之间看江', offset(bamboo, 2.8, -0.5, 4.8), bamboo, true),
        frame(0.43, '水面与群峰倒影', [-12, 3.7, 15], [16, 10, -64]),
        frame(0.66, '竹筏绑绳与撑篙', offset(raft, 5, 2.2, 6), raft, true),
        frame(0.87, '江天开阔', [48, 28, 97], [12, 16, -46]),
        overview(p, 1),
      ];
      break;
    }
    case 'wuhan': {
      const flower: Vec3 = [-18.5721, 5.3782, 10.0074];
      const stone = ground(p, -5, wuhanPath(-5) + 3.8, 0.65);
      const shelter = ground(p, 23, wuhanPath(23) + 1.6, 3.1);
      frames = [
        overview(p, 0),
        frame(0.1, '临湖桂树与石径', [-40, 9, 34], [-18, 4, 12]),
        frame(0.21, '桂枝的对生叶与花簇', offset(flower, 1.8, 0.7, 4.7), flower, true),
        frame(0.32, '细雨里的花与叶', offset(flower, 1.17, 0.32, 2.8), flower, true),
        frame(0.43, '石凳与湿润石径', offset(stone, 4, 1.9, 4), stone, true),
        frame(0.66, '湖亭的瓦檐与木柱', offset(shelter, -10, 1.8, 10), shelter, true),
        frame(0.87, '烟水与远岸', [36, 5, 19], [6, 4, -94]),
        overview(p, 1),
      ];
      break;
    }
    default:
      frames = [overview(p, 0), overview(p, 1)];
  }
  cache.set(p, frames);
  return frames;
}

/** C1-continuous eased segments cannot overshoot through a model like a Catmull-Rom eye path. */
export function getCinematicView(painting: Painting, progress: number): CinematicView {
  const frames = getCinematicKeyframes(painting);
  const t = clamp(progress);
  let index = frames.findIndex((point) => point.progress >= t);
  if (index <= 0) index = 1;
  const a = frames[index - 1]!,
    b = frames[index]!;
  const u = clamp((t - a.progress) / (b.progress - a.progress));
  const eased = u * u * (3 - 2 * u);
  const lerp = (a: Vec3, b: Vec3): [number, number, number] => [
    a[0] + (b[0] - a[0]) * eased,
    a[1] + (b[1] - a[1]) * eased,
    a[2] + (b[2] - a[2]) * eased,
  ];
  const eye = lerp(a.eye, b.eye),
    target = lerp(a.target, b.target);
  // Terrain clearance is applied after interpolation, including the space between keyframes.
  eye[1] = Math.max(eye[1], groundHeight(painting, eye[0], eye[2]) + 1.75, 1.75);
  // Check the near sightline, so low bank details are not filmed through a foreground ridge.
  for (let i = 1; i <= 8; i++) {
    const s = i / 12;
    const x = eye[0] + (target[0] - eye[0]) * s,
      z = eye[2] + (target[2] - eye[2]) * s;
    const surface = groundHeight(painting, x, z) + 0.45;
    eye[1] = Math.max(eye[1], (surface - target[1] * s) / (1 - s));
  }
  if (Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]) < 0.1) eye[2] += 1;
  return { eye, target };
}
