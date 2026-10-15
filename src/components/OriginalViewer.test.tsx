import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OriginalViewer } from './OriginalViewer';
import { getPainting } from '../data/paintings';

vi.mock('../data/originals', () => ({
  ORIGINALS: {
    starry: {
      title: '星月夜',
      artist: '文森特·梵高',
      sourceUrl: 'https://www.moma.org/collection/works/79802',
      credit: 'MoMA',
      images: [
        {
          src: 'originals/starry.webp',
          alt: '星月夜原作全幅',
          caption: '原作全幅',
          scope: 'complete',
        },
      ],
    },
    fuchun: {
      title: '富春山居图',
      artist: '黄公望',
      sourceUrl: 'https://www.npm.gov.tw/',
      credit: '馆藏局部',
      images: [
        {
          src: 'originals/fuchun-detail.webp',
          alt: '富春山居图局部',
          caption: '画卷局部',
          scope: 'detail',
        },
      ],
    },
  },
}));

describe('Original artwork viewer', () => {
  it('uses local original images and keeps the museum attribution visible', () => {
    const html = renderToStaticMarkup(
      <OriginalViewer painting={getPainting('starry')} onClose={() => {}} />,
    );
    expect(html).toContain('originals/starry.webp');
    expect(html).toContain('星月夜原作全幅');
    expect(html).toContain('MoMA');
    expect(html).toContain('https://www.moma.org/collection/works/79802');
    expect(html).toContain('放大原作');
  });
  it('labels partial reproductions as details rather than claiming a complete scroll', () => {
    const html = renderToStaticMarkup(
      <OriginalViewer painting={getPainting('fuchun')} onClose={() => {}} />,
    );
    expect(html).toContain('局部');
    expect(html).toContain('局部图不代表整幅原作');
  });
  it('does not invent an original painting for a real landscape', () => {
    const html = renderToStaticMarkup(
      <OriginalViewer painting={getPainting('guilin')} onClose={() => {}} />,
    );
    expect(html).toContain('没有对应的单幅古画');
    expect(html).toContain('查看地域资料');
    expect(html).not.toContain('<img');
  });
});
