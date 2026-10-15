import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterPaint, requestDisplayOrientation } from './displayControls';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('native orientation control', () => {
  it('reports unsupported browsers without entering fullscreen or faking rotation', async () => {
    const fullscreen = vi.fn();
    vi.stubGlobal('window', { screen: { orientation: {} } });
    vi.stubGlobal('document', { documentElement: { requestFullscreen: fullscreen } });
    expect(await requestDisplayOrientation('landscape')).toBe('unsupported');
    expect(fullscreen).not.toHaveBeenCalled();
  });
  it('requests fullscreen before the native orientation lock', async () => {
    const calls: string[] = [];
    vi.stubGlobal('window', {
      screen: {
        orientation: {
          lock: async (target: string) => {
            calls.push(target);
          },
        },
      },
    });
    vi.stubGlobal('document', {
      documentElement: {
        requestFullscreen: async () => {
          calls.push('fullscreen');
        },
      },
    });
    expect(await requestDisplayOrientation('landscape')).toBe('locked');
    expect(calls).toEqual(['fullscreen', 'landscape']);
  });
  it('does not report success when native locking rejects', async () => {
    vi.stubGlobal('window', {
      screen: {
        orientation: {
          lock: async () => {
            throw new Error('NotSupportedError');
          },
        },
      },
    });
    vi.stubGlobal('document', { fullscreenElement: {}, documentElement: {} });
    expect(await requestDisplayOrientation('portrait')).toBe('failed');
  });
});

describe('scene selection scheduling', () => {
  function frames() {
    const callbacks = new Map<number, FrameRequestCallback>();
    let sequence = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callbacks.set(++sequence, cb);
      return sequence;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
    return () => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((cb) => cb(0));
    };
  }
  it('leaves two animation frames and a task boundary for the selected UI to paint', () => {
    vi.useFakeTimers();
    const frame = frames();
    const build = vi.fn();
    afterPaint(build);
    frame();
    expect(build).not.toHaveBeenCalled();
    frame();
    expect(build).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(build).toHaveBeenCalledTimes(1);
  });
  it('cancels obsolete selection builds even after their frames have elapsed', () => {
    vi.useFakeTimers();
    const frame = frames();
    const obsolete = vi.fn(),
      latest = vi.fn();
    const cancel = afterPaint(obsolete);
    frame();
    frame();
    cancel();
    afterPaint(latest);
    frame();
    frame();
    vi.runAllTimers();
    expect(obsolete).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });
});
