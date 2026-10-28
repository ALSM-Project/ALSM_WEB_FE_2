import { useEffect, useRef } from 'react';

/**
 * Calls `refresh` every `intervalMs` while the tab is visible, and once more whenever the
 * tab becomes visible again, so a list kept open stays in step with changes other people make
 * (for example a Team Lead moving a project to another engineer).
 */
export function useBackgroundRefresh(refresh: () => void, intervalMs = 15000): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') latest.current();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
}
