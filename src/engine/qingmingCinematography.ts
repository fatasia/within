import type { CinematicKeyframe } from './cinematography';
import { qingmingBridgeHeight, qingmingRiver } from './cityLayout';
import { QINGMING_SCROLL_FOCI } from './qingmingScroll';

const river = qingmingRiver(-20);
const frames: readonly CinematicKeyframe[] = [
  { progress: 0, subject: '全卷总览：郊野至城内', eye: [0, 176, 216], target: [0, 2.8, -29] },
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
    eye: [-78, 8, 15],
    target: [-68, 2, qingmingRiver(-68) + 6],
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
    progress: 0.44,
    subject: '木栏与桥头铺席',
    eye: [-19, qingmingBridgeHeight(river + 10) + 2.1, river + 10],
    target: [-23, qingmingBridgeHeight(river + 5) + 1, river + 5],
    detail: true,
  },
  { progress: 0.51, subject: '虹桥至城门的连续街市', eye: [1, 50, 35], target: [5, 3, -37] },
  { progress: 0.56, subject: '沿街入城', eye: [23, 14, -31], target: [48, 6, -45] },
  { progress: 0.65, subject: '砖门楼与城外交通', eye: [43, 10, -30], target: [55, 7, -45] },
  {
    progress: 0.72,
    subject: '挽具与货车',
    eye: [48, 5.2, -37.5],
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
    eye: [89, 8, -40],
    target: [84.4, 6.2, -48.2],
    detail: true,
  },
  {
    progress: 0.885,
    subject: '八行铺面与柜台货品',
    eye: [105, 6.2, -43],
    target: [109.6, 4.3, -52],
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
export function getQingmingKeyframes(): readonly CinematicKeyframe[] {
  return frames;
}
