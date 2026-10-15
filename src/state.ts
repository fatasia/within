import type { ExperienceState, PaintingId } from './types';
import { clamp } from './engine/math';
export const initialState: ExperienceState = {
  painting: 'qianli',
  entered: false,
  mode: 'scroll',
  playing: false,
  speed: 1,
  progress: 0,
  time: 'journey',
  quality: 'high',
  sound: true,
  mist: true,
  period: 2,
};
const ids: PaintingId[] = [
  'qianli',
  'fuchun',
  'xishan',
  'starry',
  'empire',
  'winter',
  'qingming',
  'zhangjiajie',
  'guilin',
  'wuhan',
];
export function restorePreferences(value: string | null): ExperienceState {
  if (!value) return { ...initialState };
  try {
    const data = JSON.parse(value) as Partial<ExperienceState>;
    return {
      ...initialState,
      painting: ids.includes(data.painting as PaintingId) ? data.painting! : initialState.painting,
      // Every visit starts at full quality; manual changes apply to the current visit.
      quality: initialState.quality,
      mist: typeof data.mist === 'boolean' ? data.mist : true,
      speed: [0.5, 1, 2].includes(data.speed ?? 0) ? data.speed! : 1,
      period: Math.round(clamp(data.period ?? 2, 0, 4)),
    };
  } catch {
    return { ...initialState };
  }
}
export function nextSpeed(speed: number): number {
  return speed === 0.5 ? 1 : speed === 1 ? 2 : 0.5;
}
export function readableTime(time: ExperienceState['time'], progress: number): string {
  return time === 'night'
    ? '夜色'
    : time === 'sunset'
      ? '薄暮'
      : time === 'day'
        ? '晴昼'
        : progress > 0.8
          ? '夜色'
          : progress > 0.5
            ? '薄暮'
            : '晴昼';
}
