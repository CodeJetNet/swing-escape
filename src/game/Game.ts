// src/game/Game.ts

import Matter from 'matter-js';
import { PHYSICS_TIMESTEP, WORLD_WIDTH, WORLD_HEIGHT, COLORS } from '../utils/constants';
import { GamePhase, GameResult, LevelConfig, Vector2 } from './types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Ragdoll } from '../physics/Ragdoll';
import { Bar } from '../physics/Bar';
import { CharacterRenderer } from '../rendering/CharacterRenderer';
import { LevelLoader, LoadedLevel } from '../levels/LevelLoader';
import { ObstacleRenderer } from '../rendering/ObstacleRenderer';
import { UIRenderer } from '../rendering/UIRenderer';
import { pathLength, distance } from '../utils/math';

export class Game {
  private phase: GamePhase = 'MENU';
  private accumulator = 0;
  private ctx: CanvasRenderingContext2D;
  private currentLevel: LevelConfig | null = null;

  private physicsWorld: PhysicsWorld | null = null;
  private ragdoll: Ragdoll | null = null;
  private bar: Bar | null = null;
  private characterRenderer: CharacterRenderer = new CharacterRenderer();
  private obstacleRenderer: ObstacleRenderer = new ObstacleRenderer();
  private uiRenderer: UIRenderer = new UIRenderer();
  private loadedLevel: LoadedLevel | null = null;
  private drawnPath: Vector2[] = [];
  private barConstraintsRemoved = false;

  private result: GameResult | null = null;
  private resultStartTime: number = 0;
  private gameTime: number = 0;
  private fuelFraction: number = 1;
  private landedOnPad = false;

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

  getResult(): GameResult | null {
    return this.result;
  }

  setFuelFraction(fraction: number) {
    this.fuelFraction = fraction;
  }

  loadLevel(level: LevelConfig) {
    // Clean up previous physics world
    if (this.physicsWorld) {
      this.physicsWorld.clear();
    }

    this.currentLevel = level;
    this.result = null;
    this.landedOnPad = false;
    this.gameTime = 0;
    this.fuelFraction = 1;

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

    // Load level obstacles and landing pad
    this.loadedLevel = LevelLoader.load(level, this.physicsWorld);

    // Set up collision detection
    this.setupCollisionHandlers();

    this.barConstraintsRemoved = false;
    this.drawnPath = [];
    this.phase = 'DRAWING';
  }

  private setupCollisionHandlers() {
    if (!this.physicsWorld) return;

    Matter.Events.on(this.physicsWorld.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        const bodies = [pair.bodyA, pair.bodyB];

        // Check if ragdoll part is involved
        const ragdollBodies = this.ragdoll?.getAllBodies() || [];
        const ragdollInvolved = bodies.some(b => ragdollBodies.includes(b));
        if (!ragdollInvolved) continue;

        if (labels.includes('wall') || labels.includes('ceiling')) {
          // Hit obstacle - death
          if (this.phase === 'PLAYBACK') {
            this.ragdoll?.goLoose();
            this.landedOnPad = false;
            this.transitionToResult();
          }
        }
        if (labels.includes('lava')) {
          if (this.phase === 'PLAYBACK') {
            this.ragdoll?.goLoose();
            this.landedOnPad = false;
            this.transitionToResult();
          }
        }
        if (labels.includes('landingPad')) {
          if (this.phase === 'PLAYBACK' && this.barConstraintsRemoved) {
            // Landed!
            this.landedOnPad = true;
            this.transitionToResult();
          }
        }
      }
    });
  }

  private transitionToResult() {
    if (this.phase === 'RESULT') return; // Already in result

    const won = this.landedOnPad;
    let stars = 0;
    let landingAccuracy = 0;
    const lineLen = pathLength(this.drawnPath);

    if (won && this.currentLevel) {
      // Calculate landing accuracy (distance from center of landing pad)
      const padCenter = this.currentLevel.landingPad.position;
      const padWidth = this.currentLevel.landingPad.width;
      const feetPos = this.ragdoll?.getFeetPosition() || padCenter;
      const dist = distance(feetPos, padCenter);
      landingAccuracy = Math.max(0, 1 - dist / (padWidth / 2));

      // Calculate star rating based on line length vs par
      const par = this.currentLevel.parLineLength;
      if (lineLen <= par) {
        stars = 3;
      } else if (lineLen <= par * 1.5) {
        stars = 2;
      } else {
        stars = 1;
      }

      // Landing accuracy can bump stars down if very off-center
      if (landingAccuracy < 0.2 && stars > 1) {
        stars--;
      }
    }

    this.result = {
      won,
      stars,
      lineLength: lineLen,
      landingAccuracy,
    };
    this.resultStartTime = this.gameTime;
    this.phase = 'RESULT';
  }

  startPlayback(path: Vector2[]) {
    if (!this.bar) return;
    this.drawnPath = path;
    this.bar.setPath(path);
    this.barConstraintsRemoved = false;
    this.phase = 'PLAYBACK';
  }

  update(deltaMs: number) {
    this.gameTime += deltaMs;

    // Update obstacle renderer for lava animation
    this.obstacleRenderer.update(deltaMs);

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
              this.landedOnPad = false;
              this.transitionToResult();
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
        if (this.currentLevel) {
          this.uiRenderer.renderLevelNumber(ctx, this.currentLevel.id);
        }
        this.uiRenderer.renderFuelGauge(ctx, this.fuelFraction);
        this.uiRenderer.renderReady(ctx, this.gameTime);
        break;
      case 'PLAYBACK':
        this.renderLevel(ctx);
        if (this.currentLevel) {
          this.uiRenderer.renderLevelNumber(ctx, this.currentLevel.id);
        }
        break;
      case 'RESULT':
        this.renderLevel(ctx);
        this.renderResultOverlay(ctx);
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

    // Draw obstacles
    if (this.loadedLevel) {
      for (const obs of this.loadedLevel.obstacles) {
        this.obstacleRenderer.renderObstacle(ctx, obs.config);
      }
    }

    // Draw landing pad
    this.obstacleRenderer.renderLandingPad(ctx, this.currentLevel.landingPad);

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

  private renderResultOverlay(ctx: CanvasRenderingContext2D) {
    if (!this.result) return;
    const elapsed = this.gameTime - this.resultStartTime;
    const animProgress = Math.min(elapsed / 1000, 1);
    this.uiRenderer.renderResult(ctx, this.result, animProgress);
  }
}
