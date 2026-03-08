// src/game/Game.ts

import { PHYSICS_TIMESTEP, WORLD_WIDTH, WORLD_HEIGHT, COLORS } from '../utils/constants';
import { GamePhase, LevelConfig, Vector2 } from './types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Ragdoll } from '../physics/Ragdoll';
import { Bar } from '../physics/Bar';
import { CharacterRenderer } from '../rendering/CharacterRenderer';

export class Game {
  private phase: GamePhase = 'MENU';
  private accumulator = 0;
  private ctx: CanvasRenderingContext2D;
  private currentLevel: LevelConfig | null = null;

  private physicsWorld: PhysicsWorld | null = null;
  private ragdoll: Ragdoll | null = null;
  private bar: Bar | null = null;
  private characterRenderer: CharacterRenderer = new CharacterRenderer();
  private drawnPath: Vector2[] = [];
  private barConstraintsRemoved = false;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setPhase(phase: GamePhase) {
    this.phase = phase;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getCurrentLevel(): LevelConfig | null {
    return this.currentLevel;
  }

  loadLevel(level: LevelConfig) {
    this.currentLevel = level;

    // Create physics world
    this.physicsWorld = new PhysicsWorld();

    // Create bar at start position
    this.bar = new Bar(level.startPosition);
    this.physicsWorld.addBody(this.bar.body);

    // Create ragdoll at start position
    this.ragdoll = new Ragdoll(level.startPosition);
    this.ragdoll.attachToBar(this.bar.body);

    // Add all ragdoll bodies and constraints to physics world
    for (const body of this.ragdoll.getAllBodies()) {
      this.physicsWorld.addBody(body);
    }
    for (const constraint of this.ragdoll.getAllConstraints()) {
      this.physicsWorld.addConstraint(constraint);
    }

    this.barConstraintsRemoved = false;
    this.drawnPath = [];
    this.phase = 'DRAWING';
  }

  startPlayback(path: Vector2[]) {
    if (!this.bar) return;
    this.drawnPath = path;
    this.bar.setPath(path);
    this.barConstraintsRemoved = false;
    this.phase = 'PLAYBACK';
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
        // Step physics so ragdoll hangs naturally
        if (this.physicsWorld) {
          this.physicsWorld.step(PHYSICS_TIMESTEP);
        }
        break;
      case 'PLAYBACK':
        if (this.bar && this.ragdoll && this.physicsWorld) {
          this.bar.update();
          this.ragdoll.applyCartoonPhysics(this.bar.getVelocity());
          this.physicsWorld.step(PHYSICS_TIMESTEP);

          // When bar finishes path, release the character
          if (this.bar.isFinished() && !this.barConstraintsRemoved) {
            // Remove bar constraints from physics world
            for (const constraint of this.ragdoll.getBarConstraints()) {
              this.physicsWorld.removeConstraint(constraint);
            }
            this.ragdoll.release();
            this.barConstraintsRemoved = true;
          }

          // Check if character has fallen off screen
          if (this.ragdoll.released()) {
            const feetPos = this.ragdoll.getFeetPosition();
            const headPos = this.ragdoll.getHeadPosition();
            const lowestY = Math.max(feetPos.y, headPos.y);
            if (lowestY > WORLD_HEIGHT + 100) {
              this.phase = 'RESULT';
            }
          }
        }
        break;
      case 'RESULT':
        // Keep stepping physics for ragdoll to settle
        if (this.physicsWorld) {
          this.physicsWorld.step(PHYSICS_TIMESTEP);
        }
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
        this.renderResult(ctx);
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

    // Draw bar
    if (this.bar) {
      ctx.fillStyle = COLORS.bar;
      ctx.beginPath();
      ctx.arc(
        this.bar.body.position.x,
        this.bar.body.position.y,
        6, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Draw ragdoll
    if (this.ragdoll) {
      this.characterRenderer.render(ctx, this.ragdoll);
    }
  }

  private renderResult(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Tap to retry', WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }
}
