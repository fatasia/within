import { useCallback, useLayoutEffect, useState } from 'react';
import { requestDisplayOrientation, type DisplayOrientation } from './displayControls';

export function useDisplayOrientation(entered: boolean, notify: (text: string) => void) {
  const [target, setTarget] = useState<DisplayOrientation | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [rotating, setRotating] = useState(false);
  const naturalLandscape = viewport.width > viewport.height;
  const rotated = entered && target !== null && (target === 'landscape') !== naturalLandscape;
  const landscape = rotated ? !naturalLandscape : naturalLandscape;
  useLayoutEffect(() => {
    const sync = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
    };
  }, []);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.viewRotation = rotated ? '90' : '0';
    root.style.setProperty('--view-width', `${rotated ? viewport.height : viewport.width}px`);
    root.style.setProperty('--view-height', `${rotated ? viewport.width : viewport.height}px`);
    return () => {
      delete root.dataset.viewRotation;
      root.style.removeProperty('--view-width');
      root.style.removeProperty('--view-height');
    };
  }, [rotated, viewport]);
  const rotateDisplay = useCallback(async () => {
    if (rotating) return;
    const next = landscape ? 'portrait' : 'landscape';
    // Apply immediately: Safari and orientation-locked devices need no native API.
    setTarget(next);
    setRotating(true);
    const result = await requestDisplayOrientation(next);
    setRotating(false);
    notify(
      result === 'locked'
        ? `已锁定${next === 'landscape' ? '横屏' : '竖屏'}`
        : `已切换${next === 'landscape' ? '横屏' : '竖屏'}`,
    );
  }, [landscape, rotating, notify]);
  return { landscape, rotating, rotateDisplay };
}
