import { LevelConfig } from '../game/types';

export const levels: LevelConfig[] = [
  // Level 1: Tutorial - just swing and land
  {
    id: 1,
    startPosition: { x: 100, y: 150 },
    maxLineLength: 800,
    parLineLength: 400,
    obstacles: [],
    landingPad: { position: { x: 650, y: 500 }, width: 100 },
  },
  // Level 2: Tutorial - higher landing pad
  {
    id: 2,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 900,
    parLineLength: 500,
    obstacles: [],
    landingPad: { position: { x: 650, y: 350 }, width: 80 },
  },
  // Level 3: Tutorial - swing down then up to land
  {
    id: 3,
    startPosition: { x: 80, y: 200 },
    maxLineLength: 1000,
    parLineLength: 600,
    obstacles: [],
    landingPad: { position: { x: 680, y: 200 }, width: 70 },
  },
  // Level 4: First wall
  {
    id: 4,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1000,
    parLineLength: 550,
    obstacles: [
      { type: 'wall', position: { x: 380, y: 350 }, width: 20, height: 250 },
    ],
    landingPad: { position: { x: 650, y: 500 }, width: 80 },
  },
  // Level 5: Taller wall
  {
    id: 5,
    startPosition: { x: 80, y: 200 },
    maxLineLength: 1000,
    parLineLength: 500,
    obstacles: [
      { type: 'wall', position: { x: 350, y: 250 }, width: 20, height: 350 },
    ],
    landingPad: { position: { x: 650, y: 500 }, width: 70 },
  },
];
