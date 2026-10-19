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
    '由卷首村舍与疏林，沿汴河经过虹桥，穿过城门走到卷尾街坊。五段场景串起全卷叙事，可打开北宋原本完整画卷逐段对照。',
  accent: '#805a38',
  palette: {
    sky: '#c5d2d7',
    water: '#698882',
    low: '#a39b89',
    high: '#868778',
    ink: '#4a4737',
    leaf: '#69765a',
  },
  seed: 1120,
  peaks: [],
  overview: { eye: [-51, 20, 48], target: [-15, 9, -7] },
  route: [
    [-126, 4, -43],
    [-100, 4, -28],
    [-74, 4, -15],
    [-20, 11, 3.3],
    [-14, 4, -21],
    [8, 4, -29.4],
    [30, 4, -41.5],
    [55, 4, -45],
    [92, 4, -45],
    [113, 4, -63],
  ],
  chapters: [
    {
      title: '汴京展卷',
      subtitle: 'THE OUTSKIRTS',
      description: '虹桥横跨汴河，两岸街屋与舟楫交错；从这里展卷，再沿郊野、河市与城门走进汴京。',
      progress: 0,
    },
    {
      title: '汴河舟楫',
      subtitle: 'THE BIAN RIVER',
      description: '货船靠近木栈台，坡板连接河岸；搬货人对面接住货包，舟运与岸边铺席在此衔接。',
      progress: 0.2,
    },
    {
      title: '虹桥相会',
      subtitle: 'THE RAINBOW BRIDGE',
      description: '卧桅工作船进入木拱桥下，船工守着绳索与桅架；上方桥板、栏杆和铺席连成热闹街道。',
      progress: 0.4,
    },
    {
      title: '东角子门',
      subtitle: 'THE CITY GATE',
      description:
        '门洞保留一条穿城通道，近看能辨砖缝、门扇与楼上木构柱廊；越过城墙，街屋变得密集。',
      progress: 0.65,
    },
    {
      title: '人间烟火',
      subtitle: 'THE MARKET STREETS',
      description:
        '欢门与邻铺接续城内街道，后巷围合成小院；从门前铺席走到卷尾，看街屋由近处延展开。',
      progress: 0.83,
    },
  ],
  source: 'https://www.dpm.org.cn/collection/paint/228226.html',
};
