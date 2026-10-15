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
  overview: { eye: [-50, 25, 56], target: [-10, 8, -9] },
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
      description: '低檐村舍与疏柳散在河岸，田垄和木篱留在近处；沿土路向前看，密集的街屋还在远方。',
      progress: 0,
    },
    {
      title: '汴河舟楫',
      subtitle: 'THE BIAN RIVER',
      description: '货船与木栈台沿汴河排开，岸上放着成摞货包；两侧铺席靠近水路，生意与河岸相连。',
      progress: 0.2,
    },
    {
      title: '虹桥相会',
      subtitle: 'THE RAINBOW BRIDGE',
      description: '交错木梁托起弧形桥面，桥板、栏杆与小摊近在眼前；向两侧望去，可见汴河上的货船。',
      progress: 0.4,
    },
    {
      title: '东角子门',
      subtitle: 'THE CITY GATE',
      description: '门洞保留一条穿城通道，近看能辨砖缝、门扇与楼上窗格；越过城墙，街屋变得密集。',
      progress: 0.65,
    },
    {
      title: '人间烟火',
      subtitle: 'THE MARKET STREETS',
      description: '街边招牌与棚架相接，摊面摆着器物，木车载着货包；沿开阔街道，细看铺面的瓦与窗。',
      progress: 0.83,
    },
  ],
  source: 'https://www.dpm.org.cn/collection/paint/228226.html',
};
