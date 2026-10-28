import { describe, expect, it } from 'vitest';
import { workloadLevel } from '../utils/workload';

describe('workloadLevel', () => {
  it('is green for 0 to 1 project, amber for 2 to 3 and red above 3', () => {
    expect([0, 1].map((n) => workloadLevel(n).label)).toEqual(['Light load', 'Light load']);
    expect(workloadLevel(0).className).toContain('emerald');
    expect([2, 3].map((n) => workloadLevel(n).label)).toEqual(['Moderate load', 'Moderate load']);
    expect(workloadLevel(3).className).toContain('amber');
    expect(workloadLevel(4).label).toBe('Overloaded');
    expect(workloadLevel(9).className).toContain('rose');
  });
});
