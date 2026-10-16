import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowSquareOut, Minus, Plus } from '@phosphor-icons/react';
import type { Painting } from '../types';
import { ORIGINALS } from '../data/originals';
import { Dialog } from './Dialog';

export function OriginalViewer({ painting, onClose }: { painting: Painting; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [panorama, setPanorama] = useState(false);
  const [overview, setOverview] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const original = ORIGINALS[painting.id];
  const image = original?.images[index];
  useLayoutEffect(() => {
    if (panorama && !overview && viewport.current)
      viewport.current.scrollLeft = viewport.current.scrollWidth;
  }, [panorama, overview, index]);
  return (
    <Dialog
      title={original ? `${painting.shortTitle} · 原作` : `${painting.shortTitle} · 实景出处`}
      onClose={onClose}
      className="original-dialog"
    >
      {original && image ? (
        <>
          <div className="original-controls">
            <span>
              {image.scope === 'complete' ? '全幅' : '局部'} · {index + 1} /{' '}
              {original.images.length}
            </span>
            <div className="original-zoom">
              <button
                aria-label="缩小原作"
                disabled={zoom <= 1}
                onClick={() => setZoom((v) => Math.max(1, v - 1))}
              >
                <Minus size={18} />
              </button>
              <span>{zoom}×</span>
              <button
                aria-label="放大原作"
                disabled={zoom >= 8}
                onClick={() => setZoom((v) => Math.min(8, v + 1))}
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  if (panorama) setOverview((v) => !v);
                }}
              >
                {panorama ? (overview ? '卷首' : '全览') : '适屏'}
              </button>
            </div>
          </div>
          <div
            ref={viewport}
            className="original-viewport"
            tabIndex={0}
            aria-label="原作图像，可滚动查看放大细节"
          >
            {failed ? (
              <p>图像暂未载入，可通过下方馆藏链接查看。</p>
            ) : (
              <img
                key={image.src}
                src={`${import.meta.env.BASE_URL}${image.src.replace(/^\//, '')}`}
                alt={image.alt}
                onError={() => setFailed(true)}
                onLoad={(event) =>
                  setPanorama(
                    event.currentTarget.naturalWidth / event.currentTarget.naturalHeight > 8,
                  )
                }
                style={{
                  width: panorama && !overview ? 'auto' : `${zoom * 100}%`,
                  height: panorama
                    ? overview
                      ? 'auto'
                      : `calc(min(360px, var(--view-height, 100dvh) * .4) * ${zoom})`
                    : zoom === 1
                      ? 'calc(var(--view-height, 100dvh) * .5)'
                      : 'auto',
                }}
              />
            )}
          </div>
          <p className="original-caption">{image.caption}</p>
          {original.images.length > 1 && (
            <div className="original-pages" aria-label="选择原作图像">
              {original.images.map((item, i) => (
                <button
                  key={item.src}
                  aria-pressed={i === index}
                  className={i === index ? 'active' : ''}
                  onClick={() => {
                    if (i === index) return;
                    setIndex(i);
                    setZoom(1);
                    setFailed(false);
                    setPanorama(false);
                    setOverview(false);
                  }}
                >
                  {item.caption}
                </button>
              ))}
            </div>
          )}
          <p className="original-hint">
            {panorama && '长卷从右侧卷首展开，可横向拖动，或点击“全览”查看整卷。'}
            放大后可横向、纵向滚动查看。局部图不代表整幅原作；三维场景为意境演绎。
          </p>
          <div className="original-credit">
            <span>
              {original.artist} · {original.credit}
            </span>
            <div className="original-source-links">
              <a href={original.sourceUrl} target="_blank" rel="noreferrer">
                馆藏出处 <ArrowSquareOut size={16} />
              </a>
              {original.creditUrl && (
                <a href={original.creditUrl} target="_blank" rel="noreferrer">
                  图像来源 <ArrowSquareOut size={16} />
                </a>
              )}
              {original.licenseUrl && (
                <a href={original.licenseUrl} target="_blank" rel="noreferrer">
                  图像许可 <ArrowSquareOut size={16} />
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <p>
            此场景取材于{painting.shortTitle}
            的实景风貌，没有对应的单幅古画。山体、建筑与游览路线为三维场景设计，并非实地测绘。
          </p>
          <a className="original-source" href={painting.source} target="_blank" rel="noreferrer">
            查看地域资料 <ArrowSquareOut size={18} />
          </a>
          {painting.id === 'roadster' && (
            <a className="original-source" href={`${import.meta.env.BASE_URL}assets/neon/README.md`} target="_blank" rel="noreferrer">
              夜街资产来源与许可 <ArrowSquareOut size={18} />
            </a>
          )}
        </>
      )}
    </Dialog>
  );
}
