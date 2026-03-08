import { describe, it, expect } from 'vitest';
import { LevelGenerator } from '../LevelGenerator';

describe('LevelGenerator', () => {
  it('generates a level with obstacles for difficulty > 0', () => {
    const level = LevelGenerator.generate(26, 5);
    expect(level.obstacles.length).toBeGreaterThan(0);
    expect(level.id).toBe(26);
  });

  it('increases obstacle count with difficulty', () => {
    const easy = LevelGenerator.generate(26, 1);
    const hard = LevelGenerator.generate(50, 25);
    expect(hard.obstacles.length).toBeGreaterThanOrEqual(easy.obstacles.length);
  });

  it('always places landing pad on right side', () => {
    for (let i = 0; i < 10; i++) {
      const level = LevelGenerator.generate(30 + i, 5 + i);
      expect(level.landingPad.position.x).toBeGreaterThan(500);
    }
  });

  it('generates deterministic levels from same seed', () => {
    const a = LevelGenerator.generate(30, 5);
    const b = LevelGenerator.generate(30, 5);
    expect(a.obstacles.length).toBe(b.obstacles.length);
  });
});
