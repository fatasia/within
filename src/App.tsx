import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ArrowsOut,
  ArrowsIn,
  BookOpen,
  Camera,
  CaretRight,
  CaretDown,
  Check,
  Compass,
  FilmStrip,
  Footprints,
  GearSix,
  House,
  Info,
  Moon,
  Mountains,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  SunHorizon,
  X,
  ArrowCounterClockwise,
  CloudFog,
  CircleNotch,
  ArrowsClockwise,
  ImageSquare,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { PAINTINGS, getPainting, chapterAt, PERIODS } from './data/paintings';
import { initialState, nextSpeed, readableTime, restorePreferences } from './state';
import type { ExperienceState, PaintingId, Telemetry, TimeMode, ViewMode } from './types';
import type { Experience } from './engine/Experience';
import { AmbientAudio } from './engine/audio';
import { SOUND_PALETTES } from './engine/audioScore';
import { ArtworkPreview } from './components/ArtworkPreview';
import { Dialog } from './components/Dialog';
import { MiniMap } from './components/MiniMap';
import { WalkJoystick } from './components/WalkJoystick';
import { ENCOUNTER_TEXT } from './engine/easterEgg';
import { afterPaint, requestDisplayOrientation } from './components/displayControls';
import { OriginalViewer } from './components/OriginalViewer';

const modes: { id: ViewMode; label: string; icon: Icon }[] = [
  { id: 'scroll', label: '展卷', icon: BookOpen },
  { id: 'orbit', label: '漫游', icon: Compass },
  { id: 'walk', label: '步行', icon: Footprints },
];
const times: { id: TimeMode; label: string; icon: Icon }[] = [
  { id: 'journey', label: '随卷', icon: SunHorizon },
  { id: 'day', label: '晴昼', icon: Sun },
  { id: 'sunset', label: '薄暮', icon: SunHorizon },
  { id: 'night', label: '夜色', icon: Moon },
];
type Modal = 'about' | 'help' | 'film' | 'encounter' | 'original' | 'scenes' | null;
function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function loadInitial(): ExperienceState {
  try {
    return restorePreferences(localStorage.getItem('ruhua.preferences.v1'));
  } catch {
    return { ...initialState };
  }
}

export function App() {
  const [state, setState] = useState<ExperienceState>(loadInitial),
    [ready, setReady] = useState(false),
    [sceneLoading, setSceneLoading] = useState(false),
    [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>(null),
    [settings, setSettings] = useState(false),
    [toast, setToast] = useState(''),
    [recording, setRecording] = useState<number | null>(null),
    [portrait, setPortrait] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight),
    [rotating, setRotating] = useState(false),
    [musicVolume, setMusicVolume] = useState(0.58),
    [ambienceVolume, setAmbienceVolume] = useState(0.62),
    [stats, setStats] = useState<Telemetry>({ progress: 0, fps: 0, drawCalls: 0, triangles: 0 });
  const host = useRef<HTMLDivElement>(null),
    collectionList = useRef<HTMLDivElement>(null),
    engine = useRef<Experience | null>(null),
    audio = useRef<AmbientAudio | null>(null),
    soundStarted = useRef(false),
    current = useRef(state),
    configuredPainting = useRef<PaintingId | null>(null),
    pendingPainting = useRef<PaintingId | null>(null),
    cancelSceneChange = useRef<(() => void) | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    lastProgress = useRef(0);
  const painting = getPainting(state.painting),
    paintingIndex = PAINTINGS.findIndex((item) => item.id === state.painting),
    chapterIndex = chapterAt(painting, state.progress),
    chapter = painting.chapters[chapterIndex]!;
  const patch = useCallback(
    (changes: Partial<ExperienceState>) => setState((s) => ({ ...s, ...changes })),
    [],
  );
  const moveWalk = useCallback((x: number, forward: number) => {
    engine.current?.setWalkInput(x, forward);
  }, []);
  const seek = useCallback((progress: number) => {
    setState((s) => ({
      ...s,
      progress,
      playing: false,
      mode: 'scroll',
      period: s.painting === 'empire' ? chapterAt(getPainting(s.painting), progress) : s.period,
    }));
  }, []);
  const notify = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);
  useEffect(() => {
    current.current = state;
    if (!engine.current) return;
    if (configuredPainting.current === state.painting && pendingPainting.current === null) {
      engine.current.configure(state);
      return;
    }
    if (pendingPainting.current === state.painting) return;
    cancelSceneChange.current?.();
    pendingPainting.current = state.painting;
    setSceneLoading(true);
    cancelSceneChange.current = afterPaint(() => {
      try {
        engine.current?.configure(current.current);
        configuredPainting.current = current.current.painting;
      } catch (e) {
        setError(e instanceof Error ? e.message : '画境加载失败');
      } finally {
        pendingPainting.current = null;
        cancelSceneChange.current = null;
        setSceneLoading(false);
      }
    });
  }, [state, ready]);
  useEffect(() => {
    audio.current?.setPainting(state.painting);
  }, [state.painting]);
  useEffect(() => {
    audio.current?.setMix(musicVolume, ambienceVolume);
  }, [musicVolume, ambienceVolume]);
  useEffect(() => {
    let active = true;
    audio.current = new AmbientAudio();
    audio.current.setPainting(current.current.painting);
    audio.current.setMix(0.58, 0.62);
    const sound = audio.current;
    // Start both buses on the first gesture, without requiring a separate sound click.
    const activateSound = (event: Event) => {
      if (
        soundStarted.current ||
        !current.current.sound ||
        (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key))
      )
        return;
      soundStarted.current = true;
      void sound.setEnabled(true).catch(() => {
        soundStarted.current = false;
      });
    };
    document.addEventListener('click', activateSound);
    document.addEventListener('keyup', activateSound);
    import('./engine/Experience')
      .then(({ Experience }) => {
        if (!active || !host.current) return;
        try {
          engine.current = new Experience(host.current, current.current, {
            onTelemetry: (data) => {
              if (!active || pendingPainting.current !== null) return;
              setStats(data);
              if (
                Math.abs(lastProgress.current - data.progress) > 0.002 ||
                (data.playing !== undefined && data.playing !== current.current.playing)
              ) {
                lastProgress.current = data.progress;
                setState((s) => ({
                  ...s,
                  progress: data.progress,
                  playing: data.progress >= 1 ? false : (data.playing ?? s.playing),
                  period:
                    s.painting === 'empire' && s.mode === 'scroll'
                      ? chapterAt(getPainting(s.painting), data.progress)
                      : s.period,
                }));
              }
            },
            onError: (message) => setError(message),
            onEncounter: () => {
              setState((s) => ({ ...s, playing: false }));
              setModal('encounter');
            },
          });
          configuredPainting.current = current.current.painting;
          setReady(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : '无法初始化三维场景');
        }
      })
      .catch(() => setError('场景引擎加载失败，请检查网络后刷新。'));
    return () => {
      active = false;
      document.removeEventListener('click', activateSound);
      document.removeEventListener('keyup', activateSound);
      soundStarted.current = false;
      cancelSceneChange.current?.();
      pendingPainting.current = null;
      engine.current?.dispose();
      engine.current = null;
      audio.current?.dispose();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        'ruhua.preferences.v1',
        JSON.stringify({
          painting: state.painting,
          mist: state.mist,
          speed: state.speed,
          period: state.period,
        }),
      );
    } catch {
      /* Storage is optional in private browsing. */
    }
  }, [state.painting, state.mist, state.speed, state.period]);
  const selectPainting = (id: PaintingId) => {
    if (recording !== null) return;
    setModal(null);
    setSettings(false);
    if (id === state.painting) return;
    lastProgress.current = 0;
    patch({
      painting: id,
      progress: 0,
      playing: state.entered ? state.playing : false,
      mode: 'scroll',
      period: 0,
      time: ['starry', 'winter'].includes(id) ? 'night' : 'journey',
    });
  };
  const toggleSound = useCallback(async () => {
    const enabled = !current.current.sound;
    // Update intent before the click bubbles to the first-gesture listener.
    current.current = { ...current.current, sound: enabled };
    patch({ sound: enabled });
    if (enabled) soundStarted.current = true;
    try {
      await audio.current?.setEnabled(enabled);
    } catch {
      soundStarted.current = false;
      notify('浏览器暂未允许音频播放，请再次点击声音按钮。');
    }
  }, [patch, notify]);
  const toggleFull = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify('当前浏览器不支持全屏；可使用浏览器的全屏功能。');
    }
  }, [notify]);
  const rotateDisplay = useCallback(async () => {
    if (rotating) return;
    const target = landscape ? 'portrait' : 'landscape';
    const label = landscape ? '竖屏' : '横屏';
    setRotating(true);
    const result = await requestDisplayOrientation(target);
    setRotating(false);
    notify(
      result === 'locked'
        ? `已锁定${label}`
        : `此浏览器不能自动切换方向，请转动设备使用${label}；如未旋转，请关闭系统方向锁定。`,
    );
  }, [landscape, rotating, notify]);
  useEffect(() => {
    const sync = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        modal ||
        recording !== null
      )
        return;
      const s = current.current;
      if (e.code === 'Space' && s.entered) {
        e.preventDefault();
        patch({ playing: !s.playing, mode: 'scroll' });
      } else if (e.code === 'KeyV' && s.entered) {
        patch({
          mode: modes[(modes.findIndex((m) => m.id === s.mode) + 1) % 3]!.id,
          playing: false,
        });
      } else if (e.code === 'KeyT' && !['starry', 'winter'].includes(s.painting)) {
        patch({ time: times[(times.findIndex((t) => t.id === s.time) + 1) % 4]!.id });
      } else if (e.code === 'KeyH') setModal('help');
      else if (e.code === 'KeyF') void toggleFull();
      else if (e.code === 'KeyQ')
        patch({
          quality: s.quality === 'high' ? 'balanced' : s.quality === 'balanced' ? 'low' : 'high',
        });
      else if (/^Digit[1-5]$/.test(e.code) && s.entered) {
        seek(getPainting(s.painting).chapters[Number(e.code.slice(-1)) - 1]!.progress);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modal, recording, patch, seek, toggleFull]);
  const saveView = () => {
    if (!engine.current) return;
    download(engine.current.capture(), `入画-${painting.shortTitle}-${Date.now()}.png`);
    notify('取景已保存');
  };
  const record = async () => {
    if (!engine.current) return;
    setRecording(0);
    setModal(null);
    try {
      const blob = await engine.current.recordFilm(setRecording, portrait);
      const url = URL.createObjectURL(blob);
      download(url, `${painting.id}-${portrait ? 'portrait' : 'landscape'}.webm`);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      notify('影片已导出，可转换为 MP4 分享');
    } catch (e) {
      notify(e instanceof Error ? e.message : '导出失败');
    } finally {
      setRecording(null);
      engine.current?.configure(current.current);
    }
  };
  return (
    <main
      className={`app ${state.entered ? 'is-exploring' : 'is-gallery'} ${['starry', 'winter'].includes(state.painting) ? 'is-starry' : ''} ${state.time === 'night' || (state.time === 'journey' && state.progress > 0.75) ? 'is-night' : ''} ${recording !== null ? 'is-recording' : ''}`}
      style={{ '--accent': painting.accent } as React.CSSProperties}
    >
      <div
        ref={host}
        className="world"
        data-testid="world"
        aria-busy={sceneLoading}
        data-scene-switching={sceneLoading}
      />
      <div className="paper-grain" aria-hidden="true" />
      <div className="gallery-wash" aria-hidden="true" />
      <header className="site-header">
        <button
          className={state.entered ? 'home-button' : 'brand'}
          onClick={() => patch({ entered: false, playing: false, mode: 'scroll' })}
          aria-label="返回画境首页"
        >
          {state.entered ? (
            <>
              <ArrowLeft size={18} />
              <span>返回首页</span>
            </>
          ) : (
            <>
              <span className="seal">
                入<br />画
              </span>
              <span className="brand-name">
                入画<span>WITHIN</span>
              </span>
            </>
          )}
        </button>
        {state.entered && (
          <nav className="scene-switcher" aria-label="切换画境">
            <button
              aria-label="上一个画境"
              title="上一个画境"
              disabled={recording !== null}
              onClick={() =>
                selectPainting(
                  PAINTINGS[(paintingIndex - 1 + PAINTINGS.length) % PAINTINGS.length]!.id,
                )
              }
            >
              <ArrowLeft size={16} />
            </button>
            <button
              className="scene-switcher-current"
              aria-label={`选择画境，当前${painting.shortTitle}`}
              aria-haspopup="dialog"
              aria-expanded={modal === 'scenes'}
              disabled={recording !== null}
              onClick={() => {
                setSettings(false);
                setModal('scenes');
              }}
            >
              <span>{painting.shortTitle}</span>
              <CaretDown size={13} />
            </button>
            <button
              aria-label="下一个画境"
              title="下一个画境"
              disabled={recording !== null}
              onClick={() => selectPainting(PAINTINGS[(paintingIndex + 1) % PAINTINGS.length]!.id)}
            >
              <ArrowRight size={16} />
            </button>
          </nav>
        )}
        {state.entered ? (
          <div className="view-switch" aria-label="选择视角">
            {modes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={state.mode === id ? 'active' : ''}
                aria-pressed={state.mode === id}
                onClick={() => {
                  patch({ mode: id, playing: false });
                  if (id === 'walk') notify('电脑点击画面转头，Esc 释放；手机左手摇杆、右手观察');
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <nav className="top-nav" aria-label="主导航">
            <button
              className="current"
              onClick={() =>
                document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              画境收藏<span>{PAINTINGS.length.toString().padStart(2, '0')}</span>
            </button>
            <button onClick={() => setModal('about')}>关于入画</button>
          </nav>
        )}
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={state.sound ? '关闭配乐与音效' : '开启配乐与音效'}
            aria-pressed={state.sound}
            title="配乐与场景音效"
            onClick={() => void toggleSound()}
          >
            {state.sound ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}
          </button>
          <button
            className="icon-button fullscreen-button"
            aria-label={fullscreen ? '退出全屏' : '全屏'}
            onClick={() => void toggleFull()}
          >
            {fullscreen ? <ArrowsIn size={20} /> : <ArrowsOut size={20} />}
          </button>
          <button
            className="icon-button help-button"
            aria-label="操作说明"
            onClick={() => setModal('help')}
          >
            <Info size={20} />
          </button>
        </div>
      </header>
      {!state.entered && (
        <>
          <section className="hero-copy" key={painting.id}>
            <p className="art-meta">
              {painting.era}
              <span>/</span>
              {painting.artist}
            </p>
            <h1>{painting.shortTitle}</h1>
            <div className="title-rule">
              <span>{painting.technique}</span>
              <i />
            </div>
            <h2>{painting.tagline}</h2>
            <p className="hero-description">{painting.introduction}</p>
            <button
              className="enter-button"
              disabled={!ready || sceneLoading || !!error}
              onClick={() => {
                patch({ entered: true, mode: 'scroll', playing: true, progress: 0 });
                notify('滚轮展卷 · 拖动画面 · 空格暂停');
              }}
            >
              <span>走进画中</span>
              <ArrowRight size={23} />
            </button>
            <button className="original-link" onClick={() => setModal('original')}>
              <ImageSquare size={18} />
              查看原作与出处
            </button>
          </section>

          <div className="scene-caption">
            <span className="caption-number">
              {(PAINTINGS.findIndex((p) => p.id === state.painting) + 1)
                .toString()
                .padStart(2, '0')}
            </span>
            <div>
              <span>{painting.english}</span>
            </div>
          </div>
          <section id="collection" className="collection" aria-label="画境收藏">
            <div className="collection-label">
              <span>选择一方天地</span>
              <div className="collection-paging">
                <span>THE COLLECTION / 01—{PAINTINGS.length.toString().padStart(2, '0')}</span>
                <button
                  aria-label="向左浏览画境"
                  onClick={() =>
                    collectionList.current?.scrollBy({ left: -580, behavior: 'smooth' })
                  }
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  aria-label="向右浏览画境"
                  onClick={() =>
                    collectionList.current?.scrollBy({ left: 580, behavior: 'smooth' })
                  }
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="artwork-list" ref={collectionList}>
              {PAINTINGS.map((p, i) => (
                <button
                  key={p.id}
                  className={`artwork-card ${state.painting === p.id ? 'selected' : ''}`}
                  onClick={() => selectPainting(p.id)}
                  aria-label={`选择${p.title}`}
                  aria-pressed={state.painting === p.id}
                >
                  <div className="artwork-thumb">
                    <ArtworkPreview painting={p} />
                    <span className="artwork-number">{(i + 1).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="artwork-info">
                    <span>
                      <strong>{p.shortTitle}</strong>
                      <small>
                        {p.artist} · {p.era.split(' · ')[0]}
                      </small>
                    </span>
                    {state.painting === p.id ? (
                      <span className="selected-dot" />
                    ) : (
                      <CaretRight size={16} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      {state.entered && (
        <>
          <div className="experience-title">
            <h1>{painting.shortTitle}</h1>
            <span>
              {painting.artist} · {painting.technique}
            </span>
          </div>
          <aside className="scene-tools">
            <button
              className="tool-button tool-labelled"
              aria-label="查看原作与出处"
              title="查看原作与出处"
              onClick={() => setModal('original')}
            >
              <ImageSquare size={20} />
              <span>原作</span>
            </button>
            <button
              className="tool-button tool-labelled orientation-button"
              aria-label={landscape ? '切换竖屏' : '切换横屏'}
              title={landscape ? '切换竖屏' : '切换横屏'}
              disabled={rotating}
              onClick={() => void rotateDisplay()}
            >
              <ArrowsClockwise size={20} />
              <span>{landscape ? '竖屏' : '横屏'}</span>
            </button>
            <button
              className="tool-button"
              aria-label="取景保存"
              title="取景保存"
              onClick={saveView}
            >
              <Camera size={21} />
            </button>
            <button
              className="tool-button"
              aria-label="导出影片"
              title="导出影片"
              onClick={() => setModal('film')}
            >
              <FilmStrip size={21} />
            </button>
            <button
              className={`tool-button ${settings ? 'active' : ''}`}
              aria-label="画境设置"
              aria-expanded={settings}
              title="画境设置"
              onClick={() => setSettings(!settings)}
            >
              <GearSix size={21} />
            </button>
            <button
              className="tool-button"
              aria-label="重置视角"
              title="重置视角"
              onClick={() => {
                engine.current?.resetView();
                patch({ progress: 0, playing: false });
              }}
            >
              <ArrowCounterClockwise size={21} />
            </button>
          </aside>
          {settings && (
            <section className="settings-panel" aria-label="画境设置">
              <div className="panel-heading">
                <h2>画境设置</h2>
                <button
                  className="icon-button"
                  aria-label="关闭设置"
                  onClick={() => setSettings(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <label>天色</label>
              <div className="option-grid">
                {times.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={state.time === id ? 'active' : ''}
                    aria-pressed={state.time === id}
                    disabled={['starry', 'winter'].includes(state.painting) && id !== 'night'}
                    onClick={() => patch({ time: id })}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
              {['starry', 'winter'].includes(state.painting) && (
                <p className="setting-note">此画境保留原作夜景光色。</p>
              )}
              <label htmlFor="quality">渲染画质</label>
              <select
                id="quality"
                value={state.quality}
                onChange={(e) => patch({ quality: e.target.value as ExperienceState['quality'] })}
              >
                <option value="high">精细 · 最高画质</option>
                <option value="balanced">均衡</option>
                <option value="low">流畅 · 低分辨率</option>
              </select>
              <button
                className="toggle-row"
                role="switch"
                aria-checked={state.mist}
                onClick={() => patch({ mist: !state.mist })}
              >
                <span>
                  <CloudFog size={18} />
                  山岚薄雾
                </span>
                <span className={`switch ${state.mist ? 'on' : ''}`} />
              </button>
              <div className="performance">
                <span>{stats.fps} FPS</span>
                <span>{stats.drawCalls} 绘制批次</span>
              </div>
              <button
                className="settings-help"
                onClick={() => {
                  setSettings(false);
                  setModal('help');
                }}
              >
                <Info size={17} />
                操作说明与快捷键
              </button>
              <div className="sound-mixer">
                <p className="sound-caption">
                  <strong>{SOUND_PALETTES[state.painting].title}</strong>
                  <span>{SOUND_PALETTES[state.painting].description}</span>
                </p>
                <button onClick={() => void toggleSound()} className="sound-enable">
                  {state.sound ? '关闭声音' : '开启声音'}
                </button>
                <label htmlFor="music-volume">
                  背景音乐 <span>{Math.round(musicVolume * 100)}%</span>
                </label>
                <input
                  id="music-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                />
                <label htmlFor="ambience-volume">
                  场景音效 <span>{Math.round(ambienceVolume * 100)}%</span>
                </label>
                <input
                  id="ambience-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={ambienceVolume}
                  onChange={(e) => setAmbienceVolume(Number(e.target.value))}
                />
              </div>
            </section>
          )}
          {state.painting === 'empire' && (
            <div className="period-control">
              <span>时代</span>
              {PERIODS.map((p, i) => (
                <button
                  key={p}
                  aria-pressed={state.period === i}
                  className={state.period === i ? 'active' : ''}
                  onClick={() => {
                    if (state.mode === 'scroll') seek(painting.chapters[i]!.progress);
                    else
                      patch({
                        period: i,
                        progress: painting.chapters[i]!.progress,
                        playing: false,
                      });
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div
            className="chapter-caption"
            key={`${state.painting}-${chapterIndex}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="eyebrow">
              0{chapterIndex + 1} / {chapter.subtitle}
            </span>
            <div className="chapter-heading">
              <h2>{chapter.title}</h2>
              <div className="chapter-arrows" aria-label="章节翻页">
                <button
                  aria-label="上一章节"
                  disabled={chapterIndex === 0}
                  onClick={() => seek(painting.chapters[chapterIndex - 1]!.progress)}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  aria-label="下一章节"
                  disabled={chapterIndex === painting.chapters.length - 1}
                  onClick={() => seek(painting.chapters[chapterIndex + 1]!.progress)}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <p>{chapter.description}</p>
          </div>
          {state.mode === 'walk' && <WalkJoystick onMove={moveWalk} />}
          <section className="journey-panel" aria-label="游览控制">
            <div className="journey-top">
              <div className="playback">
                <button
                  className="play-button"
                  aria-label={state.playing ? '暂停游览' : '自动游览'}
                  onClick={() =>
                    patch({
                      playing: !state.playing,
                      mode: 'scroll',
                      progress: state.progress >= 1 ? 0 : state.progress,
                    })
                  }
                >
                  {state.playing ? (
                    <Pause weight="fill" size={17} />
                  ) : (
                    <Play weight="fill" size={17} />
                  )}
                </button>
                <button
                  className="speed-button"
                  aria-label="切换游览速度"
                  onClick={() => patch({ speed: nextSpeed(state.speed) })}
                >
                  {state.speed}×
                </button>
              </div>
              <div className="chapter-nav">
                {painting.chapters.map((c, i) => (
                  <button
                    key={c.title}
                    className={chapterIndex === i ? 'active' : ''}
                    aria-current={chapterIndex === i ? 'step' : undefined}
                    onClick={() => seek(c.progress)}
                  >
                    <span>{(i + 1).toString().padStart(2, '0')}</span>
                    {c.title}
                  </button>
                ))}
              </div>
              <span className="time-indicator">
                {state.time === 'night' || ['starry', 'winter'].includes(state.painting) ? (
                  <Moon size={16} />
                ) : (
                  <SunHorizon size={16} />
                )}{' '}
                {['starry', 'winter'].includes(state.painting)
                  ? '星夜'
                  : readableTime(state.time, state.progress)}
              </span>
            </div>
            <MiniMap painting={painting} progress={state.progress} onChange={seek} />
            <div className="journey-bottom">
              <span>
                {state.mode === 'walk'
                  ? 'WASD 行走 · 点击转头 · Esc 释放'
                  : state.mode === 'orbit'
                    ? '左拖平移 · 右拖旋转 · 滚轮缩放'
                    : '滚轮展卷 · 双指缩放 · 空格播放'}
              </span>
              <span>
                {Math.round(state.progress * 100)}%<span className="progress-divider">/</span>
                游览进度
              </span>
            </div>
          </section>
        </>
      )}
      {!ready && !error && (
        <div className="loading-state">
          <CircleNotch className="spin" size={24} />
          <span>叠山理水，展卷入境…</span>
        </div>
      )}
      {ready && sceneLoading && !error && (
        <div className="scene-loading" role="status">
          <CircleNotch className="spin" size={17} />
          正在展开{painting.shortTitle}…
        </div>
      )}
      {error && (
        <div className="error-state" role="alert">
          <Mountains size={32} />
          <h2>画境暂未展开</h2>
          <p>{error}</p>
          <p>请开启浏览器硬件加速，或使用新版 Chrome / Edge。</p>
          <button onClick={() => location.reload()}>重新加载</button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {recording !== null && (
        <div className="recording-banner" role="status">
          <span className="record-dot" />
          正在录制实景影片 · {Math.round(recording * 100)}%<small>请保持此页面可见</small>
        </div>
      )}
      {modal === 'encounter' && (
        <Dialog title={ENCOUNTER_TEXT[state.painting].title} onClose={() => setModal(null)}>
          <p className="encounter-copy">{ENCOUNTER_TEXT[state.painting].text}</p>
          <button className="encounter-close" onClick={() => setModal(null)}>
            再看一会儿风景 <ArrowRight size={16} />
          </button>
        </Dialog>
      )}
      {modal === 'scenes' && (
        <Dialog title="切换画境" onClose={() => setModal(null)} className="scene-picker-dialog">
          <p className="scene-picker-hint">从展卷起点开始，保留当前播放、画质与声音设置。</p>
          <div className="scene-picker-list">
            {PAINTINGS.map((item, index) => (
              <button
                key={item.id}
                aria-label={`切换到${item.title}`}
                aria-current={state.painting === item.id ? 'true' : undefined}
                onClick={() => selectPainting(item.id)}
              >
                <span className="scene-picker-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="scene-picker-label">
                  <strong>{item.shortTitle}</strong>
                  <small>
                    {item.artist} · {item.era}
                  </small>
                </span>
                {state.painting === item.id ? <Check size={18} /> : <CaretRight size={15} />}
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {modal === 'original' && (
        <OriginalViewer painting={painting} onClose={() => setModal(null)} />
      )}
      {modal === 'help' && (
        <Dialog title="游览指南" onClose={() => setModal(null)}>
          <div className="help-modes">
            {modes.map(({ label, icon: Icon }, i) => (
              <div key={label}>
                <Icon size={24} />
                <h3>{label}</h3>
                <p>
                  {
                    [
                      '滚轮或拖动展卷；Ctrl+滚轮、+ / − 或双指捏合缩放。点章节直接抵达。',
                      '左键平移、右键旋转、滚轮缩放。手机单指平移，双指缩放与旋转。',
                      '点击画面锁定鼠标，WASD 行走，Shift 加速，Esc 释放；手机左手摇杆、右手转头。',
                    ][i]
                  }
                </p>
              </div>
            ))}
          </div>
          <div className="keyboard-list">
            {[
              ['空格', '播放 / 暂停'],
              ['V', '切换视角'],
              ['1—5', '跳转章节'],
              ['T', '切换天色'],
              ['Q', '切换画质'],
              ['F', '全屏'],
              ['H', '打开说明'],
            ].map(([key, label]) => (
              <span key={key}>
                <kbd>{key}</kbd>
                {label}
              </span>
            ))}
          </div>
          <p className="dialog-note">
            步行限制在可站立的陆地；水面和陡坡不可通行。游览水路请使用展卷模式。
          </p>
        </Dialog>
      )}
      {modal === 'about' && (
        <Dialog title="让风景，成为一段经历。" onClose={() => setModal(null)}>
          <p className="about-lead">
            入画是一座可以游览的数字风景画馆。七组画作、三处实景，用不同的方式看待天地与时间。
          </p>
          <p>
            所有山体、树木、舟桥与建筑由程序生成，在浏览器中实时渲染。作品依据原画的构图、色彩与情绪进行三维意境演绎，并非对原画每一处细节的测绘复原。
          </p>
          <div className="source-list">
            {PAINTINGS.map((p) => (
              <a key={p.id} href={p.source} target="_blank" rel="noreferrer">
                <span>
                  {p.title}
                  <small>{p.artist}</small>
                </span>
                <ArrowRight size={18} />
              </a>
            ))}
          </div>
          <p className="dialog-note">
            「查看原作」提供画作图像与馆藏出处，可与三维演绎对照；帝国的进程包含五幅组画。三维模型与场景缩略图由程序生成，原作图像不作模型贴图。实景场景提供地域资料。配乐与场景音效由浏览器本地合成。
          </p>
        </Dialog>
      )}
      {modal === 'film' && (
        <Dialog title="把此刻，带出画卷。" onClose={() => setModal(null)}>
          <p>
            导出一段 24 秒的实时三维游览影片，包含章节题签、运镜和全景收束。录制期间请保持页面可见。
          </p>
          <div className="film-options">
            <button className={!portrait ? 'active' : ''} onClick={() => setPortrait(false)}>
              <span className="ratio-landscape" />
              横屏 · 1280 × 720
            </button>
            <button className={portrait ? 'active' : ''} onClick={() => setPortrait(true)}>
              <span className="ratio-portrait" />
              竖屏 · 720 × 1280
            </button>
          </div>
          <p className="dialog-note">
            导出 WebM，包含本场景配乐与音效，使用影片预设混音；可使用 FFmpeg 转为
            MP4。建议在电脑录制。
          </p>
          <button className="enter-button" onClick={() => void record()}>
            <FilmStrip size={20} />
            开始录制
            <ArrowRight size={20} />
          </button>
        </Dialog>
      )}
      <a className="skip-link" href="#collection">
        跳至画境选择
      </a>
      <span className="sr-only">
        <House />
        入画数字画馆
      </span>
    </main>
  );
}
