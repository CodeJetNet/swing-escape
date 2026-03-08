// src/game/Game.ts

import { PHYSICS_TIMESTEP, WORLD_WIDTH, WORLD_HEIGHT, COLORS } from '../utils/constants';
import { GamePhase, LevelConfig } from './types';

export class Game {
  private phase: GamePhase = 'MENU';
  private accumulator = 0;
  private ctx: CanvasRenderingContext2D;
  private currentLevel: LevelConfig | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setPhase(phase: GamePhase) {
    this.phase = phase;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  loadLevel(level: LevelConfig) {
    this.currentLevel = level;
    this.phase = 'DRAWING';
  }

  update(deltaMs: number) {
    this.accumulator += Math.min(deltaMs, 200);

    while (this.accumulator >= PHYSICS_TIMESTEP) {
      this.fixedUpdate();
      this.accumulator -= PHYSICS_TIMESTEP;
    }
  }

  private fixedUpdate() {
    switch (this.phase) {
      case 'MENU':
        break;
      case 'DRAWING':
        break;
      case 'PLAYBACK':
        // TODO: advance bar along path, step physics
        break;
      case 'RESULT':
        break;
    }
  }

  render() {
    const ctx = this.ctx;

    switch (this.phase) {
      case 'MENU':
        this.renderMenu(ctx);
        break;
      case 'DRAWING':
        this.renderLevel(ctx);
        break;
      case 'PLAYBACK':
        this.renderLevel(ctx);
        break;
      case 'RESULT':
        this.renderLevel(ctx);
        break;
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SWING ESCAPE', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 40);

    ctx.font = '18px monospace';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText('Tap to play', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 20);
  }

  private renderLevel(ctx: CanvasRenderingContext2D) {
    if (!this.currentLevel) return;

    // Draw landing pad
    const pad = this.currentLevel.landingPad;
    ctx.fillStyle = COLORS.landingPad;
    ctx.fillRect(pad.position.x, pad.position.y, pad.width, 8);

    // Draw bar (starting point)
    ctx.fillStyle = COLORS.bar;
    ctx.beginPath();
    ctx.arc(
      this.currentLevel.startPosition.x,
      this.currentLevel.startPosition.y,
      6, 0, Math.PI * 2
    );
    ctx.fill();
  }
}
