import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from '@phosphor-icons/react';
import { elementRotation, localPointer } from './viewport';

/** Captured left-hand movement leaves the scene free for a second finger to look around. */
export function WalkJoystick({ onMove }: { onMove: (x: number, forward: number) => void }) {
  const pointer = useRef<number | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const release = useCallback(() => {
    pointer.current = null;
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);
  useEffect(() => {
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('blur', release);
      onMove(0, 0);
    };
  }, [onMove, release]);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = localPointer(
      rect,
      event.clientX,
      event.clientY,
      elementRotation(event.currentTarget),
    );
    const dx = point.x - event.currentTarget.offsetWidth / 2;
    const dy = point.y - event.currentTarget.offsetHeight / 2;
    const radius = event.currentTarget.offsetWidth * 0.32;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    setPosition({ x: dx * scale, y: dy * scale });
    const strength = Math.min(1, Math.max(0, (distance / radius - 0.1) / 0.9));
    onMove(distance ? (dx / distance) * strength : 0, distance ? (-dy / distance) * strength : 0);
  };
  return (
    <div className="walk-pad" aria-label="步行方向控制">
      <div
        className="walk-joystick"
        role="group"
        aria-label="步行摇杆，按住拖动控制方向和速度"
        onPointerDown={(event) => {
          if (pointer.current !== null || (event.target as HTMLElement).closest('button')) return;
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={move}
        onPointerUp={(event) => {
          if (pointer.current === event.pointerId) release();
        }}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        {[
          { name: '向前走', x: 0, y: 1, Icon: ArrowUp },
          { name: '向左走', x: -1, y: 0, Icon: ArrowLeft },
          { name: '向后走', x: 0, y: -1, Icon: ArrowDown },
          { name: '向右走', x: 1, y: 0, Icon: ArrowRight },
        ].map(({ name, x, y, Icon }) => (
          <button
            key={name}
            aria-label={name}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              onMove(x, y);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                onMove(x, y);
              }
            }}
            onKeyUp={release}
            onBlur={release}
          >
            <Icon size={16} />
          </button>
        ))}
        <span
          className="joystick-knob"
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        />
      </div>
      <span className="walk-hint">左侧行走 · 右侧转头</span>
    </div>
  );
}
