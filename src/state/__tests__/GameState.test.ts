import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '../GameState';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
});

describe('GameState', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('starts at level 1 with no stars', () => {
    const gs = new GameState();
    expect(gs.getCurrentLevel()).toBe(1);
    expect(gs.getTotalStars()).toBe(0);
  });

  it('advances level on completion', () => {
    const gs = new GameState();
    gs.completeLevel(1, 2);
    expect(gs.getCurrentLevel()).toBe(2);
    expect(gs.getStars(1)).toBe(2);
  });

  it('keeps best star rating', () => {
    const gs = new GameState();
    gs.completeLevel(1, 2);
    gs.completeLevel(1, 1);
    expect(gs.getStars(1)).toBe(2);
    gs.completeLevel(1, 3);
    expect(gs.getStars(1)).toBe(3);
  });

  it('persists across instances', () => {
    const gs1 = new GameState();
    gs1.completeLevel(1, 3);
    const gs2 = new GameState();
    expect(gs2.getCurrentLevel()).toBe(2);
    expect(gs2.getStars(1)).toBe(3);
  });
});
