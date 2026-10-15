import { useEffect, useRef } from 'react';
import type { Painting } from '../types';
import { seededRandom } from '../engine/math';

type Canvas = CanvasRenderingContext2D;
type Point = readonly [number, number];
const W = 440,
  H = 160;

function polygon(ctx: Canvas, points: Point[], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function line(ctx: Canvas, points: Point[], color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function disc(ctx: Canvas, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function wash(ctx: Canvas, top: string, bottom: string) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}
function hill(ctx: Canvas, x: number, y: number, width: number, height: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.bezierCurveTo(
    x - width * 0.62,
    y - height * 0.12,
    x - width * 0.44,
    y - height * 0.92,
    x - width * 0.1,
    y - height,
  );
  ctx.bezierCurveTo(
    x + width * 0.31,
    y - height * 1.08,
    x + width * 0.28,
    y - height * 0.2,
    x + width,
    y,
  );
  ctx.closePath();
  ctx.fill();
}
function pine(ctx: Canvas, x: number, y: number, s: number, color: string) {
  line(
    ctx,
    [
      [x, y],
      [x - s * 0.08, y - s],
    ],
    color,
    Math.max(0.5, s * 0.04),
  );
  for (let i = 0; i < 4; i++) {
    const yy = y - s * (0.35 + i * 0.18),
      side = i % 2 ? -1 : 1;
    line(
      ctx,
      [
        [x, yy + s * 0.12],
        [x + side * s * 0.24, yy],
      ],
      color,
      Math.max(0.5, s * 0.035),
    );
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x + side * s * 0.15,
      yy,
      s * (0.28 - i * 0.035),
      s * 0.065,
      -0.15 * side,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
function ripples(ctx: Canvas, random: () => number, y: number, color: string, count = 40) {
  for (let i = 0; i < count; i++) {
    const x = random() * W,
      yy = y + random() * (H - y);
    line(
      ctx,
      [
        [x, yy],
        [x + 4 + random() * 25, yy],
      ],
      color,
      0.5,
    );
  }
}
function chineseHouse(ctx: Canvas, x: number, y: number, s: number, roof = '#596452') {
  ctx.fillStyle = '#d1c19b';
  ctx.fillRect(x - s * 0.6, y - s * 0.6, s * 1.2, s * 0.6);
  polygon(
    ctx,
    [
      [x - s * 0.85, y - s * 0.58],
      [x - s * 0.5, y - s * 0.72],
      [x, y - s],
      [x + s * 0.48, y - s * 0.72],
      [x + s * 0.85, y - s * 0.58],
    ],
    roof,
  );
  line(
    ctx,
    [
      [x - s * 0.63, y],
      [x - s * 0.63, y - s * 0.58],
      [x + s * 0.63, y - s * 0.58],
      [x + s * 0.63, y],
    ],
    '#594e3d',
    0.7,
  );
  ctx.fillStyle = '#605542';
  ctx.fillRect(x - s * 0.08, y - s * 0.4, s * 0.16, s * 0.4);
  for (const side of [-1, 1])
    ctx.fillRect(x + side * s * 0.37 - s * 0.07, y - s * 0.4, s * 0.14, s * 0.15);
}

function chineseLandscape(ctx: Canvas, painting: Painting, random: () => number) {
  const ink = painting.id !== 'qianli';
  wash(ctx, ink ? '#e6e0d0' : '#e9ddbd', ink ? '#bfc6b4' : '#a2b7a0');
  for (let layer = 0; layer < 3; layer++) {
    const color = ink
      ? ['#bcc2b3', '#9da998', '#687e6e'][layer]!
      : ['#9eb7a7', '#568e8a', '#2e6d74'][layer]!;
    for (let i = 0; i < 7; i++) {
      const x = i * 75 - 20 + layer * 18,
        height = (ink ? 28 : 49) + random() * 36;
      hill(ctx, x, 108 + layer * 10, 45 + random() * 27, height * (1 - layer * 0.15), color);
      if (!ink && layer === 2)
        line(
          ctx,
          [
            [x - 23, 128 - height * 0.29],
            [x - 13, 128 - height * 0.56],
            [x - 5, 128 - height * 0.67],
            [x + 3, 128 - height * 0.65],
          ],
          '#baab73',
          0.8,
        );
      if (ink && layer > 0)
        for (let k = 0; k < 12; k++) {
          const xx = x - 24 + random() * 40,
            yy = 102 + layer * 8 - random() * height * 0.5;
          line(
            ctx,
            [
              [xx, yy],
              [xx - 2, yy + 5 + random() * 12],
            ],
            '#66796955',
            0.5,
          );
        }
    }
  }
  const water = ctx.createLinearGradient(0, 110, 0, 160);
  water.addColorStop(0, ink ? '#dae0cf' : '#becbb3');
  water.addColorStop(1, ink ? '#d4d7c4' : '#8eada1');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, 121);
  ctx.bezierCurveTo(110, 107, 140, 149, 260, 119);
  ctx.bezierCurveTo(350, 101, 386, 126, 440, 122);
  ctx.lineTo(440, 160);
  ctx.lineTo(0, 160);
  ctx.fill();
  ripples(ctx, random, 124, '#eef0d666');
  hill(ctx, 53, 150, 80, 18, ink ? '#77856c' : '#5d805f');
  for (let i = 0; i < 9; i++)
    pine(
      ctx,
      13 + i * 12,
      145 - Math.sin(i * 0.5) * 6,
      13 + random() * 11,
      ink ? '#465c46' : '#294f40',
    );
  chineseHouse(ctx, 83, 137, 11);
  line(
    ctx,
    [
      [289, 142],
      [307, 142],
      [303, 145],
      [294, 145],
    ],
    '#5c6750',
    1.3,
  );
  line(
    ctx,
    [
      [298, 142],
      [298, 124],
    ],
    '#65705a',
    0.6,
  );
  polygon(
    ctx,
    [
      [298, 125],
      [297, 140],
      [289, 138],
    ],
    '#e4dfbd',
  );
}

function xishan(ctx: Canvas, random: () => number) {
  wash(ctx, '#d8d4bd', '#b4b9a3');
  hill(ctx, 68, 129, 105, 79, '#a0a68d');
  hill(ctx, 358, 132, 106, 102, '#9a9f86');
  polygon(
    ctx,
    [
      [120, 135],
      [145, 93],
      [154, 31],
      [172, 23],
      [187, 28],
      [198, 18],
      [223, 25],
      [244, 21],
      [265, 35],
      [277, 90],
      [309, 139],
    ],
    '#616b50',
  );
  polygon(
    ctx,
    [
      [198, 24],
      [207, 48],
      [197, 78],
      [213, 100],
      [204, 135],
      [277, 140],
      [266, 73],
      [251, 34],
    ],
    '#7b8060',
  );
  for (let i = 0; i < 150; i++) {
    const x = 158 + random() * 105,
      y = 38 + random() * 91;
    line(
      ctx,
      [
        [x, y],
        [x - 3, y + 5 + random() * 9],
      ],
      '#414e3b66',
      0.7,
    );
  }
  for (let i = 0; i < 21; i++)
    pine(ctx, 157 + i * 5.2, 33 + Math.sin(i * 0.9) * 4, 5 + random() * 5, '#354a38');
  line(
    ctx,
    [
      [264, 48],
      [262, 73],
      [269, 83],
      [267, 107],
      [275, 121],
    ],
    '#e0dfc5',
    2.1,
  );
  const mist = ctx.createLinearGradient(0, 103, 0, 137);
  mist.addColorStop(0, '#e2dfcb00');
  mist.addColorStop(0.7, '#e2dfcbd9');
  mist.addColorStop(1, '#e2dfcb00');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 103, 440, 36);
  hill(ctx, 71, 161, 113, 38, '#4c6148');
  hill(ctx, 369, 161, 100, 43, '#596b4e');
  for (let i = 0; i < 17; i++)
    pine(ctx, i < 9 ? 9 + i * 12 : 320 + (i - 9) * 14, 152, 13 + random() * 22, '#304b37');
  line(
    ctx,
    [
      [116, 155],
      [160, 145],
      [207, 147],
      [240, 141],
    ],
    '#d3c9a7',
    2,
  );
}

function starry(ctx: Canvas, random: () => number) {
  wash(ctx, '#102b4c', '#24536b');
  // Broken, directional paint marks: no concentric neon rings.
  for (let i = 0; i < 1250; i++) {
    const x = random() * W,
      y = random() * 115;
    const dx = x - 220,
      dy = (y - 49) * 2.6,
      distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(distance * 0.035) * 0.22;
    const length = 2 + random() * 6;
    const colors = ['#476e91', '#6988a1', '#294c7d', '#60898e', '#b3b486'];
    line(
      ctx,
      [
        [x, y],
        [x + Math.cos(angle) * length, y + Math.sin(angle) * length * 0.55],
      ],
      colors[i % 5]!,
      0.65 + random() * 0.75,
    );
  }
  for (const [x, y, size] of [
    [38, 28, 3],
    [103, 42, 4],
    [160, 18, 3],
    [286, 29, 3],
    [349, 57, 4],
  ] as const) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        radius = size * 2 + random() * 3;
      line(
        ctx,
        [
          [x + Math.cos(a) * radius, y + Math.sin(a) * radius],
          [x + Math.cos(a + 0.16) * radius, y + Math.sin(a + 0.16) * radius],
        ],
        i % 2 ? '#c3c481' : '#7c9d96',
        1,
      );
    }
    disc(ctx, x, y, size, '#e6d38b');
  }
  disc(ctx, 389, 28, 12, '#e6cf83');
  disc(ctx, 395, 24, 11, '#244c69');
  polygon(
    ctx,
    [
      [0, 121],
      [38, 103],
      [83, 111],
      [134, 95],
      [176, 107],
      [216, 93],
      [275, 110],
      [318, 96],
      [369, 109],
      [440, 101],
      [440, 160],
      [0, 160],
    ],
    '#1b3c50',
  );
  for (let i = 0; i < 36; i++) {
    const x = 96 + random() * 335,
      y = 119 + random() * 34,
      width = 7 + random() * 8;
    ctx.fillStyle = '#536775';
    ctx.fillRect(x, y, width, 8);
    polygon(
      ctx,
      [
        [x - 1, y],
        [x + width * 0.5, y - 6],
        [x + width + 1, y],
      ],
      '#172c40',
    );
    ctx.fillStyle = '#c4ad68';
    ctx.fillRect(x + 3, y + 3, 1.5, 2);
  }
  polygon(
    ctx,
    [
      [235, 145],
      [235, 117],
      [240, 113],
      [241, 92],
      [244, 113],
      [249, 117],
      [249, 145],
    ],
    '#718082',
  );
  polygon(
    ctx,
    [
      [30, 160],
      [37, 116],
      [34, 83],
      [44, 60],
      [47, 25],
      [55, 47],
      [62, 75],
      [61, 107],
      [72, 132],
      [78, 160],
    ],
    '#112f2f',
  );
  for (let i = 0; i < 35; i++) {
    const y = 63 + random() * 96,
      x = 43 + random() * 18;
    line(
      ctx,
      [
        [x, y],
        [x - 2, y - 10],
      ],
      '#3b5b43',
      0.8,
    );
  }
}

function qingming(ctx: Canvas, random: () => number) {
  wash(ctx, '#e4d8b9', '#b8b796');
  polygon(
    ctx,
    [
      [0, 83],
      [78, 80],
      [164, 91],
      [246, 79],
      [342, 84],
      [440, 74],
      [440, 160],
      [0, 160],
    ],
    '#c4b391',
  );
  for (let i = 0; i < 33; i++)
    chineseHouse(
      ctx,
      i * 15 - 10,
      84 + Math.sin(i * 0.4) * 10 + (i % 3) * 5,
      11 + (i % 4) * 2,
      i % 2 ? '#6c705c' : '#585e4d',
    );
  // Curving river separates dense streets rather than reading as another mountain scene.
  ctx.fillStyle = '#849b8b';
  ctx.beginPath();
  ctx.moveTo(0, 106);
  ctx.bezierCurveTo(128, 93, 260, 134, 440, 97);
  ctx.lineTo(440, 132);
  ctx.bezierCurveTo(280, 165, 124, 118, 0, 138);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 28; i++) {
    const x = random() * 440,
      y = 114 + Math.sin(x * 0.012) * 8 + random() * 8;
    line(
      ctx,
      [
        [x, y],
        [x + 8, y],
      ],
      '#c0c8ac',
      0.6,
    );
  }
  for (let i = 0; i < 15; i++)
    chineseHouse(ctx, i * 31 + 10, 156 + Math.sin(i) * 5, 14 + (i % 3) * 3);
  for (let side = 0; side < 3; side++) {
    ctx.strokeStyle = '#715039';
    ctx.lineWidth = side === 0 ? 5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(150, 134 + side * 3);
    ctx.bezierCurveTo(169, 92 + side * 2, 195, 92 + side * 2, 214, 139 + side * 3);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const t = i / 13,
      x = 151 + t * 62,
      y = 135 - Math.sin(t * Math.PI) * 30;
    line(
      ctx,
      [
        [x, y],
        [x + 1, y - 7],
      ],
      '#684c36',
      0.9,
    );
    if (i % 2) {
      disc(ctx, x, y - 10, 1, '#685440');
      line(
        ctx,
        [
          [x, y - 8],
          [x, y - 3],
        ],
        '#485e50',
        2,
      );
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = 57 + i * 123,
      y = 125 + Math.sin(x * 0.012) * 5;
    line(
      ctx,
      [
        [x - 10, y],
        [x + 10, y],
        [x + 5, y + 3],
        [x - 6, y + 3],
      ],
      '#68573f',
      1,
    );
    polygon(
      ctx,
      [
        [x, y - 26],
        [x - 9, y - 6],
        [x, y - 5],
      ],
      '#dbcca3',
    );
    line(
      ctx,
      [
        [x, y],
        [x, y - 27],
      ],
      '#6e654a',
      0.7,
    );
  }
  ctx.fillStyle = '#9b9279';
  ctx.fillRect(321, 47, 25, 42);
  ctx.fillRect(308, 72, 52, 19);
  ctx.fillStyle = '#6c7059';
  ctx.fillRect(330, 74, 8, 17);
  chineseHouse(ctx, 333, 54, 23);
  for (let i = 0; i < 8; i++) ctx.fillRect(309 + i * 7, 68, 4, 5);
  for (let i = 0; i < 10; i++)
    pine(ctx, 7 + i * 42, 100 + Math.sin(i) * 4, 12 + random() * 8, '#687854');
}

function guilin(ctx: Canvas, random: () => number) {
  wash(ctx, '#d8ddd0', '#86a9a0');
  for (let layer = 0; layer < 3; layer++) {
    const color = ['#a8bcb0', '#7c9c8d', '#456f63'][layer]!;
    for (let i = 0; i < 7; i++) {
      const x = i * 71 + layer * 22 - 15,
        height = 33 + random() * 50;
      hill(ctx, x, 109 + layer * 5, 21 + random() * 12, height, color);
      if (layer === 2) {
        ctx.save();
        ctx.translate(0, 238);
        ctx.scale(1, -0.42);
        hill(ctx, x, 280, 25, height, '#6b9586');
        ctx.restore();
      }
    }
  }
  const fog = ctx.createLinearGradient(0, 99, 0, 141);
  fog.addColorStop(0, '#d6dfcd00');
  fog.addColorStop(0.35, '#d6dfcdcf');
  fog.addColorStop(1, '#b1c8b200');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 99, W, 42);
  ripples(ctx, random, 125, '#cbd9c3', 50);
  line(
    ctx,
    [
      [237, 145],
      [269, 145],
    ],
    '#5c6241',
    3,
  );
  for (let i = 0; i < 5; i++)
    line(
      ctx,
      [
        [239, 143 + i * 0.6],
        [269, 143 + i * 0.6],
      ],
      '#bab88b',
      0.5,
    );
  line(
    ctx,
    [
      [254, 143],
      [254, 135],
      [258, 132],
    ],
    '#344f3f',
    2,
  );
  disc(ctx, 254, 131, 2, '#5d6040');
  line(
    ctx,
    [
      [258, 134],
      [273, 151],
    ],
    '#5d6040',
    0.7,
  );
  for (let i = 0; i < 5; i++) {
    const x = 9 + i * 7;
    line(
      ctx,
      [
        [x, 160],
        [x + 4, 100 - i * 3],
      ],
      '#355f47',
      1.2,
    );
    for (let j = 0; j < 5; j++)
      line(
        ctx,
        [
          [x + 2, 116 + j * 7],
          [x + (j % 2 ? 15 : -10), 108 + j * 7],
        ],
        '#355f47',
        1.5,
      );
  }
}

function zhangjiajie(ctx: Canvas, random: () => number) {
  wash(ctx, '#dce3d8', '#a9c5b9');
  for (let layer = 0; layer < 3; layer++) {
    const colors = ['#b0c2b7', '#809b8b', '#4e7162'];
    for (let i = 0; i < 10; i++) {
      const x = i * 49 + (layer % 2) * 24 - 10,
        height = 41 + random() * 63,
        top = 139 - height + layer * 5,
        width = 7 + random() * 12;
      polygon(
        ctx,
        [
          [x - width, 160],
          [x - width * 0.8, top + 14],
          [x - width * 0.6, top + 2],
          [x, top],
          [x + width * 0.45, top + 4],
          [x + width * 0.7, top + 18],
          [x + width * 0.9, 160],
        ],
        colors[layer]!,
      );
      for (let j = 0; j < 5; j++)
        line(
          ctx,
          [
            [x - width * 0.5 + j * width * 0.2, top + 13 + random() * 10],
            [x - width * 0.6 + j * width * 0.3, 157],
          ],
          layer === 2 ? '#354f4177' : '#7a968455',
          0.65,
        );
      if (layer === 2)
        for (let j = 0; j < 3; j++)
          pine(ctx, x - width * 0.4 + j * width * 0.3, top + 7, 5 + random() * 5, '#34583c');
    }
  }
  const fog = ctx.createLinearGradient(0, 98, 0, 160);
  fog.addColorStop(0, '#dce7dc00');
  fog.addColorStop(0.7, '#dce7dcd9');
  fog.addColorStop(1, '#a4c4b8');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 98, W, 62);
  polygon(
    ctx,
    [
      [0, 160],
      [0, 90],
      [20, 75],
      [37, 87],
      [44, 121],
      [78, 160],
    ],
    '#365d4a',
  );
  for (let i = 0; i < 5; i++)
    pine(ctx, 5 + i * 7, 94 + Math.sin(i) * 8, 12 + random() * 10, '#244d36');
  line(
    ctx,
    [
      [14, 113],
      [35, 120],
      [44, 137],
      [63, 149],
    ],
    '#b9aa7e',
    1.8,
  );
}

function empire(ctx: Canvas, random: () => number) {
  wash(ctx, '#ded7bd', '#afbfaf');
  hill(ctx, 109, 111, 133, 87, '#80958a');
  hill(ctx, 164, 112, 100, 57, '#9aad99');
  ctx.fillStyle = '#83a89d';
  ctx.fillRect(0, 112, 440, 48);
  ripples(ctx, random, 118, '#c7d2b4');
  polygon(
    ctx,
    [
      [195, 123],
      [258, 95],
      [440, 89],
      [440, 160],
      [278, 160],
    ],
    '#b6aa83',
  );
  for (let n = 0; n < 4; n++) {
    const x = 244 + n * 54,
      y = 116 + (n % 2) * 9,
      width = 34 + n * 3;
    ctx.fillStyle = '#ddd4b5';
    ctx.fillRect(x, y, width, 6);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#d8cfb0';
      ctx.fillRect(x + 3 + (i * (width - 6)) / 6, y - 24, 3, 24);
      ctx.fillStyle = '#b4ab8e';
      ctx.fillRect(x + 5 + (i * (width - 6)) / 6, y - 24, 0.7, 24);
    }
    polygon(
      ctx,
      [
        [x - 3, y - 25],
        [x + width / 2, y - 39],
        [x + width + 3, y - 25],
      ],
      '#e5dab8',
    );
    line(
      ctx,
      [
        [x - 3, y - 25],
        [x + width + 3, y - 25],
      ],
      '#9b947b',
      1,
    );
  }
  ctx.fillStyle = '#b5b597';
  ctx.fillRect(160, 111, 86, 6);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#78968b';
    ctx.beginPath();
    ctx.arc(166 + i * 14, 118, 4, Math.PI, 0);
    ctx.fill();
  }
  polygon(
    ctx,
    [
      [0, 160],
      [0, 121],
      [66, 133],
      [104, 160],
    ],
    '#516f51',
  );
  pine(ctx, 20, 146, 54, '#395a42');
  pine(ctx, 49, 150, 32, '#476748');
  polygon(
    ctx,
    [
      [121, 143],
      [150, 143],
      [143, 147],
      [127, 147],
    ],
    '#6a6144',
  );
  polygon(
    ctx,
    [
      [137, 118],
      [137, 140],
      [124, 137],
    ],
    '#e1d4ad',
  );
}

function winter(ctx: Canvas, random: () => number) {
  wash(ctx, '#bec9d0', '#647e9a');
  hill(ctx, 220, 126, 185, 73, '#a2b5c2');
  hill(ctx, 269, 126, 124, 58, '#c2cdd1');
  polygon(
    ctx,
    [
      [0, 127],
      [93, 123],
      [159, 136],
      [226, 129],
      [312, 136],
      [440, 121],
      [440, 160],
      [0, 160],
    ],
    '#d7dce0',
  );
  ctx.fillStyle = '#8fa5b5';
  ctx.beginPath();
  ctx.moveTo(222, 128);
  ctx.bezierCurveTo(209, 139, 244, 146, 231, 160);
  ctx.lineTo(280, 160);
  ctx.bezierCurveTo(250, 145, 232, 137, 230, 128);
  ctx.fill();
  for (let i = 0; i < 32; i++) {
    const x = i < 16 ? random() * 126 : 322 + random() * 118,
      height = 32 + random() * 119,
      y = 142 + random() * 18;
    line(
      ctx,
      [
        [x, y],
        [x + Math.sin(i) * 4, y - height],
      ],
      i % 3 ? '#324b60' : '#5f7686',
      1 + random() * 1.3,
    );
    for (let j = 1; j < 8; j++) {
      const yy = y - (height * j) / 9;
      line(
        ctx,
        [
          [x, yy + 9],
          [x + (j % 2 ? 1 : -1) * (7 + random() * 13), yy - 6],
        ],
        '#435d70',
        0.7,
      );
    }
  }
  for (let i = 0; i < 70; i++)
    disc(ctx, random() * W, random() * H, 0.4 + random() * 0.5, '#e7e9e3aa');
}

function wuhan(ctx: Canvas, random: () => number) {
  wash(ctx, '#c6d2ca', '#849c8d');
  for (let i = 0; i < 5; i++) hill(ctx, 30 + i * 100, 81, 100, 20 + random() * 14, '#879b8d');
  ctx.fillStyle = '#88a69a';
  ctx.fillRect(0, 83, W, 77);
  for (let i = 0; i < 45; i++) {
    const x = random() * W,
      y = 86 + random() * 65;
    line(
      ctx,
      [
        [x, y],
        [x + 7 + random() * 14, y],
      ],
      '#bdccc077',
      0.5,
    );
  }
  ctx.fillStyle = '#687b59';
  ctx.beginPath();
  ctx.moveTo(0, 147);
  ctx.quadraticCurveTo(230, 114, W, 137);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.strokeStyle = '#a7aaa0';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 155);
  ctx.quadraticCurveTo(230, 128, W, 146);
  ctx.stroke();
  for (const x of [26, 85, 139, 329, 394]) {
    const y = 140 + random() * 14;
    line(
      ctx,
      [
        [x, y],
        [x - 3, y - 32],
      ],
      '#5a5947',
      2.4,
    );
    for (let j = 0; j < 13; j++) {
      const tx = x + (random() - 0.5) * 38,
        ty = y - 29 - random() * 19;
      disc(ctx, tx, ty, 5 + random() * 8, j % 2 ? '#4c6950' : '#617b55');
      disc(ctx, tx + 2, ty + 4, 0.8, '#cab363');
    }
  }
  chineseHouse(ctx, 253, 136, 0.58, '#4d5b52');
  for (let i = 0; i < 80; i++) {
    const x = random() * W,
      y = random() * H;
    line(
      ctx,
      [
        [x, y],
        [x - 1.5, y + 4],
      ],
      '#e3ebe744',
      0.45,
    );
  }
}

export function ArtworkPreview({ painting }: { painting: Painting }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const random = seededRandom(painting.seed);
    switch (painting.id) {
      case 'wuhan':
        wuhan(ctx, random);
        break;
      case 'qingming':
        qingming(ctx, random);
        break;
      case 'guilin':
        guilin(ctx, random);
        break;
      case 'zhangjiajie':
        zhangjiajie(ctx, random);
        break;
      case 'starry':
        starry(ctx, random);
        break;
      case 'xishan':
        xishan(ctx, random);
        break;
      case 'empire':
        empire(ctx, random);
        break;
      case 'winter':
        winter(ctx, random);
        break;
      default:
        chineseLandscape(ctx, painting, random);
    }
    // A shared fine paper grain ties the individual scene studies together.
    ctx.globalAlpha = 0.045;
    for (let i = 0; i < 3800; i++) {
      ctx.fillStyle = i % 2 ? '#fff5dc' : '#162d24';
      ctx.fillRect(random() * W, random() * H, 0.5, 0.5);
    }
    ctx.globalAlpha = 1;
  }, [painting]);
  return <canvas ref={ref} width={W * 2} height={H * 2} aria-hidden="true" />;
}
