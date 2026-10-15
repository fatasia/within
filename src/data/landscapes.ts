import type { Painting, Peak } from '../types';

const pillar = (x: number, z: number, radius: number, height: number, seed: number): Peak => ({
  profile: 'zhangjiajie',
  x,
  z: z - 14,
  radius,
  height: height * (z > -20 ? 0.72 : 0.9),
  seed,
  stretch: 0.86,
});
const karst = (x: number, z: number, radius: number, height: number, seed: number): Peak => ({
  profile: 'guilin',
  x,
  z: z < 0 ? z - 18 : z,
  radius,
  height: height * (z < 0 ? 0.66 : 0.8),
  seed,
  stretch: 0.79,
});

/** Interpretive landscapes: characteristic landforms, not a surveyed digital twin. */
export const REAL_LANDSCAPES: Painting[] = [
  {
    id: 'zhangjiajie',
    title: '武陵源 · 云起峰林',
    shortTitle: '张家界',
    english: 'WULINGYUAN · FOREST OF STONE',
    artist: '中国 · 湖南',
    era: '自然景观',
    technique: '石英砂岩峰林 · 实景意象',
    tagline: '石峰入云，溪声在下。',
    introduction:
      '沿谷底溪流走入武陵源。砂岩石柱从林海间升起，峰顶松影与低云交错，远近都藏着尺度。',
    accent: '#66775d',
    seed: 640,
    palette: {
      sky: '#dce3dc',
      water: '#608d80',
      low: '#54614a',
      high: '#a49b83',
      ink: '#39483e',
      leaf: '#304b37',
    },
    peaks: [
      pillar(-112, -86, 14, 76, 11),
      pillar(-83, -99, 13, 94, 12),
      pillar(-54, -82, 12, 83, 13),
      pillar(-28, -102, 15, 101, 14),
      pillar(6, -91, 13, 78, 15),
      pillar(35, -104, 15, 107, 16),
      pillar(69, -87, 13, 86, 17),
      pillar(99, -101, 15, 94, 18),
      pillar(125, -79, 12, 68, 19),
      pillar(-101, -47, 12, 87, 21),
      pillar(-71, -49, 14, 112, 22),
      pillar(-37, -41, 11, 79, 23),
      pillar(-9, -57, 15, 105, 24),
      pillar(24, -37, 12, 97, 25),
      pillar(52, -58, 14, 121, 26),
      pillar(84, -42, 11, 88, 27),
      pillar(113, -43, 15, 99, 28),
      pillar(-124, -12, 12, 66, 31),
      pillar(-88, -7, 10, 70, 32),
      pillar(-49, -9, 10, 58, 33),
      pillar(4, -8, 9, 53, 34),
      pillar(47, -9, 10, 72, 35),
      pillar(91, -2, 11, 61, 36),
    ],
    overview: { eye: [48, 30, 82], target: [-15, 38, -35] },
    route: [
      [-105, 2, 24],
      [-65, 2, 23],
      [-28, 2, 25],
      [10, 2, 28],
      [51, 2, 30],
      [93, 2, 28],
    ],
    chapters: [
      {
        title: '峰林初见',
        subtitle: 'THE STONE FOREST',
        description:
          '细长砂岩石柱在林木后方错落升起，柱顶的小树与谷底溪水相隔很远，先看清峰谷尺度。',
        progress: 0,
      },
      {
        title: '溪谷听泉',
        subtitle: 'THE STREAM',
        description: '溪边浅滩散着湿色岸石，石板沿水线铺成小路；从低处抬头，石峰越过树冠伸向天空。',
        progress: 0.22,
      },
      {
        title: '绝壁松影',
        subtitle: 'PINES ON THE CLIFF',
        description:
          '弯曲松干与扁平树冠停在石峰顶部，近峰岩面可见横向层纹；深绿树色衬出砂岩的灰黄。',
        progress: 0.43,
      },
      {
        title: '云过群峰',
        subtitle: 'PASSING CLOUDS',
        description: '近处石柱保留层纹与岩壁折面，后方峰林逐渐变淡；薄雾穿在山间，把几重距离分开。',
        progress: 0.66,
      },
      {
        title: '山海无声',
        subtitle: 'BEYOND THE RIDGES',
        description:
          '回望溪谷与岸边石路，前后石柱交错成林；远峰在青灰薄雾里相接，谷底只留一道水光。',
        progress: 0.87,
      },
    ],
    source: 'https://whc.unesco.org/en/list/640/',
  },
  {
    id: 'guilin',
    title: '漓江 · 黄布倒影',
    shortTitle: '桂林漓江',
    english: 'LI RIVER · MOUNTAINS IN THE WATER',
    artist: '中国 · 广西',
    era: '自然景观',
    technique: '兴坪山水 · 实景意象',
    tagline: '一江明镜，半岸青山。',
    introduction:
      '以兴坪黄布倒影一带为灵感。圆肩石峰临江而立，竹影、浅滩与一叶竹筏，把山水拉到身边。',
    accent: '#3d7d6b',
    seed: 2014,
    palette: {
      sky: '#e1e8df',
      water: '#609c88',
      low: '#506a45',
      high: '#788774',
      ink: '#304d42',
      leaf: '#355d3e',
    },
    peaks: [
      karst(-112, -65, 24, 57, 45),
      karst(-75, -67, 22, 71, 46),
      karst(-41, -64, 21, 84, 47),
      karst(-7, -70, 24, 58, 48),
      karst(27, -67, 22, 74, 49),
      karst(65, -70, 25, 91, 50),
      karst(104, -65, 26, 67, 51),
      karst(-101, -108, 29, 77, 52),
      karst(-40, -112, 30, 93, 53),
      karst(20, -110, 29, 82, 54),
      karst(82, -115, 29, 101, 55),
      karst(-127, 37, 16, 36, 56),
      karst(128, 41, 18, 45, 57),
    ],
    overview: { eye: [-52, 9, 47], target: [15, 15, -40] },
    route: [
      [-102, 2, 21],
      [-66, 2, 22],
      [-29, 2, 25],
      [10, 2, 28],
      [49, 2, 31],
      [93, 2, 31],
    ],
    chapters: [
      {
        title: '江上初晴',
        subtitle: 'AFTER THE RAIN',
        description:
          '圆肩石峰沿宽阔江面排开，较低近山与后排高峰彼此错开，岸边小石让远近更容易分辨。',
        progress: 0,
      },
      {
        title: '竹岸微风',
        subtitle: 'THE BAMBOO BANK',
        description:
          '近岸竹竿留着一节节细环，侧枝伸出狭长叶片；从竹丛间望出去，江面与石峰仍有留白。',
        progress: 0.21,
      },
      {
        title: '黄布倒影',
        subtitle: 'MOUNTAINS REFLECTED',
        description: '把视线放低，让宽阔江面占据前景；水纹与山色相叠，远岸圆肩石峰沿天际疏密展开。',
        progress: 0.43,
      },
      {
        title: '竹筏归来',
        subtitle: 'THE RAFT',
        description:
          '竹筏的并排竹竿与横向绑绳清晰可见，戴斗笠的人立在筏上持篙，岸边还有低矮木栈台。',
        progress: 0.66,
      },
      {
        title: '江天一色',
        subtitle: 'RIVER AND SKY',
        description:
          '江面向远处敞开，竹岸与竹筏退成小小细节；几重灰绿石峰相互掩映，天水之间留出空隙。',
        progress: 0.87,
      },
    ],
    source: 'https://www.liriver.org.cn/page/article/zglj.hbdy',
  },
];
