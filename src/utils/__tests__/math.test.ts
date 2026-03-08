import { describe, it, expect } from 'vitest';
import { distance, lerp, pathLength, clamp } from '../math';

describe('math utils', () => {
  it('calculates distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('lerps between values', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('calculates path length', () => {
    const path = [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 0 }];
    expect(pathLength(path)).toBe(10);
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
