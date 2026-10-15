import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./state', async (original) => {
  const state = await original<typeof import('./state')>();
  return {
    ...state,
    restorePreferences: () => ({
      ...state.initialState,
      entered: true,
      painting: 'qingming',
      mode: 'walk',
      quality: 'low',
      sound: false,
    }),
  };
});

afterEach(() => vi.unstubAllGlobals());

describe('in-scene collection navigation', () => {
  it('shows accessible previous/current/next controls without permanently listing ten scenes', () => {
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 844 });
    vi.stubGlobal('localStorage', { getItem: () => null });
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('aria-label="上一个画境"');
    expect(html).toContain('aria-label="下一个画境"');
    expect(html).toContain('aria-label="选择画境，当前清明上河"');
    expect(html).toContain('aria-haspopup="dialog" aria-expanded="false"');
    expect(html).not.toContain('scene-picker-list');
    expect(html).toContain('返回首页');
    expect(html).toContain('aria-label="开启配乐与音效"');
  });
});
