// src/game/types.ts

export type GamePhase = 'MENU' | 'DRAWING' | 'PLAYBACK' | 'RESULT';

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

export interface GameResult {
  won: boolean;
  stars: number;
  lineLength: number;
  landingAccuracy: number;
}
