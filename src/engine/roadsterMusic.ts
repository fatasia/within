export const ROADSTER_MUSIC = {
  url: `${import.meta.env.BASE_URL}audio/roadster-vadoka-chorus.mp3`,
  bpm: 138,
  beats: 64,
  duration: (64 * 60) / 138,
  sourceStart: 44.1585,
  reference: 'https://www.bilibili.com/video/BV1me411V7nA/',
} as const;
export type RoadsterMusicState =
  'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error' | 'disposed';
export interface RoadsterMusicResult {
  state: RoadsterMusicState;
  error?: string;
}
export interface RoadsterMusic {
  readonly element: HTMLAudioElement;
  readonly state: RoadsterMusicState;
  readonly currentTime: number;
  play(): Promise<RoadsterMusicResult>;
  pause(): void;
  dispose(): void;
  setVolume(value: number): void;
  getBeat(): number;
}
/** Call play directly from scene-entry/toggle gestures; no audio starts during construction. */
export function createRoadsterMusic(
  factory: (url: string) => HTMLAudioElement = (url) => new Audio(url),
): RoadsterMusic {
  const element = factory(ROADSTER_MUSIC.url);
  element.preload = 'none';
  element.loop = true;
  element.volume = 0.48;
  let state: RoadsterMusicState = 'idle',
    generation = 0;
  const onError = () => {
    if (state !== 'disposed') state = 'error';
  };
  const onPause = () => {
    if (state !== 'disposed' && state !== 'idle') state = 'paused';
  };
  element.addEventListener('error', onError);
  element.addEventListener('pause', onPause);
  const currentTime = () => (Number.isFinite(element.currentTime) ? element.currentTime : 0);
  return {
    element,
    get state() {
      return state;
    },
    get currentTime() {
      return currentTime();
    },
    async play() {
      if (state === 'disposed') return { state };
      const request = ++generation;
      state = 'loading';
      try {
        // Keep this invocation before any await: it consumes the actual entry-click activation.
        await element.play();
        if (request === generation) state = 'playing';
        return { state };
      } catch (error) {
        if (request !== generation) return { state };
        const name = error instanceof Error ? error.name : '';
        state = name === 'NotAllowedError' ? 'blocked' : name === 'AbortError' ? 'paused' : 'error';
        return { state, error: error instanceof Error ? error.message : String(error) };
      }
    },
    pause() {
      if (state === 'disposed') return;
      generation++;
      element.pause();
      state = 'paused';
    },
    setVolume(value) {
      if (state !== 'disposed')
        element.volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    },
    getBeat() {
      return (currentTime() * ROADSTER_MUSIC.bpm) / 60;
    },
    dispose() {
      if (state === 'disposed') return;
      generation++;
      state = 'disposed';
      element.removeEventListener('error', onError);
      element.removeEventListener('pause', onPause);
      element.pause();
      element.removeAttribute('src');
      element.load();
    },
  };
}
