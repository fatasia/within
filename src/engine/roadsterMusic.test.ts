import { describe, expect, it, vi } from 'vitest';
import { createRoadsterMusic, ROADSTER_MUSIC } from './roadsterMusic';

function fixture() {
  const audio = Object.assign(new EventTarget(), {
    preload: '',
    loop: false,
    volume: 1,
    currentTime: 0,
    play: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
  });
  const factory = vi.fn(() => audio as unknown as HTMLAudioElement);
  return { audio, factory, music: createRoadsterMusic(factory) };
}

describe('Roadster music lifecycle', () => {
  it('constructs silently and starts synchronously within the entry gesture', async () => {
    const { music, audio, factory } = fixture();
    expect(factory).toHaveBeenCalledWith(ROADSTER_MUSIC.url);
    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.preload).toBe('none');
    expect(audio.loop).toBe(true);
    const result = music.play();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(music.state).toBe('loading');
    expect(await result).toEqual({ state: 'playing' });
  });

  it('exposes autoplay blocking and lets a subsequent gesture retry', async () => {
    const { music, audio } = fixture();
    audio.play.mockRejectedValueOnce(new DOMException('Gesture required', 'NotAllowedError'));
    expect((await music.play()).state).toBe('blocked');
    expect((await music.play()).state).toBe('playing');
  });

  it('keeps the beat clock on the media clock and clamps volume', () => {
    const { music, audio } = fixture();
    audio.currentTime = (16 * 60) / 138;
    expect(music.getBeat()).toBeCloseTo(16);
    expect(music.currentTime).toBe(audio.currentTime);
    music.setVolume(2);
    expect(audio.volume).toBe(1);
    music.setVolume(-1);
    expect(audio.volume).toBe(0);
    music.setVolume(Number.NaN);
    expect(audio.volume).toBe(0);
    expect((ROADSTER_MUSIC.duration * ROADSTER_MUSIC.bpm) / 60).toBe(64);
  });

  it('does not resurrect playback after pause while play is pending', async () => {
    const { music, audio } = fixture();
    let resolve!: () => void;
    audio.play.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const pending = music.play();
    music.pause();
    resolve();
    expect((await pending).state).toBe('paused');
    expect(music.state).toBe('paused');
  });

  it('releases its media source on scene exit and ignores stale rejection', async () => {
    const { music, audio } = fixture();
    let reject!: (error: Error) => void;
    audio.play.mockImplementation(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        }),
    );
    const pending = music.play();
    music.dispose();
    music.dispose();
    reject(new Error('stale load'));
    expect((await pending).state).toBe('disposed');
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
    expect(audio.load).toHaveBeenCalledTimes(1);
    expect((await music.play()).state).toBe('disposed');
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('reports actual media errors instead of leaving a playing indicator', async () => {
    const { music, audio } = fixture();
    await music.play();
    audio.dispatchEvent(new Event('error'));
    expect(music.state).toBe('error');
    music.dispose();
    audio.dispatchEvent(new Event('error'));
    expect(music.state).toBe('disposed');
  });
});
