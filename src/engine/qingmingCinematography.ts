import type { CinematicKeyframe } from './cinematography';
import { qingmingBridgeHeight, qingmingRiver } from './cityLayout';
import { QINGMING_SCROLL_FOCI } from './qingmingScroll';

const river = qingmingRiver(-20);
const frames: readonly CinematicKeyframe[] = [
  { progress: 0, subject: '卷首郊野与疏林', eye: [-136, 20, -5], target: [-111, 5, -43] },
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
  { progress: 0.56, subject: '沿街入城', eye: [23, 14, -31], target: [48, 6, -45] },
  { progress: 0.65, subject: '砖门楼与城外交通', eye: [43, 10, -30], target: [55, 7, -45] },
  {
    progress: 0.72,
    subject: '挽具与货车',
    eye: [48, 5.2, -37.5],
    target: [46, 4, -45.2],
    detail: true,
  },
  { progress: 0.79, subject: '城内街坊', eye: [70, 13, -31], target: [91, 5, -52] },
  {
    progress: 0.83,
    subject: '酒肆欢门与邻铺',
    eye: [89, 8, -40],
    target: [84.4, 6.2, -48.2],
    detail: true,
  },
  {
    progress: 0.93,
    subject: '卷尾巷院与铺席',
    eye: [111, 8.7, -61],
    target: QINGMING_SCROLL_FOCI.courtyard,
    detail: true,
  },
  { progress: 1, subject: '城内市井收卷', eye: [138, 29, -23], target: [96, 5, -61] },
];

/** Reading-order sequence, not a reconstruction of the scroll's axonometric camera. */
export function getQingmingKeyframes(): readonly CinematicKeyframe[] {
  return frames;
}
