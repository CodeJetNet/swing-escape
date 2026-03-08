# Swing Escape Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based physics puzzle game where players draw a swing path, watch their ragdoll character follow it, and land on a target pad.

**Architecture:** Vite + TypeScript app using HTML Canvas 2D for rendering and Matter.js for hybrid physics. Game state machine drives phases (menu, drawing, playback, result). Levels defined as JSON, loaded into Matter.js bodies. localStorage for progression.

**Tech Stack:** TypeScript, Vite, Matter.js, HTML Canvas 2D, Web Audio API, Vitest

**Design doc:** `docs/plans/2026-03-07-swing-escape-design.md`

---

### Task 1: Project Setup — Vite + Canvas Bootstrap

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts` (replace existing)
- Create: `src/utils/constants.ts`

**Step 1: Install dependencies**

```bash
npm install matter-js
npm install -D vite vitest @types/matter-js
```

**Step 2: Update package.json scripts**

Replace the `"scripts"` block:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

**Step 3: Update tsconfig.json**

Replace with Vite-compatible config:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```

**Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Swing Escape</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      overflow: hidden;
      background: #1a1a2e;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }
    canvas {
      display: block;
      width: 100%; height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 5: Create constants.ts**

```typescript
// src/utils/constants.ts

// Physics
export const PHYSICS_FPS = 60;
export const PHYSICS_TIMESTEP = 1000 / PHYSICS_FPS;
export const GRAVITY = 1;

// World dimensions (logical coordinates, scaled to canvas)
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;

// Character
export const BAR_SPEED = 3; // pixels per physics frame along path
export const RAGDOLL_SCALE = 1;
export const STRETCH_FACTOR = 1.3; // max arm stretch at high speed
export const MOMENTUM_MULTIPLIER = 1.5; // cartoon exaggeration
export const JOINT_STIFFNESS = 0.8;
export const JOINT_STIFFNESS_LOOSE = 0.1; // on death

// Path drawing
export const MIN_SEGMENT_LENGTH = 5; // min distance between path points
export const PATH_SMOOTHING = 0.3; // smoothing factor (0 = none, 1 = max)
export const DEFAULT_MAX_LINE_LENGTH = 1200;

// Game feel
export const SCREEN_SHAKE_DECAY = 0.9;
export const SLOW_MOTION_DURATION = 300; // ms
export const SLOW_MOTION_FACTOR = 0.3;
export const TRAIL_LENGTH = 20;
export const TRAIL_FADE_RATE = 0.05;

// Landing
export const LANDING_TOLERANCE_ANGLE = Math.PI / 4; // 45 degrees from upright
export const LANDING_PAD_BOUNCE = 0.2;

// Colors
export const COLORS = {
  background: '#1a1a2e',
  bar: '#e94560',
  character: '#f5f5f5',
  characterOutline: '#333333',
  path: '#0f3460',
  pathGhost: 'rgba(15, 52, 96, 0.4)',
  fuelGauge: '#e94560',
  fuelGaugeBackground: 'rgba(255, 255, 255, 0.15)',
  wall: '#16213e',
  wallOutline: '#0f3460',
  lava: '#e94560',
  lavaGlow: 'rgba(233, 69, 96, 0.3)',
  landingPad: '#53d769',
  landingPadTarget: '#3aaf4c',
  text: '#f5f5f5',
  textSecondary: 'rgba(245, 245, 245, 0.6)',
  star: '#ffd700',
  starEmpty: 'rgba(255, 215, 0, 0.2)',
  particle: '#e94560',
  successParticle: '#53d769',
} as const;
```

**Step 6: Create main.ts**

```typescript
// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT } from './utils/constants';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

// Compute scale to fit WORLD_WIDTH x WORLD_HEIGHT into viewport
function getScale(): { scale: number; offsetX: number; offsetY: number } {
  const scaleX = window.innerWidth / WORLD_WIDTH;
  const scaleY = window.innerHeight / WORLD_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (window.innerWidth - WORLD_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - WORLD_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}

function render() {
  const { scale, offsetX, offsetY } = getScale();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Placeholder: draw background and a test circle for the bar
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(100, 150, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f5f5';
  ctx.font = '24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Swing Escape', WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  ctx.font = '14px monospace';
  ctx.fillText('Touch anywhere to draw a path', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 30);

  ctx.restore();
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
```

**Step 7: Verify it runs**

```bash
npm run dev
```

Open browser, confirm: dark background, red dot at top-left area, "Swing Escape" text centered. Responsive on resize.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Vite project with canvas, constants, and responsive scaling"
```

---

### Task 2: Game State Machine & Loop

**Files:**
- Create: `src/game/Game.ts`
- Create: `src/game/types.ts`
- Modify: `src/main.ts`

**Step 1: Create game types**

```typescript
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
  gapHeight?: number; // for windows
  speed?: number; // for moving platforms
  range?: number; // for moving platforms
}

export interface LandingPadConfig {
  position: Vector2;
  width: number;
}

export interface GameResult {
  won: boolean;
  stars: number;
  lineLength: number;
  landingAccuracy: number; // 0-1, how close to center
}
```

**Step 2: Create Game.ts**

```typescript
// src/game/Game.ts

import { PHYSICS_TIMESTEP, WORLD_WIDTH, WORLD_HEIGHT, COLORS } from '../utils/constants';
import { GamePhase, LevelConfig } from './types';

export class Game {
  private phase: GamePhase = 'MENU';
  private lastTime = 0;
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
    this.accumulator += deltaMs;

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
        // Input handled externally
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
```

**Step 3: Update main.ts to use Game**

Replace `src/main.ts` with:

```typescript
// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './utils/constants';
import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function getScale() {
  const scaleX = window.innerWidth / WORLD_WIDTH;
  const scaleY = window.innerHeight / WORLD_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (window.innerWidth - WORLD_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - WORLD_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}

const game = new Game(ctx);

let lastTime = performance.now();

function loop(time: number) {
  const delta = time - lastTime;
  lastTime = time;

  game.update(delta);

  const { scale, offsetX, offsetY } = getScale();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  game.render();

  ctx.restore();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

**Step 4: Verify it runs**

```bash
npm run dev
```

Confirm: "SWING ESCAPE" title with "Tap to play" on dark background.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add game state machine with menu, drawing, playback, result phases"
```

---

### Task 3: Input Handling — Path Drawing

**Files:**
- Create: `src/game/InputHandler.ts`
- Create: `src/game/PathValidator.ts`
- Create: `src/utils/math.ts`
- Create: `src/utils/__tests__/math.test.ts`
- Create: `src/game/__tests__/PathValidator.test.ts`
- Modify: `src/main.ts`

**Step 1: Create math utilities**

```typescript
// src/utils/math.ts

import { Vector2 } from '../game/types';

export function distance(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vector2, b: Vector2, t: number): Vector2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function pathLength(points: Vector2[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

export function normalizeVec(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

**Step 2: Write math tests**

```typescript
// src/utils/__tests__/math.test.ts

import { describe, it, expect } from 'vitest';
import { distance, lerp, pathLength, clamp } from '../math';

describe('math utils', () => {
  it('calculates distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('lerps between values', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('calculates path length', () => {
    const path = [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 0 }];
    expect(pathLength(path)).toBe(10);
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
```

**Step 3: Run math tests**

```bash
npx vitest run src/utils/__tests__/math.test.ts
```

Expected: all pass.

**Step 4: Create PathValidator**

```typescript
// src/game/PathValidator.ts

import { Vector2 } from './types';
import { distance, pathLength } from '../utils/math';
import { MIN_SEGMENT_LENGTH, PATH_SMOOTHING } from '../utils/constants';

export class PathValidator {
  private maxLength: number;

  constructor(maxLength: number) {
    this.maxLength = maxLength;
  }

  /** Returns whether a new point can be added (hasn't gone backward, within budget) */
  canAddPoint(currentPath: Vector2[], newPoint: Vector2): boolean {
    if (currentPath.length === 0) return true;

    const last = currentPath[currentPath.length - 1];

    // Must move right (no backward)
    if (newPoint.x <= last.x) return false;

    // Must be far enough from last point
    if (distance(last, newPoint) < MIN_SEGMENT_LENGTH) return false;

    // Must not exceed max line length
    const currentLen = pathLength(currentPath);
    const addedLen = distance(last, newPoint);
    if (currentLen + addedLen > this.maxLength) return false;

    return true;
  }

  /** Returns remaining line length budget */
  remainingLength(currentPath: Vector2[]): number {
    return Math.max(0, this.maxLength - pathLength(currentPath));
  }

  /** Returns fuel fraction (0 = empty, 1 = full) */
  fuelFraction(currentPath: Vector2[]): number {
    if (this.maxLength === 0) return 0;
    return this.remainingLength(currentPath) / this.maxLength;
  }

  /** Smooth the path by averaging adjacent points */
  static smooth(points: Vector2[]): Vector2[] {
    if (points.length < 3) return [...points];
    const result: Vector2[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      result.push({
        x: curr.x + (prev.x + next.x - 2 * curr.x) * PATH_SMOOTHING,
        y: curr.y + (prev.y + next.y - 2 * curr.y) * PATH_SMOOTHING,
      });
    }
    result.push(points[points.length - 1]);
    return result;
  }
}
```

**Step 5: Write PathValidator tests**

```typescript
// src/game/__tests__/PathValidator.test.ts

import { describe, it, expect } from 'vitest';
import { PathValidator } from '../PathValidator';

describe('PathValidator', () => {
  it('allows first point always', () => {
    const v = new PathValidator(1000);
    expect(v.canAddPoint([], { x: 100, y: 100 })).toBe(true);
  });

  it('rejects backward movement', () => {
    const v = new PathValidator(1000);
    const path = [{ x: 100, y: 100 }];
    expect(v.canAddPoint(path, { x: 50, y: 100 })).toBe(false);
  });

  it('rejects points too close together', () => {
    const v = new PathValidator(1000);
    const path = [{ x: 100, y: 100 }];
    expect(v.canAddPoint(path, { x: 101, y: 100 })).toBe(false);
  });

  it('rejects points exceeding max length', () => {
    const v = new PathValidator(10);
    const path = [{ x: 0, y: 0 }];
    expect(v.canAddPoint(path, { x: 20, y: 0 })).toBe(false);
  });

  it('reports fuel fraction correctly', () => {
    const v = new PathValidator(100);
    const path = [{ x: 0, y: 0 }, { x: 50, y: 0 }];
    expect(v.fuelFraction(path)).toBe(0.5);
  });

  it('smooths path without moving endpoints', () => {
    const points = [{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }];
    const smoothed = PathValidator.smooth(points);
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 10, y: 0 });
    expect(smoothed.length).toBe(3);
  });
});
```

**Step 6: Run PathValidator tests**

```bash
npx vitest run src/game/__tests__/PathValidator.test.ts
```

Expected: all pass.

**Step 7: Create InputHandler**

```typescript
// src/game/InputHandler.ts

import { Vector2 } from './types';
import { PathValidator } from './PathValidator';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';

export class InputHandler {
  private path: Vector2[] = [];
  private isDrawing = false;
  private validator: PathValidator;
  private startPosition: Vector2;
  private canvasToWorld: (clientX: number, clientY: number) => Vector2;
  private onDrawingComplete: ((path: Vector2[]) => void) | null = null;

  constructor(
    startPosition: Vector2,
    maxLineLength: number,
    canvasToWorld: (clientX: number, clientY: number) => Vector2
  ) {
    this.startPosition = startPosition;
    this.validator = new PathValidator(maxLineLength);
    this.canvasToWorld = canvasToWorld;
  }

  setOnDrawingComplete(cb: (path: Vector2[]) => void) {
    this.onDrawingComplete = cb;
  }

  getPath(): Vector2[] {
    return this.path;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  getFuelFraction(): number {
    return this.validator.fuelFraction(this.path);
  }

  handlePointerDown(clientX: number, clientY: number) {
    this.isDrawing = true;
    this.path = [{ ...this.startPosition }];
  }

  handlePointerMove(clientX: number, clientY: number) {
    if (!this.isDrawing) return;
    const worldPoint = this.canvasToWorld(clientX, clientY);
    if (this.validator.canAddPoint(this.path, worldPoint)) {
      this.path.push(worldPoint);
    }
  }

  handlePointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.path.length < 2) {
      this.path = [];
      return;
    }

    const smoothed = PathValidator.smooth(this.path);
    this.path = smoothed;

    if (this.onDrawingComplete) {
      this.onDrawingComplete(smoothed);
    }
  }

  reset(startPosition: Vector2, maxLineLength: number) {
    this.startPosition = startPosition;
    this.validator = new PathValidator(maxLineLength);
    this.path = [];
    this.isDrawing = false;
  }
}
```

**Step 8: Wire input to main.ts**

Add pointer event listeners to `src/main.ts` that call `InputHandler` methods. Pass `canvasToWorld` function that converts screen coordinates to world coordinates using the current scale/offset. Wire `onDrawingComplete` to transition game phase from DRAWING to PLAYBACK.

Key additions to main.ts:
- Create InputHandler when level loads
- Add `pointerdown`, `pointermove`, `pointerup` listeners on canvas
- `canvasToWorld` function: `(clientX, clientY) => { const {scale, offsetX, offsetY} = getScale(); return { x: (clientX - offsetX) / scale, y: (clientY - offsetY) / scale }; }`
- On drawing complete: call `game.setPhase('PLAYBACK')` and pass path to game
- Add tap-to-start on MENU phase: loads level 1 and sets DRAWING phase

**Step 9: Render the drawn path**

In `Game.render()` during DRAWING phase, draw the path as a smooth line:
- Iterate path points, `ctx.lineTo` each one
- Style: `COLORS.path`, lineWidth 3, lineCap 'round'
- Draw fuel gauge bar at top of screen showing remaining line budget

**Step 10: Verify it works**

```bash
npm run dev
```

Confirm: Tap to start, draw a line from left to right on screen, see the path rendered, fuel gauge depletes, line can't go backward.

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: add input handling with path drawing, validation, and fuel gauge"
```

---

### Task 4: Physics World & Ragdoll Character

**Files:**
- Create: `src/physics/PhysicsWorld.ts`
- Create: `src/physics/Ragdoll.ts`
- Create: `src/physics/Bar.ts`
- Create: `src/rendering/CharacterRenderer.ts`
- Modify: `src/game/Game.ts`

**Step 1: Create PhysicsWorld**

```typescript
// src/physics/PhysicsWorld.ts

import Matter from 'matter-js';
import { GRAVITY, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';

export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY, scale: 0.001 },
    });
    this.world = this.engine.world;

    // Ground (below visible area, acts as fallback)
    const ground = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2, WORLD_HEIGHT + 50,
      WORLD_WIDTH * 2, 100,
      { isStatic: true, label: 'ground' }
    );
    Matter.Composite.add(this.world, ground);
  }

  step(delta: number) {
    Matter.Engine.update(this.engine, delta);
  }

  addBody(body: Matter.Body) {
    Matter.Composite.add(this.world, body);
  }

  addConstraint(constraint: Matter.Constraint) {
    Matter.Composite.add(this.world, constraint);
  }

  removeBody(body: Matter.Body) {
    Matter.Composite.remove(this.world, body);
  }

  removeConstraint(constraint: Matter.Constraint) {
    Matter.Composite.remove(this.world, constraint);
  }

  clear() {
    Matter.Composite.clear(this.world, false);
  }
}
```

**Step 2: Create Ragdoll**

```typescript
// src/physics/Ragdoll.ts

import Matter from 'matter-js';
import { JOINT_STIFFNESS, JOINT_STIFFNESS_LOOSE, STRETCH_FACTOR, MOMENTUM_MULTIPLIER } from '../utils/constants';
import { Vector2 } from '../game/types';

interface RagdollParts {
  head: Matter.Body;
  torso: Matter.Body;
  upperArmL: Matter.Body;
  upperArmR: Matter.Body;
  lowerArmL: Matter.Body;
  lowerArmR: Matter.Body;
  upperLegL: Matter.Body;
  upperLegR: Matter.Body;
  lowerLegL: Matter.Body;
  lowerLegR: Matter.Body;
}

export class Ragdoll {
  parts: RagdollParts;
  constraints: Matter.Constraint[];
  private barConstraintL: Matter.Constraint | null = null;
  private barConstraintR: Matter.Constraint | null = null;
  private isReleased = false;
  private isLoose = false;

  constructor(position: Vector2) {
    const x = position.x;
    const y = position.y;

    const group = Matter.Body.nextGroup(true);
    const commonOptions = {
      collisionFilter: { group },
      frictionAir: 0.02,
      restitution: 0.3,
      density: 0.002,
    };

    // Create body parts relative to hanging position
    // Character hangs from hands, so body is below
    this.parts = {
      head: Matter.Bodies.circle(x, y + 35, 8, { ...commonOptions, label: 'head' }),
      torso: Matter.Bodies.rectangle(x, y + 55, 12, 28, { ...commonOptions, label: 'torso' }),
      upperArmL: Matter.Bodies.rectangle(x - 8, y + 12, 5, 18, { ...commonOptions, label: 'upperArmL' }),
      upperArmR: Matter.Bodies.rectangle(x + 8, y + 12, 5, 18, { ...commonOptions, label: 'upperArmR' }),
      lowerArmL: Matter.Bodies.rectangle(x - 8, y + 2, 4, 16, { ...commonOptions, label: 'lowerArmL' }),
      lowerArmR: Matter.Bodies.rectangle(x + 8, y + 2, 4, 16, { ...commonOptions, label: 'lowerArmR' }),
      upperLegL: Matter.Bodies.rectangle(x - 5, y + 78, 5, 20, { ...commonOptions, label: 'upperLegL' }),
      upperLegR: Matter.Bodies.rectangle(x + 5, y + 78, 5, 20, { ...commonOptions, label: 'upperLegR' }),
      lowerLegL: Matter.Bodies.rectangle(x - 5, y + 98, 4, 18, { ...commonOptions, label: 'lowerLegL' }),
      lowerLegR: Matter.Bodies.rectangle(x + 5, y + 98, 4, 18, { ...commonOptions, label: 'lowerLegR' }),
    };

    const stiffness = JOINT_STIFFNESS;
    this.constraints = [
      // Neck: head to torso
      Matter.Constraint.create({ bodyA: this.parts.head, bodyB: this.parts.torso,
        pointA: { x: 0, y: 8 }, pointB: { x: 0, y: -14 }, stiffness, length: 0 }),
      // Shoulders
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperArmL,
        pointA: { x: -6, y: -12 }, pointB: { x: 0, y: 9 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperArmR,
        pointA: { x: 6, y: -12 }, pointB: { x: 0, y: 9 }, stiffness, length: 0 }),
      // Elbows
      Matter.Constraint.create({ bodyA: this.parts.upperArmL, bodyB: this.parts.lowerArmL,
        pointA: { x: 0, y: -9 }, pointB: { x: 0, y: 8 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.upperArmR, bodyB: this.parts.lowerArmR,
        pointA: { x: 0, y: -9 }, pointB: { x: 0, y: 8 }, stiffness, length: 0 }),
      // Hips
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperLegL,
        pointA: { x: -3, y: 14 }, pointB: { x: 0, y: -10 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperLegR,
        pointA: { x: 3, y: 14 }, pointB: { x: 0, y: -10 }, stiffness, length: 0 }),
      // Knees
      Matter.Constraint.create({ bodyA: this.parts.upperLegL, bodyB: this.parts.lowerLegL,
        pointA: { x: 0, y: 10 }, pointB: { x: 0, y: -9 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.upperLegR, bodyB: this.parts.lowerLegR,
        pointA: { x: 0, y: 10 }, pointB: { x: 0, y: -9 }, stiffness, length: 0 }),
    ];
  }

  getAllBodies(): Matter.Body[] {
    return Object.values(this.parts);
  }

  getAllConstraints(): Matter.Constraint[] {
    return [...this.constraints, ...(this.barConstraintL ? [this.barConstraintL] : []),
      ...(this.barConstraintR ? [this.barConstraintR] : [])];
  }

  attachToBar(barBody: Matter.Body) {
    this.barConstraintL = Matter.Constraint.create({
      bodyA: barBody, bodyB: this.parts.lowerArmL,
      pointA: { x: -4, y: 0 }, pointB: { x: 0, y: -8 },
      stiffness: 1, length: 0,
    });
    this.barConstraintR = Matter.Constraint.create({
      bodyA: barBody, bodyB: this.parts.lowerArmR,
      pointA: { x: 4, y: 0 }, pointB: { x: 0, y: -8 },
      stiffness: 1, length: 0,
    });
  }

  getBarConstraints(): Matter.Constraint[] {
    const result: Matter.Constraint[] = [];
    if (this.barConstraintL) result.push(this.barConstraintL);
    if (this.barConstraintR) result.push(this.barConstraintR);
    return result;
  }

  release() {
    this.isReleased = true;
    // Bar constraints will be removed externally
    this.barConstraintL = null;
    this.barConstraintR = null;
  }

  goLoose() {
    this.isLoose = true;
    for (const c of this.constraints) {
      c.stiffness = JOINT_STIFFNESS_LOOSE;
    }
  }

  /** Apply cartoon physics forces based on bar velocity */
  applyCartoonPhysics(barVelocity: Vector2) {
    if (this.isReleased) return;

    const speed = Math.sqrt(barVelocity.x ** 2 + barVelocity.y ** 2);

    // Exaggerated momentum on direction changes
    const bodies = this.getAllBodies();
    for (const body of bodies) {
      // Apply extra force in direction of movement for whip effect
      // Stagger: lower body parts get more delayed force
      const isLower = body.label.includes('Leg') || body.label.includes('lower');
      const factor = isLower ? MOMENTUM_MULTIPLIER * 0.7 : MOMENTUM_MULTIPLIER * 0.3;
      Matter.Body.applyForce(body, body.position, {
        x: barVelocity.x * factor * 0.0001,
        y: barVelocity.y * factor * 0.0001,
      });
    }
  }

  getFeetPosition(): Vector2 {
    const footL = this.parts.lowerLegL.position;
    const footR = this.parts.lowerLegR.position;
    return {
      x: (footL.x + footR.x) / 2,
      y: Math.max(footL.y, footR.y),
    };
  }

  getHeadPosition(): Vector2 {
    return { ...this.parts.head.position };
  }

  /** Check if character is roughly upright (for landing) */
  isUpright(): boolean {
    const head = this.parts.head.position;
    const feet = this.getFeetPosition();
    const angle = Math.atan2(head.x - feet.x, feet.y - head.y);
    return Math.abs(angle) < Math.PI / 4;
  }
}
```

**Step 3: Create Bar**

```typescript
// src/physics/Bar.ts

import Matter from 'matter-js';
import { Vector2 } from '../game/types';
import { BAR_SPEED } from '../utils/constants';
import { distance } from '../utils/math';

export class Bar {
  body: Matter.Body;
  private path: Vector2[] = [];
  private pathIndex = 0;
  private distanceAlongSegment = 0;
  private finished = false;
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(position: Vector2) {
    this.body = Matter.Bodies.circle(position.x, position.y, 6, {
      isStatic: true,
      label: 'bar',
      collisionFilter: { category: 0 }, // no collisions
    });
  }

  setPath(path: Vector2[]) {
    this.path = path;
    this.pathIndex = 0;
    this.distanceAlongSegment = 0;
    this.finished = false;
  }

  isFinished(): boolean {
    return this.finished;
  }

  getVelocity(): Vector2 {
    return this.velocity;
  }

  update() {
    if (this.finished || this.path.length < 2) return;

    const from = this.path[this.pathIndex];
    const to = this.path[this.pathIndex + 1];
    if (!to) {
      this.finished = true;
      this.velocity = { x: 0, y: 0 };
      return;
    }

    const segLength = distance(from, to);
    this.distanceAlongSegment += BAR_SPEED;

    if (this.distanceAlongSegment >= segLength) {
      this.distanceAlongSegment -= segLength;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        this.finished = true;
        // Final velocity based on last segment direction
        const lastFrom = this.path[this.path.length - 2];
        const lastTo = this.path[this.path.length - 1];
        const d = distance(lastFrom, lastTo);
        if (d > 0) {
          this.velocity = {
            x: ((lastTo.x - lastFrom.x) / d) * BAR_SPEED,
            y: ((lastTo.y - lastFrom.y) / d) * BAR_SPEED,
          };
        }
        Matter.Body.setPosition(this.body, this.path[this.path.length - 1]);
        return;
      }
    }

    const t = segLength > 0 ? this.distanceAlongSegment / segLength : 0;
    const currentFrom = this.path[this.pathIndex];
    const currentTo = this.path[this.pathIndex + 1];
    if (!currentTo) {
      this.finished = true;
      return;
    }

    const newPos = {
      x: currentFrom.x + (currentTo.x - currentFrom.x) * t,
      y: currentFrom.y + (currentTo.y - currentFrom.y) * t,
    };

    // Calculate velocity
    const prevPos = this.body.position;
    this.velocity = {
      x: newPos.x - prevPos.x,
      y: newPos.y - prevPos.y,
    };

    Matter.Body.setPosition(this.body, newPos);
  }
}
```

**Step 4: Create CharacterRenderer**

```typescript
// src/rendering/CharacterRenderer.ts

import { COLORS } from '../utils/constants';
import { Ragdoll } from '../physics/Ragdoll';

export class CharacterRenderer {
  render(ctx: CanvasRenderingContext2D, ragdoll: Ragdoll) {
    const p = ragdoll.parts;
    ctx.strokeStyle = COLORS.characterOutline;
    ctx.fillStyle = COLORS.character;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    // Draw limbs as lines connecting joint positions
    this.drawLimb(ctx, p.upperArmL.position, p.lowerArmL.position);
    this.drawLimb(ctx, p.upperArmR.position, p.lowerArmR.position);
    this.drawLimb(ctx, p.upperLegL.position, p.lowerLegL.position);
    this.drawLimb(ctx, p.upperLegR.position, p.lowerLegR.position);

    // Torso
    const torso = p.torso;
    ctx.save();
    ctx.translate(torso.position.x, torso.position.y);
    ctx.rotate(torso.angle);
    ctx.fillStyle = COLORS.character;
    ctx.fillRect(-6, -14, 12, 28);
    ctx.strokeRect(-6, -14, 12, 28);
    ctx.restore();

    // Head
    ctx.beginPath();
    ctx.arc(p.head.position.x, p.head.position.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.character;
    ctx.fill();
    ctx.stroke();

    // Eyes (simple dots facing direction of movement)
    const headAngle = p.head.angle;
    ctx.fillStyle = COLORS.characterOutline;
    const eyeOffsetX = Math.cos(headAngle) * 3;
    const eyeOffsetY = Math.sin(headAngle) * 3;
    ctx.beginPath();
    ctx.arc(p.head.position.x + eyeOffsetX - 2, p.head.position.y + eyeOffsetY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.head.position.x + eyeOffsetX + 2, p.head.position.y + eyeOffsetY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLimb(ctx: CanvasRenderingContext2D, from: Matter.Vector, to: Matter.Vector) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.character;
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = COLORS.characterOutline;
    ctx.stroke();
  }
}
```

**Step 5: Integrate physics into Game.ts**

Update `Game.ts`:
- Add `PhysicsWorld`, `Ragdoll`, `Bar`, `CharacterRenderer` as properties
- On `loadLevel()`: create PhysicsWorld, create Ragdoll at start position, create Bar, attach ragdoll to bar, add all bodies/constraints to world
- In `fixedUpdate()` PLAYBACK phase: call `bar.update()`, call `ragdoll.applyCartoonPhysics(bar.getVelocity())`, call `physicsWorld.step()`. If `bar.isFinished()`: remove bar constraints, call `ragdoll.release()`
- In `render()`: use CharacterRenderer to draw ragdoll, draw bar dot
- Detect landing: if ragdoll feet touch landing pad body → win. If ragdoll hits obstacle → lose. If ragdoll falls off screen → lose.

**Step 6: Verify playback works**

```bash
npm run dev
```

Confirm: draw a line, watch the character swing along it as a ragdoll, body reacts to movement. At end of path, character releases and flies.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Matter.js physics, ragdoll character, bar following drawn path"
```

---

### Task 5: Obstacles & Level Loading

**Files:**
- Create: `src/levels/LevelLoader.ts`
- Create: `src/rendering/ObstacleRenderer.ts`
- Create: `src/levels/levels.ts`
- Modify: `src/game/Game.ts`

**Step 1: Create first 5 levels**

```typescript
// src/levels/levels.ts

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
```

**Step 2: Create LevelLoader**

```typescript
// src/levels/LevelLoader.ts

import Matter from 'matter-js';
import { LevelConfig, ObstacleConfig } from '../game/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { WORLD_HEIGHT } from '../utils/constants';

export interface LoadedLevel {
  obstacles: { config: ObstacleConfig; body: Matter.Body }[];
  landingPadBody: Matter.Body;
}

export class LevelLoader {
  static load(level: LevelConfig, physicsWorld: PhysicsWorld): LoadedLevel {
    const obstacles: LoadedLevel['obstacles'] = [];

    for (const obs of level.obstacles) {
      const body = LevelLoader.createObstacleBody(obs);
      physicsWorld.addBody(body);
      obstacles.push({ config: obs, body });
    }

    // Landing pad
    const pad = level.landingPad;
    const landingPadBody = Matter.Bodies.rectangle(
      pad.position.x + pad.width / 2,
      pad.position.y + 4,
      pad.width, 8,
      { isStatic: true, label: 'landingPad', isSensor: true }
    );
    physicsWorld.addBody(landingPadBody);

    // Floor under landing pad (solid so character can stand)
    const floorBody = Matter.Bodies.rectangle(
      pad.position.x + pad.width / 2,
      pad.position.y + 12,
      pad.width, 8,
      { isStatic: true, label: 'landingPadFloor', restitution: 0.2 }
    );
    physicsWorld.addBody(floorBody);

    return { obstacles, landingPadBody };
  }

  private static createObstacleBody(obs: ObstacleConfig): Matter.Body {
    switch (obs.type) {
      case 'wall':
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: 'wall' }
        );

      case 'lava':
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: 'lava', isSensor: true }
        );

      case 'window': {
        // Window is two wall segments with a gap
        const gapHeight = obs.gapHeight || 40;
        const wallAboveHeight = obs.position.y;
        const wallBelowY = obs.position.y + gapHeight;
        const wallBelowHeight = WORLD_HEIGHT - wallBelowY;

        // Create compound body with two parts
        const above = Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          wallAboveHeight / 2,
          obs.width, wallAboveHeight,
          { isStatic: true, label: 'wall' }
        );
        const below = Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          wallBelowY + wallBelowHeight / 2,
          obs.width, wallBelowHeight,
          { isStatic: true, label: 'wall' }
        );
        return Matter.Body.create({
          parts: [above, below],
          isStatic: true,
          label: 'window',
        });
      }

      case 'ceiling':
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: 'ceiling' }
        );

      default:
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: obs.type }
        );
    }
  }
}
```

**Step 3: Create ObstacleRenderer**

```typescript
// src/rendering/ObstacleRenderer.ts

import { COLORS, WORLD_HEIGHT } from '../utils/constants';
import { ObstacleConfig, LandingPadConfig } from '../game/types';

export class ObstacleRenderer {
  private lavaTime = 0;

  update(deltaMs: number) {
    this.lavaTime += deltaMs;
  }

  renderObstacle(ctx: CanvasRenderingContext2D, obs: ObstacleConfig) {
    switch (obs.type) {
      case 'wall':
      case 'ceiling':
        ctx.fillStyle = COLORS.wall;
        ctx.strokeStyle = COLORS.wallOutline;
        ctx.lineWidth = 2;
        ctx.fillRect(obs.position.x, obs.position.y, obs.width, obs.height);
        ctx.strokeRect(obs.position.x, obs.position.y, obs.width, obs.height);
        break;

      case 'lava':
        // Glow effect
        ctx.fillStyle = COLORS.lavaGlow;
        ctx.fillRect(obs.position.x - 5, obs.position.y - 10, obs.width + 10, obs.height + 10);
        // Lava body
        ctx.fillStyle = COLORS.lava;
        ctx.fillRect(obs.position.x, obs.position.y, obs.width, obs.height);
        // Animated surface bubbles
        const bubbleCount = Math.floor(obs.width / 30);
        for (let i = 0; i < bubbleCount; i++) {
          const bx = obs.position.x + (i + 0.5) * (obs.width / bubbleCount);
          const bobble = Math.sin(this.lavaTime / 300 + i * 1.5) * 3;
          ctx.beginPath();
          ctx.arc(bx, obs.position.y + bobble, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
          ctx.fill();
        }
        break;

      case 'window': {
        const gapHeight = obs.gapHeight || 40;
        // Wall above gap
        ctx.fillStyle = COLORS.wall;
        ctx.strokeStyle = COLORS.wallOutline;
        ctx.lineWidth = 2;
        ctx.fillRect(obs.position.x, 0, obs.width, obs.position.y);
        ctx.strokeRect(obs.position.x, 0, obs.width, obs.position.y);
        // Wall below gap
        const belowY = obs.position.y + gapHeight;
        ctx.fillRect(obs.position.x, belowY, obs.width, WORLD_HEIGHT - belowY);
        ctx.strokeRect(obs.position.x, belowY, obs.width, WORLD_HEIGHT - belowY);
        break;
      }
    }
  }

  renderLandingPad(ctx: CanvasRenderingContext2D, pad: LandingPadConfig) {
    const { position, width } = pad;

    // Platform
    ctx.fillStyle = COLORS.landingPad;
    ctx.fillRect(position.x, position.y, width, 8);

    // Target center line
    ctx.strokeStyle = COLORS.landingPadTarget;
    ctx.lineWidth = 2;
    const centerX = position.x + width / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, position.y);
    ctx.lineTo(centerX, position.y + 8);
    ctx.stroke();

    // Bullseye rings
    ctx.strokeStyle = COLORS.landingPadTarget;
    ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(centerX, position.y, r * (width / 8), Math.PI, 0);
      ctx.stroke();
    }
  }
}
```

**Step 4: Integrate into Game.ts**

Update Game.ts:
- Import LevelLoader, ObstacleRenderer, levels
- On `loadLevel()`: call `LevelLoader.load()` to create obstacle bodies
- In `render()`: use ObstacleRenderer to draw all obstacles and landing pad
- Add collision detection using Matter.Events: listen for `collisionStart` on engine. If ragdoll part hits 'wall' → lose. If ragdoll part hits 'lava' → lose. If ragdoll feet touch 'landingPad' sensor → check landing quality → win/lose.

**Step 5: Verify obstacles render and collide**

```bash
npm run dev
```

Confirm: levels with walls render, character collides with walls, landing on pad triggers win.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add level loading, obstacles, landing pad, collision detection"
```

---

### Task 6: Win/Lose Detection & Result Screen

**Files:**
- Create: `src/state/GameState.ts`
- Create: `src/rendering/UIRenderer.ts`
- Modify: `src/game/Game.ts`

**Step 1: Create GameState**

```typescript
// src/state/GameState.ts

const STORAGE_KEY = 'swing-escape-state';

interface SavedState {
  currentLevel: number;
  starRatings: Record<number, number>; // levelId -> best stars
  endlessModeHighScore: number;
}

export class GameState {
  private state: SavedState;

  constructor() {
    this.state = this.load();
  }

  private load(): SavedState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { currentLevel: 1, starRatings: {}, endlessModeHighScore: 0 };
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getCurrentLevel(): number {
    return this.state.currentLevel;
  }

  getStars(levelId: number): number {
    return this.state.starRatings[levelId] || 0;
  }

  getTotalStars(): number {
    return Object.values(this.state.starRatings).reduce((sum, s) => sum + s, 0);
  }

  completeLevel(levelId: number, stars: number) {
    const prev = this.state.starRatings[levelId] || 0;
    if (stars > prev) {
      this.state.starRatings[levelId] = stars;
    }
    if (levelId >= this.state.currentLevel) {
      this.state.currentLevel = levelId + 1;
    }
    this.save();
  }

  getEndlessHighScore(): number {
    return this.state.endlessModeHighScore;
  }

  setEndlessHighScore(score: number) {
    if (score > this.state.endlessModeHighScore) {
      this.state.endlessModeHighScore = score;
      this.save();
    }
  }

  reset() {
    this.state = { currentLevel: 1, starRatings: {}, endlessModeHighScore: 0 };
    this.save();
  }
}
```

**Step 2: Write GameState tests**

```typescript
// src/state/__tests__/GameState.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '../GameState';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
});

describe('GameState', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('starts at level 1 with no stars', () => {
    const gs = new GameState();
    expect(gs.getCurrentLevel()).toBe(1);
    expect(gs.getTotalStars()).toBe(0);
  });

  it('advances level on completion', () => {
    const gs = new GameState();
    gs.completeLevel(1, 2);
    expect(gs.getCurrentLevel()).toBe(2);
    expect(gs.getStars(1)).toBe(2);
  });

  it('keeps best star rating', () => {
    const gs = new GameState();
    gs.completeLevel(1, 2);
    gs.completeLevel(1, 1);
    expect(gs.getStars(1)).toBe(2);
    gs.completeLevel(1, 3);
    expect(gs.getStars(1)).toBe(3);
  });

  it('persists across instances', () => {
    const gs1 = new GameState();
    gs1.completeLevel(1, 3);
    const gs2 = new GameState();
    expect(gs2.getCurrentLevel()).toBe(2);
    expect(gs2.getStars(1)).toBe(3);
  });
});
```

**Step 3: Run tests**

```bash
npx vitest run src/state/__tests__/GameState.test.ts
```

**Step 4: Create UIRenderer**

```typescript
// src/rendering/UIRenderer.ts

import { COLORS, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';
import { GameResult } from '../game/types';

export class UIRenderer {
  /** Draw fuel gauge at top of screen */
  renderFuelGauge(ctx: CanvasRenderingContext2D, fraction: number) {
    const barWidth = 200;
    const barHeight = 8;
    const x = WORLD_WIDTH / 2 - barWidth / 2;
    const y = 15;

    // Background
    ctx.fillStyle = COLORS.fuelGaugeBackground;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    ctx.fillStyle = fraction > 0.3 ? COLORS.fuelGauge : '#ff4444';
    ctx.fillRect(x, y, barWidth * fraction, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

  /** Draw "READY" pulsing text */
  renderReady(ctx: CanvasRenderingContext2D, time: number) {
    const alpha = 0.5 + Math.sin(time / 400) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DRAW YOUR PATH!', WORLD_WIDTH / 2, WORLD_HEIGHT - 40);
    ctx.globalAlpha = 1;
  }

  /** Draw result screen */
  renderResult(ctx: CanvasRenderingContext2D, result: GameResult, animProgress: number) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const centerY = WORLD_HEIGHT / 2 - 40;

    // Win/Lose text
    ctx.textAlign = 'center';
    if (result.won) {
      ctx.fillStyle = COLORS.successParticle;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('LANDED!', WORLD_WIDTH / 2, centerY);

      // Stars
      for (let i = 0; i < 3; i++) {
        const starDelay = i * 0.2;
        if (animProgress > starDelay) {
          const starX = WORLD_WIDTH / 2 + (i - 1) * 40;
          const filled = i < result.stars;
          ctx.fillStyle = filled ? COLORS.star : COLORS.starEmpty;
          ctx.font = '32px monospace';
          ctx.fillText(filled ? '\u2605' : '\u2606', starX, centerY + 50);
        }
      }
    } else {
      ctx.fillStyle = COLORS.lava;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('SPLAT!', WORLD_WIDTH / 2, centerY);
    }

    // Tap to continue
    if (animProgress > 0.8) {
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '16px monospace';
      ctx.fillText('Tap to continue', WORLD_WIDTH / 2, centerY + 100);
    }
  }

  /** Draw level number */
  renderLevelNumber(ctx: CanvasRenderingContext2D, level: number) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${level}`, 15, 25);
  }
}
```

**Step 5: Integrate into Game.ts**

- Add win/lose detection in fixedUpdate PLAYBACK phase
- Calculate star rating: `stars = lineLength <= parLineLength ? 3 : lineLength <= parLineLength * 1.5 ? 2 : 1`
- Landing accuracy affects stars: multiply by how close to center of pad
- On win/lose: transition to RESULT phase, store result
- In RESULT phase: render result overlay with animation timer
- On tap during RESULT: if won, advance to next level; if lost, retry same level

**Step 6: Verify win/lose flow**

```bash
npm run dev
```

Confirm: successfully land → "LANDED!" with stars. Hit obstacle or miss → "SPLAT!". Tap to replay or advance.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add win/lose detection, result screen, game state persistence"
```

---

### Task 7: Visual Effects (Juice)

**Files:**
- Create: `src/rendering/EffectsRenderer.ts`
- Modify: `src/game/Game.ts`
- Modify: `src/main.ts`

**Step 1: Create EffectsRenderer**

```typescript
// src/rendering/EffectsRenderer.ts

import { Vector2 } from '../game/types';
import { COLORS, TRAIL_LENGTH, TRAIL_FADE_RATE, SCREEN_SHAKE_DECAY } from '../utils/constants';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class EffectsRenderer {
  private trail: Vector2[] = [];
  private particles: Particle[] = [];
  private shakeIntensity = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private slowMotionTimer = 0;

  getShakeOffset(): Vector2 {
    return { x: this.shakeOffsetX, y: this.shakeOffsetY };
  }

  getTimeScale(): number {
    return this.slowMotionTimer > 0 ? 0.3 : 1;
  }

  addTrailPoint(point: Vector2) {
    this.trail.push({ ...point });
    if (this.trail.length > TRAIL_LENGTH) {
      this.trail.shift();
    }
  }

  triggerShake(intensity: number) {
    this.shakeIntensity = intensity;
  }

  triggerSlowMotion(durationMs: number) {
    this.slowMotionTimer = durationMs;
  }

  spawnParticles(position: Vector2, count: number, color: string, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 1,
        life: 1,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  spawnLandingBurst(position: Vector2, stars: number) {
    const count = stars * 12;
    this.spawnParticles(position, count, COLORS.successParticle, 3 + stars);
    // Gold star particles
    if (stars >= 2) {
      this.spawnParticles(position, 8, COLORS.star, 4);
    }
  }

  spawnCrashParticles(position: Vector2) {
    this.spawnParticles(position, 20, COLORS.particle, 4);
    this.triggerShake(8);
  }

  update(deltaMs: number) {
    // Shake decay
    if (this.shakeIntensity > 0.1) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= SCREEN_SHAKE_DECAY;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Slow motion
    if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= deltaMs;
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity on particles
      p.life -= deltaMs / 1000;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D) {
    // Trail
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const alpha = i / this.trail.length;
        ctx.strokeStyle = `rgba(233, 69, 96, ${alpha * 0.6})`;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.stroke();
      }
    }

    // Particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clearTrail() {
    this.trail = [];
  }

  clear() {
    this.trail = [];
    this.particles = [];
    this.shakeIntensity = 0;
    this.slowMotionTimer = 0;
  }
}
```

**Step 2: Integrate effects into Game.ts**

- During PLAYBACK: add ragdoll feet position to trail each frame. Apply slow-motion time scale to physics step.
- On crash: call `spawnCrashParticles()` at impact point, `triggerShake()`
- On landing: call `spawnLandingBurst()`, slight `triggerShake(2)`
- Near-miss detection: if character passes within 15px of obstacle without hitting, `triggerSlowMotion(300)`

**Step 3: Apply shake offset in main.ts**

In the render loop, add shake offset to the canvas translate:
```typescript
const shake = effects.getShakeOffset();
ctx.translate(offsetX + shake.x, offsetY + shake.y);
```

**Step 4: Add speed lines**

In EffectsRenderer, during PLAYBACK, if bar speed exceeds threshold, draw radial lines radiating from character center. Use `ctx.rotate()` aligned to movement direction.

**Step 5: Verify effects**

```bash
npm run dev
```

Confirm: trail follows feet, particles burst on landing/crash, screen shakes on impact, slow-mo on near-miss.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add visual effects - trail, particles, screen shake, slow-motion"
```

---

### Task 8: Audio System

**Files:**
- Create: `src/audio/AudioManager.ts`
- Modify: `src/game/Game.ts`

**Step 1: Create AudioManager**

```typescript
// src/audio/AudioManager.ts

export class AudioManager {
  private ctx: AudioContext | null = null;
  private initialized = false;

  /** Must be called from user gesture to unlock audio on mobile */
  init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playWhoosh(speed: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 200 + speed * 50;
    gain.gain.value = Math.min(0.05, speed * 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playThud() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 80;
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  playSplat() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  playShatter() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    // High-frequency noise burst
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  playLandingChime(stars: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523, 659, 784]; // C5, E5, G5
    for (let i = 0; i < stars; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    }
  }

  playStarDing(index: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const freqs = [880, 1100, 1320];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqs[index] || 880;
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
}
```

**Step 2: Integrate audio into Game.ts**

- Initialize AudioManager on first user tap (gesture requirement)
- During PLAYBACK: call `playWhoosh()` periodically based on bar speed
- On crash into wall: `playThud()`
- On lava contact: `playSplat()`
- On breakable barrier: `playShatter()`
- On successful landing: `playLandingChime(stars)`
- On star display: `playStarDing(index)` with delay matching star animation

**Step 3: Add haptic feedback**

In Game.ts, add haptic calls alongside audio:
```typescript
function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
```
- Drawing: `vibrate(10)` on each path point added
- Crash: `vibrate(200)`
- Landing: `vibrate([50, 30, 50, 30, 100])`

**Step 4: Verify audio and haptics**

```bash
npm run dev
```

Test on desktop (audio) and phone (audio + haptics). Confirm sounds play at appropriate moments.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add synthesized audio effects and haptic feedback"
```

---

### Task 9: Menu & Level Select

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/game/types.ts`
- Modify: `src/rendering/UIRenderer.ts`

**Step 1: Update GamePhase to include LEVEL_SELECT**

Add `'LEVEL_SELECT'` to the `GamePhase` type union in `types.ts`.

**Step 2: Add level select rendering to UIRenderer**

- Grid of level boxes (5 columns, scrollable)
- Each box shows level number
- Completed levels show star rating (1-3 filled stars)
- Current level pulses/glows
- Locked levels shown as dark silhouettes with lock icon
- "Endless Mode" button at bottom (locked until level 25 complete)

**Step 3: Add level select input handling**

- In Game.ts MENU phase: tap → go to LEVEL_SELECT
- In LEVEL_SELECT: tap a level box → load that level → DRAWING
- Only unlocked levels are tappable
- Back button at top-left returns to MENU

**Step 4: Add level select to Game.ts state machine**

Update `MENU → LEVEL_SELECT → DRAWING → PLAYBACK → RESULT → LEVEL_SELECT`

**Step 5: Verify**

```bash
npm run dev
```

Confirm: menu → level select grid → tap level → play → result → back to level select.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add level select screen with star ratings and progression"
```

---

### Task 10: Remaining Hand-Crafted Levels (6-25)

**Files:**
- Modify: `src/levels/levels.ts`

**Step 1: Add levels 6-25**

Design each level following the progression outlined in the design doc:
- **6-7:** Walls with varying heights and positions
- **8-11:** Introduce lava pools on the ground
- **12-15:** Windows/gaps in walls (progressively narrower)
- **16-19:** Combined obstacles (wall + lava, gap over lava)
- **20-22:** Ceilings forcing low paths
- **23-25:** Moving platforms and breakable barriers (once those obstacle types are implemented in physics)

Each level should be playtested by running `npm run dev` and verifying solvability.

Key design rules:
- Each level introduces ONE new challenge or combination
- Max line length decreases as levels progress (tighter budget)
- Landing pad gets smaller and/or moves to harder positions
- Every level must be solvable with a reasonable path

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add hand-crafted levels 6-25 with progressive difficulty"
```

---

### Task 11: Procedural Level Generator

**Files:**
- Create: `src/levels/LevelGenerator.ts`
- Create: `src/levels/__tests__/LevelGenerator.test.ts`
- Modify: `src/game/Game.ts`

**Step 1: Write LevelGenerator tests**

```typescript
// src/levels/__tests__/LevelGenerator.test.ts

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
```

**Step 2: Run tests to see them fail**

```bash
npx vitest run src/levels/__tests__/LevelGenerator.test.ts
```

**Step 3: Implement LevelGenerator**

```typescript
// src/levels/LevelGenerator.ts

import { LevelConfig, ObstacleConfig } from '../game/types';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';

export class LevelGenerator {
  /** Seeded random for deterministic levels */
  private static seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  static generate(levelId: number, difficulty: number): LevelConfig {
    const rand = LevelGenerator.seededRandom(levelId * 7919);

    // Difficulty curve: flattens every 10 levels
    const effectiveDifficulty = difficulty - Math.floor(difficulty / 10) * 2;

    // Obstacle count scales with difficulty
    const obstacleCount = Math.min(1 + Math.floor(effectiveDifficulty / 2), 8);

    // Available obstacle types based on difficulty
    const types: ObstacleConfig['type'][] = ['wall'];
    if (effectiveDifficulty >= 3) types.push('lava');
    if (effectiveDifficulty >= 6) types.push('window');
    if (effectiveDifficulty >= 10) types.push('ceiling');

    const obstacles: ObstacleConfig[] = [];
    const usedXPositions: number[] = [];

    for (let i = 0; i < obstacleCount; i++) {
      const type = types[Math.floor(rand() * types.length)];

      // Space obstacles across the level
      let x = 200 + (i / obstacleCount) * 400;
      x += (rand() - 0.5) * 60;
      // Avoid overlap
      while (usedXPositions.some(px => Math.abs(px - x) < 50)) {
        x += 50;
      }
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

        case 'window':
          const gapHeight = Math.max(35, 70 - effectiveDifficulty * 2);
          obstacles.push({
            type: 'window',
            position: { x, y: 150 + rand() * 200 },
            width: 15 + rand() * 10,
            height: WORLD_HEIGHT,
            gapHeight,
          });
          break;

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

    // Landing pad gets smaller with difficulty
    const padWidth = Math.max(40, 100 - effectiveDifficulty * 3);
    const padX = 620 + rand() * 60;
    const padY = 300 + rand() * 200;

    // Line budget gets tighter with difficulty
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
```

**Step 4: Run tests**

```bash
npx vitest run src/levels/__tests__/LevelGenerator.test.ts
```

Expected: all pass.

**Step 5: Integrate into Game.ts**

When level > 25 (or beyond hand-crafted levels array), use `LevelGenerator.generate(levelId, levelId - 25)` to create the level config.

**Step 6: Verify endless mode**

```bash
npm run dev
```

Skip to high levels (temporarily set currentLevel in localStorage) and confirm procedural levels generate and are playable.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add procedural level generator for endless mode"
```

---

### Task 12: Polish & Mobile Optimization

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`
- Modify: `src/game/Game.ts`

**Step 1: Add PWA meta tags to index.html**

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#1a1a2e" />
```

**Step 2: Prevent default touch behaviors**

In main.ts, add:
```typescript
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());
```

**Step 3: Add loading screen**

Brief "SWING ESCAPE" splash that fades in, then transitions to menu on first frame.

**Step 4: Add level transition animations**

In Game.ts, between levels:
- Fade to black over 300ms
- Load new level
- Fade from black over 300ms

**Step 5: Performance profiling**

Run on phone, check for frame drops:
- Ensure `requestAnimationFrame` loop is clean
- Pool particle objects instead of creating/GCing each frame
- Limit trail length
- Use `ctx.save()/restore()` efficiently

**Step 6: Verify on mobile**

Test on phone browser. Confirm:
- Smooth 60fps
- No zoom/bounce on touch
- Drawing feels responsive
- Audio plays after first tap
- Haptics work

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: mobile optimization, transitions, and PWA meta tags"
```

---

### Task 13: Final Integration Testing

**Step 1: Full playthrough test**

Play through levels 1-5 manually, verifying:
- Menu → level select → draw → playback → result → next level
- Star ratings save correctly
- Fuel gauge works
- All effects trigger
- Audio plays
- Win and lose both work

**Step 2: Mobile playthrough**

Same test on phone. Verify touch input, haptics, performance.

**Step 3: Edge cases**

- Draw very short path (less than 2 points) → should not start playback
- Draw path that uses all fuel → fuel gauge empty, can't draw more
- Resize browser during gameplay → canvas scales correctly
- Close and reopen → progress persists
- Level 25 → 26 transition (hand-crafted to procedural)

**Step 4: Fix any issues found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: address integration testing issues"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Vite + Canvas bootstrap | index.html, main.ts, constants.ts |
| 2 | Game state machine & loop | Game.ts, types.ts |
| 3 | Input handling & path drawing | InputHandler.ts, PathValidator.ts, math.ts |
| 4 | Physics & ragdoll character | PhysicsWorld.ts, Ragdoll.ts, Bar.ts, CharacterRenderer.ts |
| 5 | Obstacles & level loading | LevelLoader.ts, ObstacleRenderer.ts, levels.ts |
| 6 | Win/lose detection & results | GameState.ts, UIRenderer.ts |
| 7 | Visual effects (juice) | EffectsRenderer.ts |
| 8 | Audio system | AudioManager.ts |
| 9 | Menu & level select | UIRenderer.ts, Game.ts |
| 10 | Hand-crafted levels 6-25 | levels.ts |
| 11 | Procedural level generator | LevelGenerator.ts |
| 12 | Polish & mobile optimization | index.html, main.ts |
| 13 | Integration testing | All files |
