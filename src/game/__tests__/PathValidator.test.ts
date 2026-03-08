import { describe, it, expect } from 'vitest';
import { PathValidator } from '../PathValidator';

describe('PathValidator', () => {
  it('allows first point always', () => {
    const v = new PathValidator(1000);
    expect(v.canAddPoint([], { x: 100, y: 100 })).toBe(true);
  });

  it('rejects backward movement', () => {
    const v = new PathValidator(1000);
    const path = [{ x: 100, y: 100 }];
    expect(v.canAddPoint(path, { x: 50, y: 100 })).toBe(false);
  });

  it('rejects points too close together', () => {
    const v = new PathValidator(1000);
    const path = [{ x: 100, y: 100 }];
    expect(v.canAddPoint(path, { x: 101, y: 100 })).toBe(false);
  });

  it('rejects points exceeding max length', () => {
    const v = new PathValidator(10);
    const path = [{ x: 0, y: 0 }];
    expect(v.canAddPoint(path, { x: 20, y: 0 })).toBe(false);
  });

  it('reports fuel fraction correctly', () => {
    const v = new PathValidator(100);
    const path = [{ x: 0, y: 0 }, { x: 50, y: 0 }];
    expect(v.fuelFraction(path)).toBe(0.5);
  });

  it('smooths path without moving endpoints', () => {
    const points = [{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }];
    const smoothed = PathValidator.smooth(points);
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 10, y: 0 });
    expect(smoothed.length).toBe(3);
  });
});
