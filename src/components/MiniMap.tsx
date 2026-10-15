import { useEffect, useRef } from 'react';
import type { Painting } from '../types';
export function MiniMap({
  painting,
  progress,
  onChange,
}: {
  painting: Painting;
  progress: number;
  onChange: (n: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 1000, 60);
    ctx.fillStyle = painting.palette.high;
    ctx.globalAlpha = 0.16;
    for (const peak of painting.peaks) {
      ctx.beginPath();
      ctx.ellipse(
        ((peak.x + 135) / 270) * 1000,
        30,
        peak.radius * 2.5,
        Math.min(26, peak.height * 0.4),
        -0.1,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = painting.palette.water;
    ctx.lineWidth = 6;
    ctx.beginPath();
    painting.route.forEach((p, i) => {
      const x = ((p[0] + 135) / 270) * 1000,
        y = 32 + p[2] * 0.23;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [painting]);
  return (
    <div className="mini-map">
      <canvas ref={ref} width={1000} height={60} aria-hidden="true" />
      <div className="map-progress" style={{ width: `${progress * 100}%` }} />
      <input
        aria-label="游览进度"
        type="range"
        min="0"
        max="1000"
        value={Math.round(progress * 1000)}
        onChange={(e) => onChange(Number(e.target.value) / 1000)}
      />
      <span className="map-cursor" style={{ left: `${progress * 100}%` }} />
    </div>
  );
}
