import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBackgroundRefresh } from '../useBackgroundRefresh';

describe('useBackgroundRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes on every interval while the tab is visible', () => {
    const refresh = vi.fn();
    renderHook(() => useBackgroundRefresh(refresh, 1000));
    vi.advanceTimersByTime(3000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('does not refresh a hidden tab, but does as soon as it is visible again', () => {
    const refresh = vi.fn();
    renderHook(() => useBackgroundRefresh(refresh, 1000));

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    vi.advanceTimersByTime(2000);
    expect(refresh).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops refreshing once the component is gone and always calls the latest callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ cb }) => useBackgroundRefresh(cb, 1000), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    vi.advanceTimersByTime(1000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    vi.advanceTimersByTime(5000);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
