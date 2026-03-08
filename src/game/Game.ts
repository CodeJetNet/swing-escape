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
import { EffectsRenderer } from '../rendering/EffectsRenderer';
import { pathLength, distance } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';
import { GameState } from '../state/GameState';
import { levels as allLevels } from '../levels/levels';
import { ComboTracker } from './ComboTracker';

function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

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
  private effects: EffectsRenderer = new EffectsRenderer();
  private loadedLevel: LoadedLevel | null = null;
  private drawnPath: Vector2[] = [];
  private ghostPath: Vector2[] = [];
  private barConstraintsRemoved = false;
  private audio: AudioManager = new AudioManager();
  private comboTracker: ComboTracker = new ComboTracker();
  private playbackFrameCount = 0;

  private result: GameResult | null = null;
  private resultStartTime: number = 0;
  private gameTime: number = 0;
  private fuelFraction: number = 1;
  private landedOnPad = false;
  private gameStateRef: GameState | null = null;

  private collisionHandler: ((event: Matter.IEventCollision<Matter.Engine>) => void) | null = null;
  private transitionAlpha: number = 0;
  private transitionState: 'none' | 'fadeOut' | 'fadeIn' = 'none';
  private pendingLevelLoad: LevelConfig | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setGameState(state: GameState) {
    this.gameStateRef = state;
  }

  initAudio() {
    this.audio.init();
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

  getGhostPath(): Vector2[] {
    return this.ghostPath;
  }

  getEffects(): EffectsRenderer {
    return this.effects;
  }

  getUIRenderer(): UIRenderer {
    return this.uiRenderer;
  }

  loadLevel(level: LevelConfig) {
    // Clean up previous collision handler and physics world
    if (this.physicsWorld && this.collisionHandler) {
      Matter.Events.off(this.physicsWorld.engine, 'collisionStart', this.collisionHandler);
      this.collisionHandler = null;
    }
    if (this.physicsWorld) {
      this.physicsWorld.clear();
    }

    // Save or clear ghost path
    if (this.currentLevel && level.id === this.currentLevel.id) {
      // Retry same level — save current path as ghost
      this.ghostPath = [...this.drawnPath];
    } else {
      // New level — clear ghost
      this.ghostPath = [];
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
    this.effects.clear();
    this.comboTracker.reset();
    this.phase = 'DRAWING';
  }

  private setupCollisionHandlers() {
    if (!this.physicsWorld) return;

    this.collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
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
            const collisionPoint = this.ragdoll?.getFeetPosition() || { x: 0, y: 0 };
            this.effects.spawnCrashParticles(collisionPoint);
            this.audio.playThud();
            vibrate(200);
            this.ragdoll?.goLoose();
            this.landedOnPad = false;
            this.transitionToResult();
          }
        }
        if (labels.includes('lava')) {
          if (this.phase === 'PLAYBACK') {
            const collisionPoint = this.ragdoll?.getFeetPosition() || { x: 0, y: 0 };
            this.effects.spawnCrashParticles(collisionPoint);
            this.audio.playSplat();
            vibrate(200);
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
        if (labels.includes('ground') || labels.includes('landingPadFloor')) {
          // Hit ground after release — missed the landing pad
          if (this.phase === 'PLAYBACK' && this.barConstraintsRemoved && !this.landedOnPad) {
            const collisionPoint = this.ragdoll?.getFeetPosition() || { x: 0, y: 0 };
            this.effects.spawnCrashParticles(collisionPoint);
            this.audio.playThud();
            vibrate(200);
            this.ragdoll?.goLoose();
            this.transitionToResult();
          }
        }
      }
    };

    Matter.Events.on(this.physicsWorld.engine, 'collisionStart', this.collisionHandler);
  }

  private transitionToResult() {
    if (this.phase === 'RESULT') return;

    const won = this.landedOnPad;
    let stars = 0;
    let landingAccuracy = 0;
    const lineLen = pathLength(this.drawnPath);

    if (won && this.currentLevel) {
      const padCenter = this.currentLevel.landingPad.position;
      const padWidth = this.currentLevel.landingPad.width;
      const feetPos = this.ragdoll?.getFeetPosition() || padCenter;
      const dist = distance(feetPos, padCenter);
      landingAccuracy = Math.max(0, 1 - dist / (padWidth / 2));

      // Perfect landing combo
      if (landingAccuracy > 0.75) {
        this.comboTracker.registerPerfectLanding(feetPos);
      }

      const par = this.currentLevel.parLineLength;
      if (lineLen <= par) {
        stars = 3;
      } else if (lineLen <= par * 1.5) {
        stars = 2;
      } else {
        stars = 1;
      }

      if (landingAccuracy < 0.2 && stars > 1) {
        stars--;
      }
    }

    const comboScore = this.comboTracker.getTotalScore();
    const comboEvents = this.comboTracker.getEvents();
    const landingBonus = won ? (landingAccuracy > 0.75 ? 50 : 30) : 0;
    const efficiencyBonus = won && this.currentLevel
      ? Math.max(0, Math.round(30 * (1 - (lineLen - this.currentLevel.parLineLength) / this.currentLevel.parLineLength)))
      : 0;
    const totalScore = comboScore + landingBonus + efficiencyBonus;

    const levelId = this.currentLevel?.id || 0;
    const prevBest = this.gameStateRef?.getBestScore(levelId) || 0;
    const isNewBest = won && totalScore > prevBest;
    if (isNewBest && this.gameStateRef) {
      this.gameStateRef.setBestScore(levelId, totalScore);
    }

    this.result = {
      won,
      stars,
      lineLength: lineLen,
      landingAccuracy,
      comboScore,
      comboEvents,
      totalScore,
      bestScore: isNewBest ? totalScore : prevBest,
      isNewBest,
    };

    if (won && this.ragdoll) {
      const landingPos = this.ragdoll.getFeetPosition();
      this.effects.spawnLandingBurst(landingPos, stars);
      this.effects.triggerShake(2);
      this.audio.playLandingChime(stars);
      vibrate([50, 30, 50, 30, 100]);
    }

    this.resultStartTime = this.gameTime;
    this.phase = 'RESULT';
  }

  startPlayback(path: Vector2[]) {
    if (!this.bar) return;
    this.drawnPath = path;
    this.bar.setPath(path);
    this.barConstraintsRemoved = false;
    this.playbackFrameCount = 0;
    this.phase = 'PLAYBACK';
  }

  transitionToLevel(level: LevelConfig) {
    this.pendingLevelLoad = level;
    this.transitionState = 'fadeOut';
  }

  update(deltaMs: number) {
    this.gameTime += deltaMs;

    // Handle level transition animation
    if (this.transitionState === 'fadeOut') {
      this.transitionAlpha += deltaMs / 300;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        if (this.pendingLevelLoad) {
          this.loadLevel(this.pendingLevelLoad);
          this.pendingLevelLoad = null;
        }
        this.transitionState = 'fadeIn';
      }
      return;
    }
    if (this.transitionState === 'fadeIn') {
      this.transitionAlpha -= deltaMs / 300;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionState = 'none';
      }
      return;
    }

    // Update obstacle renderer for lava animation
    this.obstacleRenderer.update(deltaMs);

    // Update effects (shake, particles, slow motion)
    this.effects.update(deltaMs);

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
      case 'LEVEL_SELECT':
        break;
      case 'DRAWING':
        // Step physics so ragdoll hangs naturally
        if (this.physicsWorld) {
          this.physicsWorld.step(PHYSICS_TIMESTEP);
        }
        break;
      case 'PLAYBACK':
        if (this.bar && this.ragdoll && this.physicsWorld) {
          const timeScale = this.effects.getTimeScale();
          this.bar.update();
          this.ragdoll.applyCartoonPhysics(this.bar.getVelocity());
          this.physicsWorld.step(PHYSICS_TIMESTEP * timeScale);

          // Play whoosh sound periodically based on bar velocity
          this.playbackFrameCount++;
          if (this.playbackFrameCount % 5 === 0) {
            const vel = this.bar.getVelocity();
            const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
            if (speed > 1) {
              this.audio.playWhoosh(speed);
            }
          }

          // Add trail point at ragdoll feet
          this.effects.addTrailPoint(this.ragdoll.getFeetPosition());

          // Combo tracking
          this.comboTracker.update(PHYSICS_TIMESTEP);

          // Near-miss detection with combo tracking
          if (this.loadedLevel) {
            const feetPos = this.ragdoll.getFeetPosition();
            for (const obs of this.loadedLevel.obstacles) {
              const body = obs.body;
              const dx = feetPos.x - body.position.x;
              const dy = feetPos.y - body.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const boundsWidth = (body.bounds.max.x - body.bounds.min.x) / 2;
              const boundsHeight = (body.bounds.max.y - body.bounds.min.y) / 2;
              const edgeDist = dist - Math.max(boundsWidth, boundsHeight);
              if (edgeDist > 0 && edgeDist < 15) {
                this.effects.triggerSlowMotion(300);
                this.comboTracker.registerNearMiss(String(body.id), feetPos);
              }
            }
          }

          // Flip detection
          const headPos = this.ragdoll.getHeadPosition();
          const feetPos2 = this.ragdoll.getFeetPosition();
          this.comboTracker.checkFlip(headPos, feetPos2);

          // Speed burst detection
          const vel = this.bar.getVelocity();
          const speed2 = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
          this.comboTracker.checkSpeedBurst(speed2, PHYSICS_TIMESTEP, feetPos2);

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
      case 'LEVEL_SELECT':
        this.renderLevelSelect(ctx);
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

    // Transition overlay
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(26, 26, 46, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
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

  private renderLevelSelect(ctx: CanvasRenderingContext2D) {
    const levelsData = allLevels.map((level) => ({
      id: level.id,
      stars: this.gameStateRef ? this.gameStateRef.getStars(level.id) : 0,
      unlocked: this.gameStateRef
        ? level.id <= this.gameStateRef.getCurrentLevel()
        : level.id === 1,
    }));
    const endlessModeUnlocked = this.gameStateRef
      ? this.gameStateRef.getCurrentLevel() > allLevels.length
      : false;
    this.uiRenderer.renderLevelSelect(ctx, levelsData, endlessModeUnlocked);
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

    // Draw effects (trail, particles)
    this.effects.render(ctx);

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
