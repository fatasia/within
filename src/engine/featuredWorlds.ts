import * as THREE from 'three';
import { buildRoadster } from './featuredRoadster';
import { buildArctic } from './featuredArctic';
import { buildDeepsea } from './featuredDeepsea';
import { buildDunhuang } from './featuredDunhuang';
import { buildHuangshan } from './featuredHuangshan';
import { buildKanas } from './featuredKanas';
import { buildSakura } from './featuredSakura';
import { buildXihu } from './featuredXihu';
import { featuredUpdate, type FeaturedUpdate } from './featuredShared';

export type FeaturedWorldKey =
  | 'arctic'
  | 'dunhuang'
  | 'huangshan'
  | 'xihu'
  | 'kanas'
  | 'deepsea'
  | 'sakura'
  | 'roadster';
export { featuredUpdate };
export type { FeaturedUpdate };

const aliases: Record<FeaturedWorldKey, readonly string[]> = {
  roadster: ['roadster', 'tesla'],
  arctic: ['arctic', 'polar', 'glacier', 'beiyingbingchuan', '北极冰川', '极光'],
  dunhuang: ['dunhuang', 'mogao', '敦煌', '莫高窟'],
  huangshan: ['huangshan', '黄山', '云海'],
  xihu: ['xihu', 'westlake', '西湖', '雷峰塔'],
  kanas: ['kanas', '喀纳斯', '秋林木屋'],
  deepsea: ['deepsea', 'deep-ocean', 'bioluminescent', '深海', '蓝眼泪'],
  sakura: ['sakura', 'cherry', 'cherry-blossom', '樱花河谷', '樱花', '泛舟'],
};

function keyOf(source: unknown): FeaturedWorldKey | undefined {
  const id = typeof source === 'string' ? source : (source as { id?: unknown } | null)?.id;
  if (typeof id !== 'string') return undefined;
  const normalized = id.trim().toLowerCase();
  return (Object.keys(aliases) as FeaturedWorldKey[]).find((key) =>
    aliases[key].some((alias) => alias.toLowerCase() === normalized),
  );
}

export function isFeaturedWorld(source: unknown): boolean {
  return keyOf(source) !== undefined;
}

const builders: Record<FeaturedWorldKey, () => THREE.Group> = {
  roadster: buildRoadster,
  arctic: buildArctic,
  dunhuang: buildDunhuang,
  huangshan: buildHuangshan,
  xihu: buildXihu,
  kanas: buildKanas,
  deepsea: buildDeepsea,
  sakura: buildSakura,
};

export function buildFeaturedWorld(source: unknown): THREE.Group {
  const key = keyOf(source);
  const group = key ? builders[key]() : new THREE.Group();
  group.userData.featuredWorld = key ?? 'unknown';
  group.userData.detailTier = 'cinematic-near';
  return group;
}
