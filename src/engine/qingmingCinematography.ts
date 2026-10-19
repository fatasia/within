import type { CinematicKeyframe } from './cinematography';
import { qingmingBridgeHeight, qingmingRiver } from './cityLayout';
import { QINGMING_SCROLL_FOCI } from './qingmingScroll';

const river = qingmingRiver(-20);
const frames: readonly CinematicKeyframe[] = [
  { progress: 0, subject: '汴京展卷：虹桥与两岸街市', eye: [-49, 32, 44], target: [-15, 5, -5] },
  { progress: 0.045, subject: '卷首郊野与疏林', eye: [-136, 20, -5], target: [-111, 5, -43] },
  {
    progress: 0.1,
    subject: '茅檐、篱院与村人',
    eye: [-103, 8, -21],
    target: QINGMING_SCROLL_FOCI.village,
    detail: true,
  },
  {
    progress: 0.2,
    subject: '汴河舟运',
    eye: [-111, 7, 18],
    target: [-101, 1.3, qingmingRiver(-101) + 4.5],
    detail: true,
  },
  {
    progress: 0.27,
    subject: '码头货包交接',
    eye: [-84, 7, -10],
    target: QINGMING_SCROLL_FOCI.landing,
    detail: true,
  },
  {
    progress: 0.36,
    subject: '虹桥卧桅过船',
    eye: [-33, 4.5, river + 7],
    target: [-25, 1.6, river - 0.5],
    detail: true,
  },
  {
    progress: 0.4,
    subject: '虹桥桥市、伞棚与卧桅舟',
    eye: [-42, 16, river + 27],
    target: [-20, 6.3, river],
  },
  {
    progress: 0.44,
    subject: '木栏与桥头铺席',
    eye: [-19, qingmingBridgeHeight(river + 10) + 2.1, river + 10],
    target: [-23, qingmingBridgeHeight(river + 5) + 1, river + 5],
    detail: true,
  },
  { progress: 0.51, subject: '虹桥至城门的连续街市', eye: [1, 50, 35], target: [5, 3, -37] },
  { progress: 0.56, subject: '沿街入城', eye: [23, 14, -43], target: [48, 6, -45] },
  { progress: 0.65, subject: '砖门楼与城外交通', eye: [17, 23, -38], target: [55, 10, -45] },
  {
    progress: 0.72,
    subject: '挽具与货车',
    eye: [40, 5.5, -43],
    target: [46, 4, -45.2],
    detail: true,
  },
  {
    progress: 0.79,
    subject: '驮货队与沿街顾客',
    eye: [83, 6.6, -42.4],
    target: [75, 4.7, -45.2],
    detail: true,
  },
  {
    progress: 0.83,
    subject: '酒肆欢门与邻铺',
    eye: [98, 8.5, -44],
    target: [84.4, 6.5, -55],
    detail: true,
  },
  {
    progress: 0.885,
    subject: '八行铺面与柜台货品',
    eye: [100, 8, -44],
    target: [108, 5, -53],
    detail: true,
  },
  {
    progress: 0.93,
    subject: '卷尾巷院与铺席',
    eye: [111, 8.7, -61],
    target: QINGMING_SCROLL_FOCI.courtyard,
    detail: true,
  },
  { progress: 0.975, subject: '卷尾街坊与院落群', eye: [110, 55, -4], target: [98, 4, -72] },
  { progress: 1, subject: '城内市井收卷', eye: [138, 29, -23], target: [96, 5, -61] },
];

/** Reading-order sequence, not a reconstruction of the scroll's axonometric camera. */
const portraitFrames: readonly CinematicKeyframe[] = frames.map((frame) => {
  // A 280m establishing shot makes the city and every gesture unreadable in a narrow viewport.
  // Preserve the same reading-order chapters, but frame a human-scale subject at each wide stop.
  const replacements: Record<string, Pick<CinematicKeyframe, 'eye' | 'target' | 'subject'>> = {
    '0': { eye: [-42, 23, 34], target: [-20, 7, 1], subject: '虹桥与汴京河市' },
    '0.045': { eye: [-112, 9, -17], target: [-110, 4.8, -33], subject: '茅檐下的生活' },
    '0.51': { eye: [-12, 14, river + 21], target: [-20, 8, river + 7], subject: '虹桥桥市' },
    '0.56': { eye: [31, 13, -43], target: [48, 5, -45], subject: '门前舟车与行人' },
    '0.975': { eye: [116, 10, -56], target: [113, 4.5, -68], subject: '巷院灯火' },
    '1': { eye: [110, 9, -39], target: [106, 4.8, -51], subject: '街市收卷' },
  };
  return { ...frame, ...replacements[String(frame.progress)] };
});
export function getQingmingKeyframes(portrait = false): readonly CinematicKeyframe[] {
  return portrait ? portraitFrames : frames;
}
