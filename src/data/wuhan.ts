import type { Painting } from '../types';
import { WUHAN_HILLS, wuhanPath } from '../engine/wuhanLayout';

export const WUHAN_PAINTING: Painting = {
  id: 'wuhan',
  title: '武汉 · 桂雨东湖',
  shortTitle: '桂雨东湖',
  english: 'EAST LAKE · OSMANTHUS IN THE RAIN',
  artist: '中国 · 湖北',
  era: '自然景观',
  technique: '东湖桂园 · 实景意象',
  tagline: '雨落桂香，湖山在侧。',
  introduction:
    '以东湖磨山桂园为灵感的秋日湖岸。沿湿润石路走入金桂树影，在一场细雨里，靠近花簇、枝叶与湖上的涟漪。',
  accent: '#867447',
  seed: 4301,
  palette: {
    sky: '#c6d2ca',
    water: '#688e83',
    low: '#687653',
    high: '#75856b',
    ink: '#3d5146',
    leaf: '#3e6043',
  },
  peaks: WUHAN_HILLS.map((peak) => ({ ...peak, profile: 'wuhan' })),
  overview: { eye: [74, 39, 107], target: [8, 4, 0] },
  route: [-104, -65, -25, 15, 55, 101].map((x) => [x, 2, wuhanPath(x)] as const),
  chapters: [
    {
      title: '桂园初雨',
      subtitle: 'THE FIRST RAIN',
      description: '湖风送来微凉细雨，桂树沿岸铺开；从湿润石路出发，慢慢走进秋日东湖。',
      progress: 0,
    },
    {
      title: '枝间金粟',
      subtitle: 'GOLD AMONG THE LEAVES',
      description: '走近树下，看金色小花聚在叶腋；厚实的对生叶片带着雨光，枝影轻轻交叠。',
      progress: 0.21,
    },
    {
      title: '石径听雨',
      subtitle: 'THE WET STONE PATH',
      description: '落桂聚在树影下，也散进深浅不一的湿石缝里；低头看一会儿，细雨还在轻轻落。',
      progress: 0.43,
    },
    {
      title: '湖亭小歇',
      subtitle: 'SHELTER BY THE LAKE',
      description: '在临湖小亭里停一停，越过屋檐望向远岸；一圈圈雨纹把倒影缓缓揉开。',
      progress: 0.66,
    },
    {
      title: '烟水归香',
      subtitle: 'SCENT OVER THE WATER',
      description: '暮色沿湖面渐深，亭灯映亮湿石；回望走过的桂树林，花香与细雨仍留在岸边。',
      progress: 0.87,
    },
  ],
  source: 'https://www.wuhan.gov.cn/zjwh/whly/202410/t20241012_2467368.shtml',
};
