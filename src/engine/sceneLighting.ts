import { Color } from 'three';
import type { Painting, PaintingId, TimeMode } from '../types';
import { clamp } from './math';

const qingmingGolden = new Color('#ffc27b');
const qingmingDuskHorizon = new Color().setRGB(0.95, 0.57, 0.29);
const qingmingNightHorizon = new Color().setRGB(0.043, 0.072, 0.117);

interface LightingPalette {
  direct: readonly [number, number];
  fill: readonly [number, number];
  sun: readonly [string, string];
  ambient: readonly [string, string];
  ground: readonly [string, string];
  dusk: string;
  duskStrength: number;
  nightSky: string;
  daySky?: string;
  fog: readonly [number, number];
  mist: number;
}

/** Interpretive seasonal light, not a claim to measured lighting in the source paintings. */
export const SCENE_LIGHTING: Readonly<Record<PaintingId, LightingPalette>> = {
  roadster: {
    direct: [1.4, 1.5],
    fill: [1.3, 1.4],
    sun: ['#bedde9', '#bedde9'],
    ambient: ['#8ca1bf', '#8ca1bf'],
    ground: ['#283347', '#283347'],
    dusk: '#233b4b',
    duskStrength: 0,
    nightSky: '#07131f',
    daySky: '#07131f',
    fog: [45, 260],
    mist: 0,
  },
  qianli: {
    direct: [1.55, 0.65],
    fill: [1.42, 0.96],
    sun: ['#f0efdf', '#a5bfd6'],
    ambient: ['#e1e8dc', '#829fb4'],
    ground: ['#6c8067', '#2e4548'],
    dusk: '#c5b69c',
    duskStrength: 0.16,
    nightSky: '#304754',
    fog: [105, 450],
    mist: 0.13,
  },
  fuchun: {
    direct: [1.05, 0.52],
    fill: [1.52, 1.0],
    sun: ['#e6e4da', '#aabac6'],
    ambient: ['#e2e3d9', '#94a5ae'],
    ground: ['#858572', '#414d4a'],
    dusk: '#bebdb0',
    duskStrength: 0.09,
    nightSky: '#3e4c53',
    fog: [85, 410],
    mist: 0.2,
  },
  xishan: {
    direct: [1.28, 0.55],
    fill: [1.42, 1.0],
    sun: ['#e5e3d7', '#a8b8c6'],
    ambient: ['#d8ddd5', '#879da9'],
    ground: ['#777868', '#354442'],
    dusk: '#bcb7a8',
    duskStrength: 0.11,
    nightSky: '#34454c',
    fog: [120, 480],
    mist: 0.14,
  },
  starry: {
    direct: [1.2, 1.2],
    fill: [1.4, 1.4],
    sun: ['#a6bdd9', '#a6bdd9'],
    ambient: ['#829dc2', '#829dc2'],
    ground: ['#2d414d', '#2d414d'],
    dusk: '#25486a',
    duskStrength: 0,
    nightSky: '#183149',
    fog: [115, 460],
    mist: 0.08,
  },
  winter: {
    direct: [1.65, 1.65],
    fill: [1.18, 1.18],
    sun: ['#b2c6e0', '#b2c6e0'],
    ambient: ['#7d9cc4', '#7d9cc4'],
    ground: ['#354b6c', '#354b6c'],
    dusk: '#223650',
    duskStrength: 0,
    nightSky: '#223650',
    fog: [130, 530],
    mist: 0.07,
  },
  qingming: {
    direct: [2.05, 0.78],
    fill: [0.82, 1.2],
    sun: ['#fff5e8', '#a8bdcf'],
    ambient: ['#c7dce9', '#8ca8cb'],
    ground: ['#9d9583', '#858b9c'],
    dusk: '#cfb99a',
    duskStrength: 0.22,
    daySky: '#c3d6d9',
    nightSky: '#182737',
    fog: [125, 430],
    mist: 0.065,
  },
  zhangjiajie: {
    direct: [0.95, 0.4],
    fill: [1.65, 1.03],
    sun: ['#dfe7e0', '#9fb8c6'],
    ambient: ['#d7e3df', '#859faa'],
    ground: ['#6d7c69', '#304642'],
    dusk: '#b6c1b8',
    duskStrength: 0.1,
    nightSky: '#2b424a',
    fog: [42, 280],
    mist: 0.13,
  },
  guilin: {
    direct: [1.02, 0.43],
    fill: [1.63, 1.04],
    sun: ['#e2e8df', '#a4bcc8'],
    ambient: ['#dce5df', '#8ca3ad'],
    ground: ['#74816b', '#354b45'],
    dusk: '#bec5b7',
    duskStrength: 0.12,
    nightSky: '#30464f',
    fog: [48, 320],
    mist: 0.12,
  },
  wuhan: {
    direct: [0.62, 0.3],
    fill: [1.9, 0.85],
    sun: ['#e1e8de', '#91adbd'],
    ambient: ['#d9e5e0', '#809bab'],
    ground: ['#7b8068', '#283d40'],
    dusk: '#bbc9c2',
    duskStrength: 0.04,
    daySky: '#c8d4cf',
    nightSky: '#2d424a',
    fog: [45, 265],
    mist: 0.08,
  },
  arctic: {
    direct: [1.25, 1.15],
    fill: [1.65, 1.5],
    sun: ['#e9f4ff', '#c9def1'],
    ambient: ['#d2e8f0', '#a8c7da'],
    ground: ['#c2dae2', '#7898ac'],
    dusk: '#4c7297',
    duskStrength: 0.14,
    nightSky: '#0b2440',
    fog: [85, 430],
    mist: 0.14,
  },
  dunhuang: {
    direct: [1.35, 0.4],
    fill: [1.25, 0.65],
    sun: ['#f4c58d', '#bd7856'],
    ambient: ['#d6a276', '#754e58'],
    ground: ['#9d714c', '#352839'],
    dusk: '#8b4c4d',
    duskStrength: 0.26,
    nightSky: '#221c30',
    fog: [88, 410],
    mist: 0.13,
  },
  huangshan: {
    direct: [1.05, 0.46],
    fill: [1.52, 0.86],
    sun: ['#e6e6d4', '#8ea9bd'],
    ambient: ['#c8d7d0', '#647c87'],
    ground: ['#667d68', '#293f43'],
    dusk: '#a2aeb0',
    duskStrength: 0.17,
    nightSky: '#253847',
    fog: [40, 250],
    mist: 0.2,
  },
  xihu: {
    direct: [0.9, 0.35],
    fill: [1.62, 0.82],
    sun: ['#dbe7e3', '#7f9cab'],
    ambient: ['#c7d9d5', '#526b76'],
    ground: ['#607665', '#283e43'],
    dusk: '#9aabb0',
    duskStrength: 0.16,
    nightSky: '#263a48',
    fog: [48, 300],
    mist: 0.2,
  },
  kanas: {
    direct: [1.2, 0.45],
    fill: [1.42, 0.82],
    sun: ['#f0d19e', '#8aa5b3'],
    ambient: ['#d9d5bb', '#5f7380'],
    ground: ['#6e754f', '#293e48'],
    dusk: '#9d8060',
    duskStrength: 0.22,
    nightSky: '#263b4a',
    fog: [62, 330],
    mist: 0.18,
  },
  deepsea: {
    direct: [1.15, 1.05],
    // Keep bioluminescent details readable at the forced night exposure.
    fill: [1.85, 1.75],
    sun: ['#8bd5e8', '#85bed8'],
    ambient: ['#82becd', '#77acc2'],
    ground: ['#3c7585', '#32546e'],
    dusk: '#083e59',
    duskStrength: 0,
    nightSky: '#12394f',
    fog: [70, 320],
    mist: 0.1,
  },
  sakura: {
    direct: [1.25, 0.4],
    fill: [1.55, 0.8],
    sun: ['#f2ead8', '#93a7b8'],
    ambient: ['#dfe6da', '#5e7382'],
    ground: ['#6f7c5c', '#283c40'],
    dusk: '#e2b4a4',
    duskStrength: 0.2,
    nightSky: '#22303e',
    fog: [55, 340],
    mist: 0.15,
  },
  empire: {
    direct: [1.65, 0.65],
    fill: [1.38, 1.0],
    sun: ['#ede4d2', '#aabbd1'],
    ambient: ['#dfe2d7', '#92a3b4'],
    ground: ['#7d8066', '#394a47'],
    dusk: '#c1a489',
    duskStrength: 0.22,
    nightSky: '#344653',
    fog: [110, 480],
    mist: 0.12,
  },
};

const paletteColors = Object.fromEntries(
  Object.entries(SCENE_LIGHTING).map(([id, p]) => [
    id,
    {
      sun: p.sun.map((c) => new Color(c)),
      ambient: p.ambient.map((c) => new Color(c)),
      ground: p.ground.map((c) => new Color(c)),
      dusk: new Color(p.dusk),
      night: new Color(p.nightSky),
      day: p.daySky ? new Color(p.daySky) : null,
    },
  ]),
) as Record<
  PaintingId,
  { sun: Color[]; ambient: Color[]; ground: Color[]; dusk: Color; night: Color; day: Color | null }
>;
const stormSky = new Color('#596161'),
  stormSun = new Color('#b0b6ad');
const aftermathSky = new Color('#8b8d88'),
  aftermathSun = new Color('#d0c3a6');

export interface SceneLightingState {
  night: number;
  background: Color;
  sunColor: Color;
  sunIntensity: number;
  ambientColor: Color;
  ambientIntensity: number;
  groundColor: Color;
  fogColor: Color;
  fogNear: number;
  fogFar: number;
  mistColor: Color;
  mistOpacity: number;
}

export function createLightingState(): SceneLightingState {
  return {
    night: 0,
    background: new Color(),
    sunColor: new Color(),
    sunIntensity: 1,
    ambientColor: new Color(),
    ambientIntensity: 1,
    groundColor: new Color(),
    fogColor: new Color(),
    fogNear: 100,
    fogFar: 450,
    mistColor: new Color(),
    mistOpacity: 0.1,
  };
}

export function resolveSceneNight(id: PaintingId, time: TimeMode, progress: number): number {
  if (isNightScene(id)) return 1;
  return time === 'night'
    ? 1
    : time === 'day'
      ? 0
      : time === 'sunset'
        ? 0.4
        : clamp((progress - 0.48) * 2);
}

/** Shared by the renderer and UI so labels never use daylight ink over a night scene. */
export function isNightScene(id: PaintingId): boolean {
  return (
    id === 'roadster' || id === 'starry' || id === 'winter' || id === 'arctic' || id === 'deepsea'
  );
}

/** Reuse out across frames; the caller owns exponential smoothing of the night value. */
export function sampleSceneLighting(
  painting: Painting,
  night: number,
  mist: boolean,
  period: number,
  out: SceneLightingState,
): SceneLightingState {
  const id = painting.id,
    p = SCENE_LIGHTING[id],
    c = paletteColors[id];
  const n = id === 'starry' || id === 'winter' ? 1 : clamp(night);
  out.night = n;
  out.background.set(painting.palette.sky);
  if (c.day) out.background.copy(c.day);
  out.background.lerp(c.dusk, Math.sin(n * Math.PI) * p.duskStrength).lerp(c.night, n);
  out.sunColor.copy(c.sun[0]!).lerp(c.sun[1]!, n);
  out.ambientColor.copy(c.ambient[0]!).lerp(c.ambient[1]!, n);
  out.groundColor.copy(c.ground[0]!).lerp(c.ground[1]!, n);
  out.sunIntensity = p.direct[0] + (p.direct[1] - p.direct[0]) * n;
  out.ambientIntensity = p.fill[0] + (p.fill[1] - p.fill[0]) * n;
  out.fogNear = mist ? p.fog[0] : 260;
  out.fogFar = mist ? p.fog[1] : 700;
  out.mistOpacity = mist ? p.mist : 0;
  if (id === 'empire') {
    const stage = Math.round(clamp(period, 0, 4));
    if (stage === 3) {
      out.background.lerp(stormSky, 0.68 - n * 0.25);
      out.sunColor.lerp(stormSun, 0.65);
      out.sunIntensity *= 0.42;
      out.ambientIntensity *= 0.83;
      if (mist) {
        out.fogNear = 70;
        out.fogFar = 350;
        out.mistOpacity = 0.16;
      }
    } else if (stage === 4) {
      out.background.lerp(aftermathSky, (1 - n) * 0.3);
      out.sunColor.lerp(aftermathSun, (1 - n) * 0.26);
      out.sunIntensity *= 0.74;
      if (mist) out.fogFar = 520;
    }
  }
  if (id === 'qingming') {
    const golden = Math.exp(-Math.pow((n - 0.4) * 6, 2));
    out.sunColor.lerp(qingmingGolden, golden * 0.82);
    // Fog terminates at the same linear horizon radiance as the sky shader.
    // Hex/sRGB values here would leave a blue-grey strip below the warm dusk sky.
    const skyGolden = Math.exp(-Math.pow((n - 0.4) * 5, 2));
    const nightBlend = clamp((n - 0.48) / 0.4);
    out.background
      .setRGB(0.67, 0.77, 0.8)
      .lerp(qingmingDuskHorizon, skyGolden * 0.78)
      .lerp(qingmingNightHorizon, nightBlend * nightBlend * (3 - 2 * nightBlend));
    out.sunIntensity *= 1 - golden * 0.15;
  }
  out.fogColor.copy(out.background);
  out.mistColor.copy(out.background).lerp(out.ambientColor, (1 - n) * 0.16);
  return out;
}
