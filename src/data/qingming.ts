import type { Painting } from '../types';

/** Spatial interpretation of the Palace Museum's Northern Song scroll. */
export const QINGMING: Painting = {
  id: 'qingming',
  title: '清明上河图',
  shortTitle: '清明上河',
  english: 'ALONG THE RIVER AT QINGMING',
  artist: '张择端',
  era: '北宋',
  technique: '绢本 · 淡设色',
  tagline: '一河烟火，半卷人间。',
  introduction:
    '从郊野阡陌，沿汴河穿过虹桥，走入东角子门。船工、行旅与街边铺席，在同一卷春日里相逢。',
  accent: '#805a38',
  palette: {
    sky: '#e7decc',
    water: '#8b9f94',
    low: '#b8aa80',
    high: '#8b8e6a',
    ink: '#4a4737',
    leaf: '#69765a',
  },
  seed: 1120,
  peaks: [],
  overview: { eye: [152, 113, 183], target: [0, 2, -23] },
  route: [
    [-119, 4, 25],
    [-74, 4, 18],
    [-20, 11, 3.3],
    [30, 4, -23],
    [55, 4, -45],
    [114, 4, -45],
  ],
  chapters: [
    {
      title: '郊野春行',
      subtitle: 'THE OUTSKIRTS',
      description: '低檐、阡陌与疏柳。行人从郊野走来，汴京还在前方。',
      progress: 0,
    },
    {
      title: '汴河舟楫',
      subtitle: 'THE BIAN RIVER',
      description: '货船泊岸，舟楫穿行。两岸铺席沿着水路聚集。',
      progress: 0.2,
    },
    {
      title: '虹桥相会',
      subtitle: 'THE RAINBOW BRIDGE',
      description: '木梁交错架起虹桥。桥上车马与商贩相逢，桥下漕船缓缓通过。',
      progress: 0.4,
    },
    {
      title: '东角子门',
      subtitle: 'THE CITY GATE',
      description: '越过门洞，街道由疏而密。城墙将郊野与市井连在一起。',
      progress: 0.65,
    },
    {
      title: '人间烟火',
      subtitle: 'THE MARKET STREETS',
      description: '茶肆、酒楼与敞棚相接。走进长卷，也走进寻常的一日。',
      progress: 0.83,
    },
  ],
  source: 'https://www.dpm.org.cn/collection/paint/228226.html',
};
