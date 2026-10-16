import type { Painting, Vec3 } from '../types';
import { getCinematicView, type CinematicView } from './cinematography';
import { groundHeight } from './terrain';
import { clamp } from './math';

/** Three deliberate shots, rather than accelerating a 150-second journey into ten seconds. */
const detailShots: Record<Painting['id'], readonly [number, number]> = {
  starry: [0.44, 0.65],
  winter: [0.22, 0.65],
  qingming: [0.36, 0.83],
  wuhan: [0.32, 0.87],
  qianli: [0.4, 0.62],
  fuchun: [0.34, 0.65],
  xishan: [0.22, 0.63],
  empire: [0.44, 0.87],
  zhangjiajie: [0.43, 0.66],
  guilin: [0.21, 0.43],
};
export interface FilmShot {
  progress: number;
  view: CinematicView;
  shot: number;
}
export function getFilmShot(painting: Painting, time: number, duration: number): FilmShot {
  const fraction = clamp(time / (duration > 0 ? duration : 10));
  // The five empire paintings get two seconds each, retaining their narrative order.
  const empire = painting.id === 'empire';
  const shot = empire
    ? Math.min(4, Math.floor(fraction * 5))
    : fraction < 0.3
      ? 0
      : fraction < 0.6
        ? 1
        : 2;
  const start = empire ? shot * 0.2 : [0, 0.3, 0.6][shot]!;
  const span = empire ? 0.2 : shot === 2 ? 0.4 : 0.3;
  const local = clamp((fraction - start) / span);
  const progress = empire
    ? [0.1, 0.3, 0.5, 0.7, 0.9][shot]!
    : shot === 0
      ? 0
      : detailShots[painting.id][shot - 1]!;
  let base = empire || shot === 0 ? painting.overview : getCinematicView(painting, progress);
  if (painting.id === 'winter' && shot === 1) base = { eye: [-37, 5, 111], target: [0, 22, -100] };
  if (painting.id === 'xishan' && shot === 2) base = { eye: [54, 39, 83], target: [12, 51, -34] };
  const delta = base.eye.map((n, i) => n - base.target[i]!) as unknown as Vec3;
  const length = Math.hypot(...delta);
  const travel = Math.min(length * 0.045, 1.8) * (local * local * (3 - 2 * local) - 0.5);
  const eye = base.eye.map((n, i) => n - (delta[i]! / Math.max(length, 0.1)) * travel) as [
    number,
    number,
    number,
  ];
  eye[1] = Math.max(eye[1], groundHeight(painting, eye[0], eye[2]) + 0.55);
  return { progress, view: { eye, target: base.target }, shot };
}
