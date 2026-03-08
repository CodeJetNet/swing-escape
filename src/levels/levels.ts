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

  // --- Levels 6-7: Walls with varying heights and positions ---

  // Level 6: Short wall, further right — forces a wider arc
  {
    id: 6,
    startPosition: { x: 80, y: 180 },
    maxLineLength: 1000,
    parLineLength: 500,
    obstacles: [
      { type: 'wall', position: { x: 450, y: 400 }, width: 20, height: 200 },
    ],
    landingPad: { position: { x: 680, y: 500 }, width: 70 },
  },
  // Level 7: Two walls at different heights — must weave between them
  {
    id: 7,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'wall', position: { x: 280, y: 350 }, width: 20, height: 250 },
      { type: 'wall', position: { x: 500, y: 200 }, width: 20, height: 400 },
    ],
    landingPad: { position: { x: 680, y: 500 }, width: 70 },
  },

  // --- Levels 8-11: Introduce lava pools ---

  // Level 8: First lava — wide pool on the ground
  {
    id: 8,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1000,
    parLineLength: 500,
    obstacles: [
      { type: 'lava', position: { x: 200, y: 575 }, width: 400, height: 25 },
    ],
    landingPad: { position: { x: 650, y: 500 }, width: 80 },
  },
  // Level 9: Lava pool near landing — must land precisely
  {
    id: 9,
    startPosition: { x: 80, y: 180 },
    maxLineLength: 1000,
    parLineLength: 500,
    obstacles: [
      { type: 'lava', position: { x: 450, y: 575 }, width: 300, height: 25 },
    ],
    landingPad: { position: { x: 680, y: 450 }, width: 70 },
  },
  // Level 10: Two lava pools with a safe gap between them
  {
    id: 10,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'lava', position: { x: 180, y: 575 }, width: 200, height: 25 },
      { type: 'lava', position: { x: 500, y: 575 }, width: 250, height: 25 },
    ],
    landingPad: { position: { x: 660, y: 500 }, width: 70 },
  },
  // Level 11: Nearly full lava floor — must stay airborne and land on raised pad
  {
    id: 11,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'lava', position: { x: 150, y: 575 }, width: 550, height: 25 },
    ],
    landingPad: { position: { x: 680, y: 420 }, width: 70 },
  },

  // --- Levels 12-15: Windows/gaps in walls ---

  // Level 12: First window — generous gap
  {
    id: 12,
    startPosition: { x: 80, y: 200 },
    maxLineLength: 1000,
    parLineLength: 550,
    obstacles: [
      { type: 'window', position: { x: 400, y: 250 }, width: 20, height: 600, gapHeight: 150 },
    ],
    landingPad: { position: { x: 650, y: 400 }, width: 70 },
  },
  // Level 13: Window with smaller gap
  {
    id: 13,
    startPosition: { x: 80, y: 200 },
    maxLineLength: 1000,
    parLineLength: 550,
    obstacles: [
      { type: 'window', position: { x: 380, y: 280 }, width: 20, height: 600, gapHeight: 120 },
    ],
    landingPad: { position: { x: 670, y: 450 }, width: 65 },
  },
  // Level 14: Window with gap near the top — must arc high
  {
    id: 14,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'window', position: { x: 400, y: 150 }, width: 20, height: 600, gapHeight: 120 },
    ],
    landingPad: { position: { x: 660, y: 500 }, width: 65 },
  },
  // Level 15: Two windows — thread the needle twice
  {
    id: 15,
    startPosition: { x: 80, y: 200 },
    maxLineLength: 1200,
    parLineLength: 600,
    obstacles: [
      { type: 'window', position: { x: 300, y: 220 }, width: 20, height: 600, gapHeight: 130 },
      { type: 'window', position: { x: 550, y: 300 }, width: 20, height: 600, gapHeight: 130 },
    ],
    landingPad: { position: { x: 680, y: 450 }, width: 60 },
  },

  // --- Levels 16-19: Combined obstacles ---

  // Level 16: Wall + lava — go over the wall, avoid lava on landing
  {
    id: 16,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1000,
    parLineLength: 500,
    obstacles: [
      { type: 'wall', position: { x: 300, y: 300 }, width: 20, height: 300 },
      { type: 'lava', position: { x: 400, y: 575 }, width: 300, height: 25 },
    ],
    landingPad: { position: { x: 680, y: 450 }, width: 60 },
  },
  // Level 17: Window + lava — thread the gap while lava covers the floor beyond
  {
    id: 17,
    startPosition: { x: 80, y: 180 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'window', position: { x: 350, y: 250 }, width: 20, height: 600, gapHeight: 130 },
      { type: 'lava', position: { x: 400, y: 575 }, width: 350, height: 25 },
    ],
    landingPad: { position: { x: 700, y: 420 }, width: 60 },
  },
  // Level 18: Wall + wall + lava — navigate between walls over lava
  {
    id: 18,
    startPosition: { x: 80, y: 150 },
    maxLineLength: 1200,
    parLineLength: 600,
    obstacles: [
      { type: 'wall', position: { x: 250, y: 300 }, width: 20, height: 300 },
      { type: 'wall', position: { x: 480, y: 250 }, width: 20, height: 350 },
      { type: 'lava', position: { x: 300, y: 575 }, width: 350, height: 25 },
    ],
    landingPad: { position: { x: 680, y: 450 }, width: 60 },
  },
  // Level 19: Window + lava on both sides — precise gap over lava
  {
    id: 19,
    startPosition: { x: 80, y: 180 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'lava', position: { x: 150, y: 575 }, width: 200, height: 25 },
      { type: 'window', position: { x: 420, y: 230 }, width: 20, height: 600, gapHeight: 120 },
      { type: 'lava', position: { x: 470, y: 575 }, width: 250, height: 25 },
    ],
    landingPad: { position: { x: 700, y: 400 }, width: 55 },
  },

  // --- Levels 20-22: Ceilings forcing low paths ---

  // Level 20: First ceiling — forces a low trajectory
  {
    id: 20,
    startPosition: { x: 80, y: 250 },
    maxLineLength: 1000,
    parLineLength: 500,
    obstacles: [
      { type: 'ceiling', position: { x: 200, y: 0 }, width: 500, height: 200 },
    ],
    landingPad: { position: { x: 680, y: 500 }, width: 65 },
  },
  // Level 21: Ceiling + wall — must go low but also over a wall
  {
    id: 21,
    startPosition: { x: 80, y: 250 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'ceiling', position: { x: 200, y: 0 }, width: 450, height: 180 },
      { type: 'wall', position: { x: 450, y: 420 }, width: 20, height: 180 },
    ],
    landingPad: { position: { x: 680, y: 480 }, width: 60 },
  },
  // Level 22: Ceiling + lava — narrow vertical corridor
  {
    id: 22,
    startPosition: { x: 80, y: 300 },
    maxLineLength: 1100,
    parLineLength: 550,
    obstacles: [
      { type: 'ceiling', position: { x: 180, y: 0 }, width: 500, height: 220 },
      { type: 'lava', position: { x: 180, y: 575 }, width: 500, height: 25 },
    ],
    landingPad: { position: { x: 700, y: 450 }, width: 60 },
  },

  // --- Levels 23-25: Full complexity ---

  // Level 23: Ceiling + window + lava — must fly low, thread a gap, avoid lava
  {
    id: 23,
    startPosition: { x: 80, y: 280 },
    maxLineLength: 1200,
    parLineLength: 600,
    obstacles: [
      { type: 'ceiling', position: { x: 150, y: 0 }, width: 350, height: 200 },
      { type: 'window', position: { x: 500, y: 280 }, width: 20, height: 600, gapHeight: 120 },
      { type: 'lava', position: { x: 530, y: 575 }, width: 220, height: 25 },
    ],
    landingPad: { position: { x: 700, y: 420 }, width: 55 },
  },
  // Level 24: Wall + ceiling + window + lava — gauntlet run
  {
    id: 24,
    startPosition: { x: 80, y: 250 },
    maxLineLength: 1300,
    parLineLength: 650,
    obstacles: [
      { type: 'wall', position: { x: 230, y: 350 }, width: 20, height: 250 },
      { type: 'ceiling', position: { x: 280, y: 0 }, width: 250, height: 200 },
      { type: 'window', position: { x: 560, y: 260 }, width: 20, height: 600, gapHeight: 120 },
      { type: 'lava', position: { x: 590, y: 575 }, width: 170, height: 25 },
    ],
    landingPad: { position: { x: 710, y: 430 }, width: 50 },
  },
  // Level 25: Ultimate challenge — every obstacle type, tight landing
  {
    id: 25,
    startPosition: { x: 60, y: 250 },
    maxLineLength: 1400,
    parLineLength: 700,
    obstacles: [
      { type: 'lava', position: { x: 130, y: 575 }, width: 150, height: 25 },
      { type: 'wall', position: { x: 280, y: 300 }, width: 20, height: 300 },
      { type: 'ceiling', position: { x: 320, y: 0 }, width: 200, height: 220 },
      { type: 'lava', position: { x: 320, y: 575 }, width: 200, height: 25 },
      { type: 'window', position: { x: 560, y: 250 }, width: 20, height: 600, gapHeight: 120 },
      { type: 'lava', position: { x: 600, y: 575 }, width: 150, height: 25 },
    ],
    landingPad: { position: { x: 720, y: 400 }, width: 50 },
  },
];
