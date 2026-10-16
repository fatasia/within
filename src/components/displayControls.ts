export type DisplayOrientation = 'landscape' | 'portrait';
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: DisplayOrientation) => Promise<void>;
};

/** Prefer native rotation; the page-level fallback is applied by useDisplayOrientation. */
export async function requestDisplayOrientation(
  target: DisplayOrientation,
): Promise<'locked' | 'unsupported' | 'failed'> {
  const orientation = window.screen.orientation as LockableOrientation | undefined;
  if (!orientation?.lock) return 'unsupported';
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    await orientation.lock(target);
    return 'locked';
  } catch {
    return 'failed';
  }
}

/** Let the new selection paint before its synchronous geometry build starts. */
export function afterPaint(callback: () => void): () => void {
  let first = 0,
    second = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  first = requestAnimationFrame(() => {
    second = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        if (!cancelled) callback();
      }, 0);
    });
  });
  return () => {
    cancelled = true;
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
    if (timer !== undefined) clearTimeout(timer);
  };
}
