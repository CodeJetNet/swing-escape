import { LevelConfig, ObstacleConfig } from '../game/types';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';

export class LevelGenerator {
  private static seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  static generate(levelId: number, difficulty: number): LevelConfig {
    const rand = LevelGenerator.seededRandom(levelId * 7919);

    // Difficulty flattens every 10 levels for breathing room
    const effectiveDifficulty = difficulty - Math.floor(difficulty / 10) * 2;

    const obstacleCount = Math.min(1 + Math.floor(effectiveDifficulty / 2), 8);

    const types: ObstacleConfig['type'][] = ['wall'];
    if (effectiveDifficulty >= 3) types.push('lava');
    if (effectiveDifficulty >= 6) types.push('window');
    if (effectiveDifficulty >= 10) types.push('ceiling');

    const obstacles: ObstacleConfig[] = [];
    const usedXPositions: number[] = [];

    for (let i = 0; i < obstacleCount; i++) {
      const type = types[Math.floor(rand() * types.length)];
      let x = 200 + (i / obstacleCount) * 400;
      x += (rand() - 0.5) * 60;
      while (usedXPositions.some(px => Math.abs(px - x) < 50)) x += 50;
      usedXPositions.push(x);

      switch (type) {
        case 'wall':
          obstacles.push({
            type: 'wall',
            position: { x, y: 200 + rand() * 200 },
            width: 15 + rand() * 10,
            height: 100 + rand() * (50 + effectiveDifficulty * 15),
          });
          break;
        case 'lava':
          obstacles.push({
            type: 'lava',
            position: { x: x - 30, y: WORLD_HEIGHT - 30 },
            width: 60 + rand() * 80 + effectiveDifficulty * 5,
            height: 30,
          });
          break;
        case 'window': {
          const gapHeight = Math.max(35, 70 - effectiveDifficulty * 2);
          obstacles.push({
            type: 'window',
            position: { x, y: 150 + rand() * 200 },
            width: 15 + rand() * 10,
            height: WORLD_HEIGHT,
            gapHeight,
          });
          break;
        }
        case 'ceiling':
          obstacles.push({
            type: 'ceiling',
            position: { x: x - 20, y: 0 },
            width: 80 + rand() * 60,
            height: 80 + rand() * 60 + effectiveDifficulty * 5,
          });
          break;
      }
    }

    const padWidth = Math.max(40, 100 - effectiveDifficulty * 3);
    const padX = 620 + rand() * 60;
    const padY = 300 + rand() * 200;
    const maxLineLength = Math.max(600, 1200 - effectiveDifficulty * 20);
    const parLineLength = maxLineLength * 0.6;

    return {
      id: levelId,
      startPosition: { x: 60 + rand() * 40, y: 100 + rand() * 100 },
      maxLineLength,
      parLineLength,
      obstacles,
      landingPad: { position: { x: padX, y: padY }, width: padWidth },
    };
  }
}
