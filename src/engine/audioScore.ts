import type { PaintingId } from '../types';
import { seededRandom } from './math';

export type Voice = 'pluck' | 'flute' | 'felt' | 'bell' | 'pad';
export type FieldSound = 'bird' | 'drip' | 'wood' | 'oar' | 'chime' | 'insect';
export interface SoundPalette {
  title: string;
  description: string;
  tempo: number;
  root: number;
  scale: readonly number[];
  motif: readonly number[];
  voice: Voice;
  wind: number;
  water: number;
  rain?: number;
  market?: number;
  field: readonly FieldSound[];
  seed: number;
}

/** Original motifs, not transcriptions of recordings or existing compositions. */
export const SOUND_PALETTES: Record<PaintingId, SoundPalette> = {
  roadster: {title:'试车场',description:'低频氛围 · 风声',tempo:72,root:40,scale:[0,3,5,7,10],motif:[0,-1,2,-1,0,3,-1,1],voice:'pad',wind:.25,water:0,field:[],seed:2026},
  wuhan: {
    title: '桂雨入湖',
    description: '细雨 · 叶响 · 湖水 · 滴水',
    tempo: 44,
    root: 52,
    scale: [0, 2, 4, 7, 9],
    motif: [0, 3, 1, 2, 0, -1, 2, 1],
    voice: 'felt',
    wind: 0.18,
    water: 0.35,
    rain: 0.55,
    field: ['drip'],
    seed: 103,
  },
  qianli: {
    title: '青绿远汀',
    description: '山风 · 江水 · 远鸟 · 船桨',
    tempo: 50,
    root: 50,
    scale: [0, 2, 4, 7, 9],
    motif: [0, 2, 4, 3, 2, 1, 0, -1],
    voice: 'pluck',
    wind: 0.25,
    water: 0.48,
    field: ['bird', 'oar'],
    seed: 11,
  },
  fuchun: {
    title: '江渚闲弦',
    description: '江水 · 船桨 · 水滴 · 远鸟',
    tempo: 43,
    root: 48,
    scale: [0, 2, 5, 7, 9],
    motif: [2, 1, 0, -1, 0, 3, 1, 0],
    voice: 'pluck',
    wind: 0.2,
    water: 0.7,
    field: ['oar', 'bird', 'drip'],
    seed: 21,
  },
  xishan: {
    title: '空山回响',
    description: '山风 · 流水 · 远鸟 · 疏钟',
    tempo: 42,
    root: 45,
    scale: [0, 3, 5, 7, 10],
    motif: [0, 3, 2, 0, 1, -1, 0, 2],
    voice: 'flute',
    wind: 0.55,
    water: 0.85,
    field: ['bird', 'chime'],
    seed: 37,
  },
  starry: {
    title: '夜色的涟漪',
    description: '夜风 · 虫鸣 · 风铃',
    tempo: 48,
    root: 48,
    scale: [0, 2, 3, 7, 10],
    motif: [0, 2, 3, 5, 4, 3, 1, 2],
    voice: 'felt',
    wind: 0.22,
    water: 0,
    field: ['insect', 'chime', 'insect'],
    seed: 41,
  },
  empire: {
    title: '潮汐与石柱',
    description: '风声 · 水声 · 木响 · 远钟',
    tempo: 48,
    root: 43,
    scale: [0, 2, 3, 7, 9],
    motif: [0, 2, 4, 3, 1, 2, -1, 0],
    voice: 'felt',
    wind: 0.45,
    water: 0.62,
    field: ['wood', 'chime'],
    seed: 53,
  },
  winter: {
    title: '雪落之前',
    description: '林间风声 · 木响 · 疏钟',
    tempo: 38,
    root: 57,
    scale: [0, 2, 4, 7, 9],
    motif: [0, 3, 2, 1, 0, -1, 1, 0],
    voice: 'bell',
    wind: 0.7,
    water: 0,
    field: ['wood', 'chime'],
    seed: 67,
  },
  qingming: {
    title: '汴水春行',
    description: '市集底声 · 汴水 · 木响 · 船桨 · 远鸟',
    tempo: 64,
    root: 55,
    scale: [0, 2, 4, 7, 9],
    motif: [0, 1, 3, 2, 4, 3, 1, 0],
    voice: 'pluck',
    wind: 0.12,
    water: 0.48,
    market: 0.55,
    field: ['wood', 'oar', 'bird'],
    seed: 79,
  },
  zhangjiajie: {
    title: '云柱之间',
    description: '山风 · 流水 · 远鸟 · 水滴',
    tempo: 40,
    root: 50,
    scale: [0, 2, 5, 7, 9],
    motif: [0, 3, 4, 2, 1, 0, -1, 0],
    voice: 'flute',
    wind: 0.8,
    water: 0.3,
    field: ['bird', 'drip'],
    seed: 83,
  },
  guilin: {
    title: '烟雨漓歌',
    description: '江水 · 船桨 · 远鸟 · 水滴',
    tempo: 46,
    root: 53,
    scale: [0, 2, 4, 7, 9],
    motif: [2, 3, 1, 0, -1, 0, 2, 1],
    voice: 'flute',
    wind: 0.22,
    water: 0.82,
    field: ['oar', 'bird', 'drip'],
    seed: 97,
  },
  arctic: {
    title: '极夜冰湾',
    description: '极地风 · 冰裂 · 浮冰 · 极光低鸣',
    tempo: 36,
    root: 43,
    scale: [0, 2, 3, 7, 10],
    motif: [0, 2, 4, 3, 1, -1, 0, 2],
    voice: 'pad',
    wind: 0.78,
    water: 0.24,
    field: ['wood', 'drip', 'chime'],
    seed: 2401,
  },
  dunhuang: {
    title: '鸣沙星河',
    description: '沙风 · 驼铃 · 石窟回声 · 箜篌',
    tempo: 42,
    root: 46,
    scale: [0, 1, 4, 7, 8],
    motif: [0, 1, 3, 4, 2, 0, -1, 1],
    voice: 'pluck',
    wind: 0.52,
    water: 0,
    field: ['chime', 'wood', 'chime'],
    seed: 446,
  },
  huangshan: {
    title: '云海松声',
    description: '松涛 · 山泉 · 石阶 · 远钟',
    tempo: 40,
    root: 48,
    scale: [0, 2, 5, 7, 9],
    motif: [0, 3, 4, 2, 1, 0, -1, 0],
    voice: 'flute',
    wind: 0.68,
    water: 0.45,
    field: ['bird', 'drip', 'chime'],
    seed: 1548,
  },
  xihu: {
    title: '雨后湖声',
    description: '檐滴 · 柳浪 · 湖水 · 远钟',
    tempo: 44,
    root: 50,
    scale: [0, 2, 4, 7, 9],
    motif: [2, 1, 0, -1, 0, 3, 1, 0],
    voice: 'felt',
    wind: 0.28,
    water: 0.78,
    rain: 0.48,
    field: ['drip', 'bird', 'chime'],
    seed: 1106,
  },
  kanas: {
    title: '湖湾秋色',
    description: '白桦风 · 木屋 · 湖雾 · 远鸟',
    tempo: 41,
    root: 47,
    scale: [0, 2, 4, 7, 9],
    motif: [0, 2, 3, 1, -1, 0, 2, 1],
    voice: 'felt',
    wind: 0.48,
    water: 0.52,
    field: ['wood', 'bird', 'drip'],
    seed: 198,
  },
  deepsea: {
    title: '无光之海',
    description: '深海流 · 气泡 · 鲸歌 · 生物荧光',
    tempo: 32,
    root: 38,
    scale: [0, 3, 5, 7, 10],
    motif: [0, 3, 2, 5, 4, 2, -1, 0],
    voice: 'pad',
    wind: 0.1,
    water: 0.92,
    field: ['drip', 'chime', 'drip'],
    seed: 5021,
  },
  sakura: {
    title: '樱川舟歌',
    description: '古筝 · 船橹 · 河风 · 远钟',
    tempo: 44,
    root: 47,
    scale: [0, 2, 3, 7, 8],
    motif: [0, 2, 1, 3, 2, 0, -1, 2],
    voice: 'pluck',
    wind: 0.42,
    water: 0.62,
    field: ['oar', 'chime', 'bird'],
    seed: 3119,
  },
};

export interface ScoreNote {
  at: number;
  duration: number;
  midi: number;
  voice: Voice;
  velocity: number;
  pan: number;
}
export interface FieldEvent {
  at: number;
  kind: FieldSound;
  variant: number;
  pan: number;
}

export function scaleNote(root: number, scale: readonly number[], degree: number): number {
  const octave = Math.floor(degree / scale.length);
  return root + scale[((degree % scale.length) + scale.length) % scale.length]! + octave * 12;
}

export function phraseDuration(palette: SoundPalette): number {
  return (24 * 60) / palette.tempo;
}

export function composePhrase(
  id: PaintingId,
  phrase: number,
): { notes: ScoreNote[]; fields: FieldEvent[] } {
  const p = SOUND_PALETTES[id];
  const random = seededRandom(p.seed + phrase * 117);
  const beat = 60 / p.tempo;
  const notes: ScoreNote[] = [];
  // A three-bar phrase has room to breathe; the answer changes each fourth phrase.
  for (let i = 0; i < p.motif.length; i++) {
    const degree = p.motif[i]! + (phrase % 4 === 3 && i > 3 ? -1 : 0);
    notes.push({
      at: (i * 2.7 + 0.35 + random() * 0.09) * beat,
      duration: (p.voice === 'flute' ? 1.8 : 3.5) * beat,
      midi: scaleNote(p.root + 12, p.scale, degree),
      voice: p.voice,
      velocity: 0.065 + random() * 0.025,
      pan: (random() - 0.5) * 0.55,
    });
    if (i % 2 === 0 && p.voice !== 'bell')
      notes.push({
        at: (i * 2.7 + 1.65) * beat,
        duration: 3.2 * beat,
        midi: scaleNote(p.root, p.scale, degree + 2),
        voice: 'pluck',
        velocity: 0.027,
        pan: -0.38,
      });
  }
  for (let bar = 0; bar < 3; bar++) {
    const degree = [0, 3, 0][bar]!;
    for (const interval of [0, 3])
      notes.push({
        at: bar * 8 * beat,
        duration: 8 * beat,
        midi: scaleNote(p.root - 12, p.scale, degree + interval),
        voice: 'pad',
        velocity: 0.022,
        pan: interval ? 0.3 : -0.3,
      });
  }
  const fields = Array.from({ length: p.field.length === 0 ? 0 : id === 'qingming' ? 12 : 6 }, (_, i) => ({
    at: (1.2 + i * (id === 'qingming' ? 1.85 : 3.7) + random() * 0.5) * beat,
    kind: p.field[i % p.field.length]!,
    variant: random(),
    pan: (random() - 0.5) * 1.5,
  }));
  return { notes, fields };
}
