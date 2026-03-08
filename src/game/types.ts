// src/game/types.ts

export type GamePhase = 'MENU' | 'LEVEL_SELECT' | 'DRAWING' | 'PLAYBACK' | 'RESULT';

export interface Vector2 {
  x: number;
  y: number;
}

export interface LevelConfig {
  id: number;
  startPosition: Vector2;
  maxLineLength: number;
  parLineLength: number;
  obstacles: ObstacleConfig[];
  landingPad: LandingPadConfig;
}

export interface ObstacleConfig {
  type: 'wall' | 'lava' | 'window' | 'ceiling' | 'moving' | 'breakable';
  position: Vector2;
  width: number;
  height: number;
  gapHeight?: number;
  speed?: number;
  range?: number;
}

export interface LandingPadConfig {
  position: Vector2;
  width: number;
}

export type ComboEventType = 'nearMiss' | 'windowThread' | 'flip' | 'speedBurst' | 'perfectLanding';

export interface ComboEvent {
  type: ComboEventType;
  points: number;
  multiplier: number;
  position: Vector2;
  label: string;
}

export interface GameResult {
  won: boolean;
  stars: number;
  lineLength: number;
  landingAccuracy: number;
  comboScore: number;
  comboEvents: ComboEvent[];
  totalScore: number;
  bestScore: number;
  isNewBest: boolean;
}
