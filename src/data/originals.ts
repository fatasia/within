import type { PaintingId } from '../types';

export interface OriginalImage {
  /** Public-relative path, resolved against import.meta.env.BASE_URL by the viewer. */
  src: string;
  alt: string;
  caption: string;
  scope: 'complete' | 'detail';
  period?: number;
}
export interface OriginalArtwork {
  title: string;
  artist: string;
  sourceUrl: string;
  credit: string;
  creditUrl?: string;
  licenseUrl?: string;
  images: OriginalImage[];
}

const image = (
  file: string,
  alt: string,
  caption: string,
  scope: OriginalImage['scope'],
  period?: number,
): OriginalImage => ({ src: `originals/${file}.webp`, alt, caption, scope, period });

/** Verified artwork reproductions, not generated scene previews. Sources: docs/ORIGINALS.md. */
export const ORIGINALS: Partial<Record<PaintingId, OriginalArtwork>> = {
  starry: {
    title: '星月夜',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    artist: '文森特·梵高',
    sourceUrl: 'https://www.moma.org/collection/works/79802',
    credit: 'MoMA 藏；Google Art Project 数字图像，经 Wikimedia Commons 提供，公版作品复制图。',
    images: [
      image(
        'starry',
        '梵高《星月夜》全幅：柏树、村庄与旋动星空',
        '1889 年油画全幅；图像已缩放压缩。',
        'complete',
      ),
    ],
  },
  winter: {
    title: '山中冬夜',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Harald_Sohlberg_-_Winter_Night_in_the_Mountains_-_NG.M.01185_-_National_Museum_of_Art,_Architecture_and_Design.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    artist: '哈拉尔德·索尔贝格',
    sourceUrl: 'https://www.nasjonalmuseet.no/en/collection/object/NG.M.01185',
    credit:
      '挪威国家博物馆，NG.M.01185；数字图像经 Wikimedia Commons 提供，CC BY 4.0；已缩放、转为 WebP。',
    images: [
      image(
        'winter',
        '索尔贝格《山中冬夜》全幅：暗色树影与蓝色雪山',
        '1914 年油画全幅，馆藏编号 NG.M.01185。',
        'complete',
      ),
    ],
  },
  qingming: {
    title: '清明上河图',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    artist: '张择端',
    sourceUrl: 'https://www.dpm.org.cn/collection/paint/228226.html',
    credit:
      '故宫博物院藏；Commons 所收张择端北宋本公版复制图。全卷等比缩小；六个阅读分段由同一全卷连续裁出，未补绘。',
    images: [
      image(
        'qingming-full',
        '张择端《清明上河图》北宋本完整画卷，右端郊野至左端城内市井',
        '全卷总览 · 右起左止',
        'complete',
      ),
      ...[
        '01 郊野 · 卷首',
        '02 河岸舟运',
        '03 汴河虹桥',
        '04 桥后街市',
        '05 城门内外',
        '06 城内 · 卷尾',
      ].map((caption, index) =>
        image(
          `qingming-section-${index + 1}`,
          `张择端《清明上河图》北宋本连续阅读分段：${caption}`,
          caption,
          'detail',
        ),
      ),
      image(
        'qingming-detail',
        '张择端《清明上河图》虹桥局部，木桥与桥下舟船',
        '虹桥局部 · 不是全卷',
        'detail',
      ),
    ],
  },
  qianli: {
    title: '千里江山图',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Wang_Ximeng_-_A_Thousand_Li_of_River_(Start).jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    artist: '王希孟',
    sourceUrl: 'https://www.dpm.org.cn/collection/paint/228354.html',
    credit: '故宫博物院藏；Wikimedia Commons 公版作品复制图，卷首局部含题跋，已转为 WebP。',
    images: [
      image(
        'qianli-detail',
        '王希孟《千里江山图》卷首局部与题跋',
        '卷首局部，保留题跋与装裱边界；不是全卷。',
        'detail',
      ),
    ],
  },
  fuchun: {
    title: '富春山居图（无用师卷）',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Huang_Gongwang._Dwelling_in_the_Fuchun_Mountains._detail._National_Palace_Museum,_Taipei.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    artist: '黄公望',
    sourceUrl: 'https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000975',
    credit: '台北故宫博物院藏；Wikimedia Commons 所收无用师卷局部，公版作品复制图，已转为 WebP。',
    images: [
      image(
        'fuchun-detail',
        '黄公望《富春山居图》无用师卷局部，坡岸与疏林',
        '无用师卷局部，不是完整长卷；未混入剩山图。',
        'detail',
      ),
    ],
  },
  xishan: {
    title: '溪山行旅图',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Fan_Kuan_-_Travelers_Among_Mountains_and_Streams_-_Google_Art_Project.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    artist: '范宽',
    sourceUrl: 'https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000959',
    credit:
      '台北故宫博物院藏；Google Art Project 数字图像，经 Wikimedia Commons 提供，公版作品复制图。',
    images: [
      image(
        'xishan',
        '范宽《溪山行旅图》画心全幅，巨峰、细瀑、近岸树石与行旅',
        '画心全幅，不含外部题签与装裱；图像已缩放压缩。',
        'complete',
      ),
    ],
  },
  empire: {
    title: '帝国的进程',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    artist: '托马斯·科尔',
    sourceUrl: 'https://commons.wikimedia.org/wiki/The_Course_of_Empire_(Thomas_Cole)',
    credit: 'The New York Historical 藏；Wikimedia Commons 公版作品复制图，五幅均经缩放压缩。',
    images: [
      image('empire-0', '帝国的进程：荒蛮状态全幅', '第一幅：荒蛮状态。', 'complete', 0),
      image('empire-1', '帝国的进程：田园状态全幅', '第二幅：田园状态。', 'complete', 1),
      image('empire-2', '帝国的进程：帝国鼎盛全幅', '第三幅：帝国鼎盛。', 'complete', 2),
      image(
        'empire-3',
        '帝国的进程：毁灭全幅，城中战争与断裂雕像',
        '第四幅：毁灭。',
        'complete',
        3,
      ),
      image('empire-4', '帝国的进程：荒凉全幅，暮色海湾与残柱', '第五幅：荒凉。', 'complete', 4),
    ],
  },
};
