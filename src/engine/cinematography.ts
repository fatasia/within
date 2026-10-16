import { sampleRoadsterMotion } from './roadsterMotion';
import { CatmullRomCurve3, Vector3 } from 'three';
import type { Painting, Vec3 } from '../types';
import { clamp, seededRandom } from './math';
import { groundHeight } from './terrain';
import { landscapeRiverCenter } from './geography';
import { getQingmingKeyframes } from './qingmingCinematography';
import { wuhanPath, WUHAN_FLOWER_FOCUS } from './wuhanLayout';
import { XISHAN_CARAVAN_FOCUS } from './xishanLayout';

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

/** Objects anchor a landscape composition, rather than filling the lens as isolated macros. */
export function getCinematicKeyframes(p: Painting): readonly CinematicKeyframe[] {
  const existing = cache.get(p);
  if (existing) return existing;
  let frames: CinematicKeyframe[];
  switch (p.id) {
    case 'roadster': frames=[0,.12,.24,.4,.55,.68,.85,1].map(t=>{const v=sampleRoadsterMotion(t);return frame(t,'Roadster',v.eye,v.target,true)});break;
    case 'qianli': {
      const boat = routeBoat(p, 1);
      frames = [
        overview(p, 0),
        frame(0.1, '洲岸与江面', [-68, 19, 55], [-44, 6, 10]),
        frame(0.2, '帆舟与开阔江面', offset(boat, 13, 7, 22), offset(boat, 0, 3, -9), true),
        frame(0.31, '舟行青山之间', offset(boat, 10, 5, 17), offset(boat, 0, 2, -5), true),
        frame(0.4, '石桥与两岸', [35, 30, 110], [1, 20, -10], true),
        frame(0.62, '青绿主峰', [41, 36, 62], [20, 32, -27]),
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
        frame(0.22, '沙洲泊舟', offset(boat, 11, 5, 19), offset(boat, 0, 2, -6), true),
        frame(0.34, '疏林中的岸舍', offset(house, -24, 12, 42), offset(house, 8, 11, -18), true),
        frame(0.44, '瓦檐与江岸', offset(house, -25, 12, 50), offset(house, 0, 5, -10), true),
        frame(0.65, '远岫留白', [25, 20, 63], [40, 14, -34]),
        frame(0.87, '一江闲意', [60, 31, 96], [16, 12, -23]),
        overview(p, 1),
      ];
      break;
    }
    case 'xishan': {
      const caravan = XISHAN_CARAVAN_FOCUS;
      frames = [
        overview(p, 0),
        frame(0.1, '行旅与前景溪石', offset(caravan, -20, 7, 27), offset(caravan, -4, 3, -7), true),
        frame(0.22, '山径上的驮队', offset(caravan, -10, 4, 16), offset(caravan, -1, 1, -2), true),
        frame(0.34, '树间亭屋', [70, 31, 170], [12, 40, -24], true),
        frame(0.43, '亭屋与叠嶂', [90, 35, 205], [9, 38, -20], true),
        frame(0.63, '山壁间的飞瀑', [54, 44, 125], [12, 62, -32]),
        frame(0.87, '仰望主峰', [28, 30, 100], [0, 50, -32]),
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
        frame(0.22, '柏树与星空', offset(cypress, 36, 16, 75), offset(cypress, 14, 23, -6), true),
        frame(0.34, '街巷与屋顶', [18, 16, 34], [-4, 7, -16]),
        frame(0.44, '暖窗与沉静村庄', offset(window, 9, 6, 20), offset(window, 2, 2, -6), true),
        frame(0.65, '笔触星河', [8, 19, 44], [-20, 27, -80]),
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
        frame(0.22, '田园茅屋', [10, 10, hutZ + 24], [-3, 4, hutZ], true),
        frame(0.34, '田园与城址', [5, 8, hutZ + 20], [-3, 4, hutZ - 3], true),
        frame(0.44, '柱廊与海湾', [25, 13, 20], [5.9, 8, -14], true),
        frame(0.65, '倒柱与残石', [21, 10, 18], [3, 4, -13], true),
        frame(0.87, '残柱之外的山海', [52, 16, 37], [8, 8, -21]),
        overview(p, 1),
      ];
      break;
    }
    case 'winter': {
      const { tree, stone } = winterDetails(p);
      frames = [
        overview(p, 0),
        frame(0.11, '冬树与雪谷', offset(tree, 36, 5, 43), offset(tree, 19, 7, -30)),
        frame(0.22, '疏枝间的群峰', offset(tree, 27, 3, 33), offset(tree, 11, 4, -15), true),
        frame(0.33, '树影与雪地', offset(tree, 25, 0, 31), offset(tree, 9, 1, -14), true),
        frame(0.44, '覆雪石与空谷', offset(stone, 22, 7, 28), [0, 22, -90]),
        frame(0.65, '群峰雪脊', [1, 17, 58], [0, 38, -110]),
        frame(0.87, '雪峰上方的微星', [-5, 22, 90], [0, 45, -119]),
        overview(p, 1),
      ];
      break;
    }
    case 'qingming': {
      frames = [...getQingmingKeyframes()];
      break;
    }
    case 'zhangjiajie': {
      const pathX = -34,
        pathZ = landscapeRiverCenter(p, pathX) + 9;
      const stone = ground(p, pathX, pathZ, 0.1);
      frames = [
        overview(p, 0),
        frame(0.1, '溪谷与峰林', [-44, 25, 73], [-29, 35, -35]),
        frame(0.22, '溪边石路', offset(stone, 7, 5, 16), offset(stone, 0, 2, -15), true),
        frame(0.32, '浅水与峰林之间', offset(stone, 10, 6, 21), offset(stone, 12, 3, -20), true),
        frame(0.43, '松冠与完整石峰', [5, 70, 95], [-35, 60, -40], true),
        frame(0.66, '云过群峰', [28, 72, 77], [5, 42, -65]),
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
        frame(0.21, '竹影与临江山色', offset(bamboo, 18, 10, 54), offset(bamboo, 6, 15, -40), true),
        frame(0.32, '竹岸之间看江', [-10, 16, 58], [12, 20, -54]),
        frame(0.43, '水面与群峰倒影', [8, 14, 55], [16, 19, -64]),
        frame(0.66, '竹筏与两岸', offset(raft, -16, 7, 24), offset(raft, 0, 3, -12), true),
        frame(0.87, '江天开阔', [48, 28, 97], [12, 16, -46]),
        overview(p, 1),
      ];
      break;
    }
    case 'wuhan': {
      const flower: Vec3 = WUHAN_FLOWER_FOCUS;
      const stone = ground(p, -18.5, wuhanPath(-18.5) - 1.2, 0.06);
      const shelter = ground(p, 23, wuhanPath(23) + 1.6, 3.1);
      frames = [
        overview(p, 0),
        frame(0.1, '临湖桂树与石径', [-38, 12, -28], [-15, 5, 15]),
        frame(0.21, '桂枝与临湖石径', offset(flower, 5, 3.5, -14), flower, true),
        frame(0.32, '细雨里的花与叶', offset(flower, 3.5, 2.5, -11), flower, true),
        frame(0.43, '落桂石径与湖岸', offset(stone, 8, 6, -20), offset(stone, -2, 2, 0), true),
        frame(0.66, '湖亭与烟水', offset(shelter, -18, 10, -30), offset(shelter, 0, 2, 0), true),
        frame(0.87, '烟水与远岸', [36, 8, -3], [6, 4, -94]),
        overview(p, 1),
      ];
      break;
    }
    case 'arctic': {
      frames = [
        overview(p, 0),
        frame(0.1, '冰湾初见', [-4, 11, 48], [-9, 7, -30]),
        frame(0.24, '浮冰与企鹅', [10, 3.3, 22], [5, 1, 12], true),
        frame(0.38, '白熊与企鹅玩耍', [-3, 5.3, 27], [-11, 1.6, 12], true),
        frame(0.46, '雪岸玩伴', [-2, 5, 26], [-11, 1.6, 12], true),
        frame(0.55, '极光升起', [20, 10, 60], [0, 45, -70]),
        frame(0.7, '冰川壁近看', [-10, 18, -18], [-12, 16, -75]),
        frame(0.86, '长夜回望', [52, 24, 88], [-6, 16, -34]),
        overview(p, 1),
      ];
      break;
    }
    case 'dunhuang': {
      frames = [
        overview(p, 0),
        frame(0.1, '沙海见窟', [-28, 16, 78], [4, 12, -40]),
        frame(0.24, '九层楼', [-16, 12, -16], [2, 14, -42], true),
        frame(0.38, '天光入室', [-6, 6, -20], [-12, 8, -48], true),
        frame(0.52, '飞天与藻井', [2, 9, -30], [-4, 14, -50], true),
        frame(0.68, '月照驼铃', [30, 22, 6], [72, 10, -26]),
        frame(0.86, '窟前星河', [24, 18, 60], [0, 20, -50]),
        overview(p, 1),
      ];
      break;
    }
    case 'huangshan': {
      const pine = ground(p, -20, -6, 4.5);
      frames = [
        overview(p, 0),
        frame(0.1, '石阶穿松', [-40, 10, 46], [-24, 6, 10]),
        frame(0.24, '迎客松', offset(pine, 9.5, 1, 8), pine, true),
        frame(0.4, '花岗岩柱峰', [6, 22, 24], [10, 30, -45]),
        frame(0.55, '云海涌动', [26, 30, 55], [-4, 10, -40]),
        frame(0.7, '天都远眺', [-2, 40, 30], [8, 44, -70]),
        frame(0.86, '夕照松声', [30, 26, 80], [20, 22, -30]),
        overview(p, 1),
      ];
      break;
    }
    case 'xihu': {
      frames = [
        overview(p, 0),
        frame(0.1, '雨后湖岸', [-30, 12, 60], [0, 6, 8]),
        frame(0.24, '断桥三人', [-16, 5, 22], [-7, 2.6, 8], true),
        frame(0.4, '柳浪与荷', [8, 6, 30], [30, 2, 12], true),
        frame(0.58, '雷峰塔影', [-24, 10, -6], [0, 12, -28], true),
        frame(0.75, '乌篷双舟', [16, 4, -2], [30, 1.5, -18]),
        frame(0.88, '南屏晚钟', [40, 16, 40], [0, 14, -30]),
        overview(p, 1),
      ];
      break;
    }
    case 'kanas': {
      frames = [
        overview(p, 0),
        frame(0.1, '湖谷入秋', [-40, 18, 70], [-10, 8, 0]),
        frame(0.24, '白桦换色', [-36, 5, 16], [-52, 6, -4], true),
        frame(0.4, '木屋炊烟', [1, 8, 11], [-12, 4, -8], true),
        frame(0.58, '湖雾回湾', [20, 14, 30], [-10, 3, -26]),
        frame(0.74, '青玉湖湾', [36, 22, 50], [0, 6, -40]),
        frame(0.88, '牧歌暮色', [48, 18, 78], [12, 8, -16]),
        overview(p, 1),
      ];
      break;
    }
    case 'deepsea': {
      frames = [
        overview(p, 0),
        frame(0.1, '蓝光边界', [-30, 14, 70], [0, 8, -20]),
        frame(0.26, '珊瑚峡谷', [20, 6, -18], [38, 8, -52], true),
        frame(0.44, '鲸影经过', [-10, 14, -34], [18, 17, -62], true),
        frame(0.6, '蓝眼泪光带', [-6, 4, 6], [-30, 2, -28], true),
        frame(0.78, '水母上浮', [10, 10, -8], [16, 18, -30]),
        frame(0.9, '无光之海', [40, 20, 50], [-10, 8, -50]),
        overview(p, 1),
      ];
      break;
    }
    case 'sakura': {
      frames = [
        overview(p, 0),
        frame(0.1, '谷口晨雾', [-24, 16, 90], [-6, 22, -120]),
        frame(0.24, '樱并木夹岸', [-8, 6, -2], [10, 7, -30], true),
        frame(0.4, '太鼓桥', [-12, 4, -14], [2, 5, -26], true),
        frame(0.56, '街町与五重塔', [12, 8, -22], [36, 12, -42], true),
        frame(0.72, '千本鸟居', [-18, 5, -6], [-26, 5, -34], true),
        frame(0.88, '湖上大鸟居', [10, 9, -48], [0, 7, -80]),
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
  if(painting.id==='roadster')return sampleRoadsterMotion(progress);
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
  // Clearance supplements the authored composition; it does not impose a human eye height.
  eye[1] = Math.max(eye[1], groundHeight(painting, eye[0], eye[2]) + 0.55, 0.55);
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
