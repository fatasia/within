import { useState } from 'react';
import { MiniMap } from './MiniMap';
import { chapterAt } from '../data/paintings';
import {
  ArrowLeft,
  CaretDown,
  DotsThree,
  Play,
  Pause,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsOut,
  ArrowsIn,
  BookOpen,
  Compass,
  Footprints,
} from '@phosphor-icons/react';
import type { Painting, ExperienceState, ViewMode } from '../types';

/** Touch-first HUD: the scene stays clear; secondary actions live in modal sheets. */
export function MobileControls({
  painting,
  state,
  sound,
  onHome,
  onScenes,
  onSound,
  onTools,
  onChapters,
  onCar,
  onMode,
  onPlay,
  onSeek,
  driveHold,
}: {
  painting: Painting;
  state: ExperienceState;
  sound: boolean;
  onHome: () => void;
  onScenes: () => void;
  onSound: () => void;
  onTools: () => void;
  onChapters: () => void;
  onCar: () => void;
  onMode: (mode: ViewMode) => void;
  onPlay: () => void;
  onSeek: (progress: number) => void;
  driveHold: (
    key: 'steer' | 'throttle' | 'brake',
    value: number,
  ) => React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const [immersive, setImmersive] = useState(false);
  const car = painting.id === 'roadster';
  return (
    <div className={`mobile-hud ${immersive ? 'mobile-hud-immersive' : ''}`}>
      <nav className="mobile-top" aria-label="画境快捷操作">
        <button aria-label="返回画境首页" onClick={onHome}>
          <ArrowLeft size={20} />
        </button>
        <button
          className="mobile-scene"
          aria-label={`选择画境，当前${painting.shortTitle}`}
          aria-haspopup="dialog"
          onClick={onScenes}
        >
          <span>{painting.shortTitle}</span>
          <CaretDown size={14} />
        </button>
        <button
          aria-label={sound ? '关闭配乐与音效' : '开启配乐与音效'}
          aria-pressed={sound}
          onClick={onSound}
        >
          {sound ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}
        </button>
        <button aria-label="更多操作" aria-haspopup="dialog" onClick={onTools}>
          <DotsThree size={24} />
        </button>
      </nav>
      <button
        className="mobile-immersive"
        aria-label={immersive ? '显示游览控件' : '收起游览控件'}
        aria-pressed={immersive}
        onClick={() => setImmersive(!immersive)}
      >
        {immersive ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
      </button>
      <div className="mobile-bottom">
        {car && (
          <div className="mobile-drive" aria-label="驾驶控制">
            <div>
              <button aria-label="向左转向" {...driveHold('steer', -1)}>
                ←
              </button>
              <button aria-label="向右转向" {...driveHold('steer', 1)}>
                →
              </button>
            </div>
            <div>
              <button aria-label="刹车" {...driveHold('brake', 1)}>
                刹车
              </button>
              <button aria-label="油门" {...driveHold('throttle', 1)}>
                油门
              </button>
            </div>
          </div>
        )}
        <section className="mobile-dock" aria-label="游览控制">
          <div className="mobile-dock-row">
            <div className="mobile-modes" aria-label="选择视角">
              {(['scroll', 'orbit', 'walk'] as const).map((id, i) => {
                const Icon = [BookOpen, Compass, Footprints][i]!;
                const label = car
                  ? ['跟车', '环视', '驾驶席'][i]
                  : painting.id === 'sakura'
                    ? ['展卷', '漫游', '乘舟'][i]
                    : ['展卷', '漫游', '步行'][i];
                return (
                  <button key={id} aria-pressed={state.mode === id} onClick={() => onMode(id)}>
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
            <button
              className="mobile-play"
              aria-label={state.playing ? '暂停游览' : '自动游览'}
              onClick={onPlay}
            >
              {state.playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            </button>
            <button
              className="mobile-details"
              onClick={car ? onCar : onChapters}
              aria-haspopup="dialog"
            >
              {car ? '玩车' : '章节'}
              <CaretDown size={12} />
            </button>
          </div>
          <nav className="mobile-chapters" aria-label="章节时间轴">
            {painting.chapters.map((chapter, index) => (
              <button
                key={chapter.title}
                aria-current={chapterAt(painting, state.progress) === index ? 'step' : undefined}
                onClick={() => onSeek(chapter.progress)}
              >
                <small>{String(index + 1).padStart(2, '0')}</small>
                <span>{chapter.title}</span>
              </button>
            ))}
          </nav>
          <MiniMap painting={painting} progress={state.progress} onChange={onSeek} />
        </section>
      </div>
    </div>
  );
}
