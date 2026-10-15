import type { Painting } from '../types';
import { chapterAt } from '../data/paintings';

/** Shared typography for real-time exports and deterministic delivery renders. */
export function paintFilmFrame(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  painting: Painting,
  progress: number,
): void {
  const { width, height } = ctx.canvas;
  const portrait = width < height;
  const scale = Math.max(width / source.width, height / source.height);
  const w = source.width * scale,
    h = source.height * scale;
  ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
  const gradient = ctx.createLinearGradient(0, height * 0.65, 0, height);
  gradient.addColorStop(0, 'rgba(5,14,17,0)');
  gradient.addColorStop(1, 'rgba(5,14,17,.76)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f4f0e3';
  const unit = Math.min(width, height) / 720;
  ctx.font = `${(portrait ? 17 : 15) * unit}px "Landscape Serif", serif`;
  ctx.textAlign = 'left';
  ctx.fillText('入 画  /  WITHIN', 45 * unit, 50 * unit);
  const chapter = painting.chapters[chapterAt(painting, progress)]!;
  ctx.font = `${(portrait ? 38 : 34) * unit}px "Landscape Serif", serif`;
  ctx.fillText(painting.shortTitle, 45 * unit, height - 102 * unit);
  ctx.font = `${15 * unit}px "Landscape Serif", serif`;
  ctx.fillText(`${painting.artist} · ${chapter.title}`, 47 * unit, height - 69 * unit);
  ctx.fillStyle = 'rgba(244,240,227,.3)';
  ctx.fillRect(45 * unit, height - 40 * unit, width - 90 * unit, unit);
  ctx.fillStyle = '#e7d4a0';
  ctx.fillRect(45 * unit, height - 40 * unit, (width - 90 * unit) * progress, 2 * unit);
}
