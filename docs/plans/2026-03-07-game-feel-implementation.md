# Game Feel & Addiction Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add zero-friction retry, combo scoring, death camera zoom, and victory celebration to make Swing Escape more addictive and satisfying.

**Architecture:** Each feature is largely independent. We modify existing renderers and game logic rather than creating new systems. The combo system introduces a new `ComboTracker` class. Death camera and victory celebration modify the `RESULT` phase flow with timed sub-states. Ghost line is stored in `Game` and rendered by the existing path renderer in `main.ts`.

**Tech Stack:** TypeScript, Matter.js, Canvas 2D, Web Audio API

---

### Task 1: Ghost Line on Retry

Store previous attempt's drawn path and render it as a faint line on retry.

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/main.ts`

**Step 1: Add ghost path storage to Game**

In `src/game/Game.ts`, add a field to store the previous path and expose it:

```typescript
// Add field after drawnPath declaration (line ~37)
private ghostPath: Vector2[] = [];

// Add getter
getGhostPath(): Vector2[] {
  return this.ghostPath;
}
```

**Step 2: Save path as ghost on retry, clear on level change**

In `src/game/Game.ts`, modify `loadLevel()` to save current drawnPath as ghostPath when replaying same level, and clear it on level change:

```typescript
// At the top of loadLevel(), before resetting drawnPath:
if (this.currentLevel && level.id === this.currentLevel.id) {
  // Retry same level — save current path as ghost
  this.ghostPath = [...this.drawnPath];
} else {
  // New level — clear ghost
  this.ghostPath = [];
}
```

**Step 3: Render ghost path in main.ts**

In `src/main.ts`, add ghost path rendering before the active path:

```typescript
// In the render section (after game.render(), before renderPath):
if ((phase === 'DRAWING' || phase === 'PLAYBACK')) {
  const ghostPath = game.getGhostPath();
  if (ghostPath.length > 1) {
    ctx.strokeStyle = COLORS.pathGhost;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(ghostPath[0].x, ghostPath[0].y);
    for (let i = 1; i < ghostPath.length; i++) {
      ctx.lineTo(ghostPath[i].x, ghostPath[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
```

**Step 4: Test manually**

Run: `npx vite dev`
- Play a level, draw a path, die
- On retry, previous path should appear as faint dashed line
- Start drawing to see both paths
- Select a different level — ghost should be gone

**Step 5: Commit**

```bash
git add src/game/Game.ts src/main.ts
git commit -m "feat: ghost line shows previous attempt path on retry"
```

---

### Task 2: Retry and Next Buttons on Result Screen

Replace "tap to continue" with explicit RETRY (center) and contextual buttons.

**Files:**
- Modify: `src/rendering/UIRenderer.ts`
- Modify: `src/main.ts`

**Step 1: Add button rendering to UIRenderer**

Replace the existing `renderResult` method in `src/rendering/UIRenderer.ts`:

```typescript
renderResult(ctx: CanvasRenderingContext2D, result: GameResult, animProgress: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const centerY = WORLD_HEIGHT / 2 - 40;
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

  // Buttons appear after animation
  if (animProgress > 0.8) {
    // Large center button: RETRY (on death) or NEXT (on win)
    const btnY = centerY + 100;
    const btnWidth = 160;
    const btnHeight = 44;
    const mainLabel = result.won ? 'NEXT' : 'RETRY';
    const mainColor = result.won ? COLORS.successParticle : COLORS.lava;

    // Main button
    ctx.fillStyle = mainColor;
    ctx.fillRect(WORLD_WIDTH / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(mainLabel, WORLD_WIDTH / 2, btnY + 7);

    // Small secondary button: LEVELS (on death) or RETRY (on win)
    const secLabel = result.won ? 'RETRY' : 'LEVELS';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '14px monospace';
    ctx.fillText(secLabel, WORLD_WIDTH / 2, btnY + 50);
  }
}
```

**Step 2: Add hit detection for buttons**

Add to `UIRenderer`:

```typescript
getResultButtonTapped(
  x: number, y: number, result: GameResult
): 'main' | 'secondary' | null {
  const centerY = WORLD_HEIGHT / 2 - 40;
  const btnY = centerY + 100;
  const btnWidth = 160;
  const btnHeight = 44;

  // Main button
  if (
    x >= WORLD_WIDTH / 2 - btnWidth / 2 &&
    x <= WORLD_WIDTH / 2 + btnWidth / 2 &&
    y >= btnY - btnHeight / 2 &&
    y <= btnY + btnHeight / 2
  ) {
    return 'main';
  }

  // Secondary button (text link area)
  if (
    x >= WORLD_WIDTH / 2 - 60 &&
    x <= WORLD_WIDTH / 2 + 60 &&
    y >= btnY + 35 &&
    y <= btnY + 55
  ) {
    return 'secondary';
  }

  return null;
}
```

**Step 3: Update result tap handling in main.ts**

Replace the `phase === 'RESULT'` block in the `pointerdown` handler:

```typescript
if (phase === 'RESULT') {
  const result = game.getResult();
  if (!result) return;

  const worldPos = canvasToWorld(e.clientX, e.clientY);
  const uiRenderer = game.getUIRenderer();
  const button = uiRenderer.getResultButtonTapped(worldPos.x, worldPos.y, result);

  if (!button) return; // Tap outside buttons — ignore

  const levelId = currentLevelIndex + 1;

  if (result.won) {
    gameState.completeLevel(levelId, result.stars);
    if (button === 'main') {
      // NEXT level
      currentLevelIndex++;
      const nextLevel = getLevel(currentLevelIndex + 1);
      game.transitionToLevel(nextLevel);
      inputHandler = new InputHandler(nextLevel.startPosition, nextLevel.maxLineLength, canvasToWorld);
      inputHandler.setOnDrawingComplete((path) => game.startPlayback(path));
    } else {
      // RETRY same level
      const level = getLevel(levelId);
      game.transitionToLevel(level);
      inputHandler = new InputHandler(level.startPosition, level.maxLineLength, canvasToWorld);
      inputHandler.setOnDrawingComplete((path) => game.startPlayback(path));
    }
  } else {
    if (button === 'main') {
      // RETRY
      const level = getLevel(levelId);
      game.transitionToLevel(level);
      inputHandler = new InputHandler(level.startPosition, level.maxLineLength, canvasToWorld);
      inputHandler.setOnDrawingComplete((path) => game.startPlayback(path));
    } else {
      // LEVELS
      game.setPhase('LEVEL_SELECT');
      inputHandler = null;
    }
  }
}
```

**Step 4: Test manually**

- Die on a level → see RETRY (large) + LEVELS (small)
- Win a level → see NEXT (large) + RETRY (small)
- Verify RETRY reloads same level, NEXT advances, LEVELS goes to select

**Step 5: Commit**

```bash
git add src/rendering/UIRenderer.ts src/main.ts
git commit -m "feat: explicit RETRY/NEXT/LEVELS buttons on result screen"
```

---

### Task 3: Combo Tracker System

Track combo events during playback and accumulate scores with multiplier.

**Files:**
- Create: `src/game/ComboTracker.ts`
- Modify: `src/game/types.ts`

**Step 1: Add combo types to types.ts**

Add to `src/game/types.ts`:

```typescript
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
```

Note: The `GameResult` interface is being replaced — `comboScore`, `comboEvents`, `totalScore`, `bestScore`, and `isNewBest` are new fields.

**Step 2: Create ComboTracker class**

Create `src/game/ComboTracker.ts`:

```typescript
import { ComboEvent, ComboEventType, Vector2 } from './types';

const EVENT_CONFIG: Record<ComboEventType, { points: number; label: string }> = {
  nearMiss: { points: 10, label: 'NEAR MISS' },
  windowThread: { points: 25, label: 'THREAD' },
  flip: { points: 15, label: 'FLIP' },
  speedBurst: { points: 5, label: 'SPEED' },
  perfectLanding: { points: 30, label: 'PERFECT' },
};

const COMBO_WINDOW_MS = 1000;
const COMBO_RESET_MS = 1500;
const MAX_MULTIPLIER = 5;

export class ComboTracker {
  private events: ComboEvent[] = [];
  private multiplier = 1;
  private lastEventTime = 0;
  private currentTime = 0;

  // Flip detection state
  private headWasBelowFeet = false;
  private hasCompletedFlip = false;

  // Speed burst state
  private speedBurstTimer = 0;
  private readonly SPEED_THRESHOLD = 5;
  private readonly SPEED_SUSTAIN_MS = 300;

  // Near-miss cooldown per obstacle
  private nearMissCooldowns: Set<string> = new Set();

  reset() {
    this.events = [];
    this.multiplier = 1;
    this.lastEventTime = 0;
    this.currentTime = 0;
    this.headWasBelowFeet = false;
    this.hasCompletedFlip = false;
    this.speedBurstTimer = 0;
    this.nearMissCooldowns.clear();
  }

  update(deltaMs: number) {
    this.currentTime += deltaMs;

    // Reset multiplier after timeout
    if (this.lastEventTime > 0 && this.currentTime - this.lastEventTime > COMBO_RESET_MS) {
      this.multiplier = 1;
    }
  }

  registerNearMiss(obstacleId: string, position: Vector2): ComboEvent | null {
    if (this.nearMissCooldowns.has(obstacleId)) return null;
    this.nearMissCooldowns.add(obstacleId);
    return this.addEvent('nearMiss', position);
  }

  registerWindowThread(position: Vector2): ComboEvent | null {
    return this.addEvent('windowThread', position);
  }

  checkFlip(headPos: Vector2, feetPos: Vector2): ComboEvent | null {
    const headBelowFeet = headPos.y > feetPos.y;

    if (headBelowFeet && !this.headWasBelowFeet) {
      this.headWasBelowFeet = true;
    } else if (!headBelowFeet && this.headWasBelowFeet) {
      // Head came back above feet — full rotation
      this.headWasBelowFeet = false;
      if (!this.hasCompletedFlip) {
        this.hasCompletedFlip = true;
        const midPoint = {
          x: (headPos.x + feetPos.x) / 2,
          y: (headPos.y + feetPos.y) / 2,
        };
        return this.addEvent('flip', midPoint);
      }
      // Allow subsequent flips
      return this.addEvent('flip', {
        x: (headPos.x + feetPos.x) / 2,
        y: (headPos.y + feetPos.y) / 2,
      });
    }

    return null;
  }

  checkSpeedBurst(speed: number, deltaMs: number, position: Vector2): ComboEvent | null {
    if (speed > this.SPEED_THRESHOLD) {
      this.speedBurstTimer += deltaMs;
      if (this.speedBurstTimer >= this.SPEED_SUSTAIN_MS) {
        this.speedBurstTimer = 0; // Reset for next burst
        return this.addEvent('speedBurst', position);
      }
    } else {
      this.speedBurstTimer = 0;
    }
    return null;
  }

  registerPerfectLanding(position: Vector2): ComboEvent | null {
    return this.addEvent('perfectLanding', position);
  }

  private addEvent(type: ComboEventType, position: Vector2): ComboEvent {
    const config = EVENT_CONFIG[type];

    // Check if within combo window
    if (this.lastEventTime > 0 && this.currentTime - this.lastEventTime <= COMBO_WINDOW_MS) {
      this.multiplier = Math.min(this.multiplier + 1, MAX_MULTIPLIER);
    }

    const event: ComboEvent = {
      type,
      points: config.points * this.multiplier,
      multiplier: this.multiplier,
      position: { ...position },
      label: config.label,
    };

    this.events.push(event);
    this.lastEventTime = this.currentTime;
    return event;
  }

  getEvents(): ComboEvent[] {
    return this.events;
  }

  getTotalScore(): number {
    return this.events.reduce((sum, e) => sum + e.points, 0);
  }
}
```

**Step 3: Test manually**

This is a data-only class — it will be tested through integration in Task 4.

**Step 4: Commit**

```bash
git add src/game/ComboTracker.ts src/game/types.ts
git commit -m "feat: add ComboTracker class and combo types"
```

---

### Task 4: Integrate Combo Tracking into Game Loop

Wire ComboTracker into the playback loop and result calculation.

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/state/GameState.ts`

**Step 1: Add ComboTracker to Game class**

In `src/game/Game.ts`:

```typescript
// Import
import { ComboTracker } from './ComboTracker';

// Add field (after effects field)
private comboTracker: ComboTracker = new ComboTracker();

// In loadLevel(), after effects.clear():
this.comboTracker.reset();
```

**Step 2: Add combo detection to PLAYBACK fixedUpdate**

In the `PLAYBACK` case of `fixedUpdate()`, after the existing near-miss slow-motion detection block, add combo tracking:

```typescript
// Combo tracking
this.comboTracker.update(PHYSICS_TIMESTEP);

const feetPos = this.ragdoll.getFeetPosition();
const headPos = this.ragdoll.getHeadPosition();

// Near-miss detection (modify existing block to also trigger combo)
if (this.loadedLevel) {
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
      // Use body.id as unique identifier
      const event = this.comboTracker.registerNearMiss(String(body.id), feetPos);
      if (event) {
        this.effects.spawnFloatingText(event.position, `+${event.points} ${event.label}!`, this.getComboColor(event.type));
      }
    }
  }
}

// Flip detection
const flipEvent = this.comboTracker.checkFlip(headPos, feetPos);
if (flipEvent) {
  this.effects.spawnFloatingText(flipEvent.position, `+${flipEvent.points} ${flipEvent.label}!`, this.getComboColor(flipEvent.type));
}

// Speed burst detection
const vel = this.bar.getVelocity();
const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
const speedEvent = this.comboTracker.checkSpeedBurst(speed, PHYSICS_TIMESTEP, feetPos);
if (speedEvent) {
  this.effects.spawnFloatingText(speedEvent.position, `+${speedEvent.points} ${speedEvent.label}!`, this.getComboColor(speedEvent.type));
}
```

Add helper method to Game:

```typescript
private getComboColor(type: string): string {
  switch (type) {
    case 'nearMiss': return '#ff6b6b';
    case 'windowThread': return '#4ecdc4';
    case 'flip': return '#ffe66d';
    case 'speedBurst': return '#a8e6cf';
    case 'perfectLanding': return '#ffd700';
    default: return '#ffffff';
  }
}
```

**Step 3: Update transitionToResult with combo scoring**

Modify `transitionToResult()` in `src/game/Game.ts` to include combo score:

```typescript
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

  // Check best score
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
```

**Step 4: Add best score tracking to GameState**

In `src/state/GameState.ts`, add `bestScores` to the saved state:

```typescript
interface SavedState {
  currentLevel: number;
  starRatings: Record<number, number>;
  bestScores: Record<number, number>;
  endlessModeHighScore: number;
}

// Update default state in load():
return { currentLevel: 1, starRatings: {}, bestScores: {}, endlessModeHighScore: 0 };

// Add methods:
getBestScore(levelId: number): number {
  return this.state.bestScores[levelId] || 0;
}

setBestScore(levelId: number, score: number) {
  const prev = this.state.bestScores[levelId] || 0;
  if (score > prev) {
    this.state.bestScores[levelId] = score;
    this.save();
  }
}

// Update reset():
reset() {
  this.state = { currentLevel: 1, starRatings: {}, bestScores: {}, endlessModeHighScore: 0 };
  this.save();
}
```

**Step 5: Remove the duplicate near-miss block**

The existing near-miss detection block in `fixedUpdate()` (lines ~338-353 of Game.ts) should be replaced by the combo-integrated version above. Remove the old block to avoid duplicate slow-motion triggers.

**Step 6: Test manually**

- Play a level, pass near obstacles → should see floating text "+10 NEAR MISS!"
- Get character spinning → should see "+15 FLIP!"
- Bar moving fast → should see "+5 SPEED!"
- Land on center of pad → should see "+30 PERFECT!"

**Step 7: Commit**

```bash
git add src/game/Game.ts src/game/ComboTracker.ts src/state/GameState.ts
git commit -m "feat: integrate combo tracking into game loop with scoring"
```

---

### Task 5: Floating Text Rendering

Add floating text popups to EffectsRenderer for combo event feedback.

**Files:**
- Modify: `src/rendering/EffectsRenderer.ts`

**Step 1: Add floating text system**

Add to `src/rendering/EffectsRenderer.ts`:

```typescript
interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

// Add field to class:
private floatingTexts: FloatingText[] = [];

// Add method:
spawnFloatingText(position: Vector2, text: string, color: string) {
  this.floatingTexts.push({
    x: position.x,
    y: position.y,
    text,
    color,
    life: 0.8,
    maxLife: 0.8,
  });
}
```

**Step 2: Update and render floating texts**

In `update()`, add:

```typescript
// Update floating texts
for (const ft of this.floatingTexts) {
  ft.y -= deltaMs * 0.04; // Float upward
  ft.life -= deltaMs / 1000;
}
this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
```

In `render()`, add after the particles rendering:

```typescript
// Floating texts
for (const ft of this.floatingTexts) {
  const alpha = ft.life / ft.maxLife;
  const scale = 0.8 + (1 - alpha) * 0.3; // Slight grow as it fades
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ft.color;
  ctx.font = `bold ${Math.round(16 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(ft.text, ft.x, ft.y);
}
ctx.globalAlpha = 1;
```

In `clear()`, add:

```typescript
this.floatingTexts = [];
```

**Step 3: Test manually**

- Play and get near-miss events → floating text should appear, float up, and fade out over 0.8s

**Step 4: Commit**

```bash
git add src/rendering/EffectsRenderer.ts
git commit -m "feat: floating text rendering for combo event feedback"
```

---

### Task 6: Combo Multiplier Badge

Show active combo multiplier as a small badge in the corner during playback.

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/game/ComboTracker.ts`
- Modify: `src/rendering/UIRenderer.ts`

**Step 1: Expose multiplier from ComboTracker**

Add to `ComboTracker`:

```typescript
getMultiplier(): number {
  return this.multiplier;
}

isComboActive(): boolean {
  return this.lastEventTime > 0 && this.currentTime - this.lastEventTime <= COMBO_RESET_MS;
}
```

**Step 2: Add multiplier badge rendering to UIRenderer**

Add to `UIRenderer`:

```typescript
renderComboMultiplier(ctx: CanvasRenderingContext2D, multiplier: number) {
  if (multiplier <= 1) return;

  const x = WORLD_WIDTH - 60;
  const y = 35;

  ctx.fillStyle = 'rgba(233, 69, 96, 0.8)';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`x${multiplier}`, x, y + 6);
}
```

**Step 3: Render badge during PLAYBACK**

In `Game.ts` `render()`, in the `PLAYBACK` case, add:

```typescript
if (this.comboTracker.isComboActive()) {
  this.uiRenderer.renderComboMultiplier(ctx, this.comboTracker.getMultiplier());
}
```

**Step 4: Test manually**

- Trigger multiple combo events in quick succession → badge should appear in top-right showing x2, x3, etc.
- After 1.5s of no events → badge should disappear

**Step 5: Commit**

```bash
git add src/game/Game.ts src/game/ComboTracker.ts src/rendering/UIRenderer.ts
git commit -m "feat: combo multiplier badge during active combos"
```

---

### Task 7: Death Camera Zoom

Zoom camera to impact point on death for dramatic effect.

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/main.ts`

**Step 1: Add death camera state to Game**

Add fields to `Game`:

```typescript
private deathZoom = { active: false, progress: 0, targetX: 0, targetY: 0, phase: 'idle' as 'idle' | 'zoomIn' | 'hold' | 'zoomOut' };

getDeathZoom(): { active: boolean; scale: number; targetX: number; targetY: number } {
  if (!this.deathZoom.active) return { active: false, scale: 1, targetX: 0, targetY: 0 };

  let scale = 1;
  if (this.deathZoom.phase === 'zoomIn') {
    scale = 1 + 0.5 * this.easeOutCubic(this.deathZoom.progress);
  } else if (this.deathZoom.phase === 'hold') {
    scale = 1.5;
  } else if (this.deathZoom.phase === 'zoomOut') {
    scale = 1.5 - 0.5 * this.easeInCubic(this.deathZoom.progress);
  }

  return { active: true, scale, targetX: this.deathZoom.targetX, targetY: this.deathZoom.targetY };
}

private easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
private easeInCubic(t: number): number { return t * t * t; }
```

**Step 2: Trigger death zoom on collision**

In the collision handler, when death occurs (wall, lava, ground hits), before `this.transitionToResult()`:

```typescript
// Start death camera zoom
const impactPoint = this.ragdoll?.getFeetPosition() || { x: 0, y: 0 };
this.deathZoom = { active: true, progress: 0, targetX: impactPoint.x, targetY: impactPoint.y, phase: 'zoomIn' };
```

**Step 3: Update death zoom in RESULT phase**

In `fixedUpdate()`, in the `RESULT` case, add death zoom update:

```typescript
case 'RESULT':
  if (this.physicsWorld) {
    this.physicsWorld.step(PHYSICS_TIMESTEP);
  }
  // Update death camera zoom
  if (this.deathZoom.active) {
    this.deathZoom.progress += PHYSICS_TIMESTEP / (this.deathZoom.phase === 'hold' ? 400 : 300);
    if (this.deathZoom.progress >= 1) {
      this.deathZoom.progress = 0;
      if (this.deathZoom.phase === 'zoomIn') this.deathZoom.phase = 'hold';
      else if (this.deathZoom.phase === 'hold') this.deathZoom.phase = 'zoomOut';
      else if (this.deathZoom.phase === 'zoomOut') {
        this.deathZoom.active = false;
        this.deathZoom.phase = 'idle';
      }
    }
  }
  break;
```

**Step 4: Apply zoom in main.ts render loop**

In `src/main.ts`, after `ctx.scale(scale, scale)` in the render loop, apply death zoom:

```typescript
const deathZoom = game.getDeathZoom();
if (deathZoom.active) {
  const zs = deathZoom.scale;
  // Zoom centered on impact point
  ctx.translate(deathZoom.targetX, deathZoom.targetY);
  ctx.scale(zs, zs);
  ctx.translate(-deathZoom.targetX, -deathZoom.targetY);
}
```

**Step 5: Reset death zoom on level load**

In `loadLevel()`:

```typescript
this.deathZoom = { active: false, progress: 0, targetX: 0, targetY: 0, phase: 'idle' };
```

**Step 6: Test manually**

- Die on a level → camera should smoothly zoom into impact point (0.3s)
- Hold at 1.5x zoom for 0.4s while ragdoll flops
- Zoom back out over 0.3s
- Then result overlay appears

**Step 7: Commit**

```bash
git add src/game/Game.ts src/main.ts
git commit -m "feat: death camera zoom on impact for dramatic effect"
```

---

### Task 8: Victory Pose

Make ragdoll throw arms up in victory on successful landing.

**Files:**
- Modify: `src/physics/Ragdoll.ts`
- Modify: `src/game/Game.ts`

**Step 1: Add victory pose method to Ragdoll**

Add to `src/physics/Ragdoll.ts`:

```typescript
doVictoryPose() {
  // Arms up in V shape
  const armForce = 0.008;
  Matter.Body.applyForce(this.parts.upperArmL, this.parts.upperArmL.position, { x: -armForce * 0.5, y: -armForce });
  Matter.Body.applyForce(this.parts.upperArmR, this.parts.upperArmR.position, { x: armForce * 0.5, y: -armForce });
  Matter.Body.applyForce(this.parts.lowerArmL, this.parts.lowerArmL.position, { x: -armForce * 0.3, y: -armForce * 0.8 });
  Matter.Body.applyForce(this.parts.lowerArmR, this.parts.lowerArmR.position, { x: armForce * 0.3, y: -armForce * 0.8 });

  // Small hop
  const hopForce = 0.003;
  for (const body of this.getAllBodies()) {
    Matter.Body.applyForce(body, body.position, { x: 0, y: -hopForce });
  }

  // Temporarily stiffen joints so pose holds
  for (const c of this.constraints) {
    c.stiffness = 1.0;
  }
}
```

**Step 2: Trigger victory pose on landing**

In `Game.ts`, in `transitionToResult()`, where `won` is true, after the existing effects:

```typescript
if (won && this.ragdoll) {
  const landingPos = this.ragdoll.getFeetPosition();
  this.effects.spawnLandingBurst(landingPos, stars);
  this.effects.triggerShake(2);
  this.audio.playLandingChime(stars);
  vibrate([50, 30, 50, 30, 100]);
  this.ragdoll.doVictoryPose(); // NEW
}
```

**Step 3: Test manually**

- Land on the pad → character should throw arms up and hop slightly
- Arms should stay up for about 1s due to stiff joints

**Step 4: Commit**

```bash
git add src/physics/Ragdoll.ts src/game/Game.ts
git commit -m "feat: ragdoll victory pose with arms up on successful landing"
```

---

### Task 9: Score Ticker on Victory

Replace the simple "LANDED!" overlay with an animated score ticker that reveals combo events one by one.

**Files:**
- Modify: `src/rendering/UIRenderer.ts`
- Modify: `src/audio/AudioManager.ts`
- Modify: `src/game/Game.ts`

**Step 1: Add score ding sound to AudioManager**

Add to `src/audio/AudioManager.ts`:

```typescript
playScoreDing() {
  const ctx = this.ensureContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  gain.gain.value = 0.08;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

playScoreFlourish() {
  const ctx = this.ensureContext();
  if (!ctx) return;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.3);
  });
}
```

**Step 2: Update UIRenderer renderResult for score ticker**

Replace the `renderResult` method to handle the score ticker when result is won:

```typescript
renderResult(ctx: CanvasRenderingContext2D, result: GameResult, animProgress: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  const centerY = WORLD_HEIGHT / 2 - 60;
  ctx.textAlign = 'center';

  if (result.won) {
    // Score ticker
    const tickerLines: { label: string; score: string; color: string }[] = [];

    // Landing bonus
    const landingBonus = result.landingAccuracy > 0.75 ? 50 : 30;
    tickerLines.push({ label: 'Landing', score: `+${landingBonus}`, color: COLORS.successParticle });

    // Combo events (summarized by type)
    const typeCounts: Record<string, { count: number; total: number }> = {};
    for (const e of result.comboEvents) {
      if (!typeCounts[e.label]) typeCounts[e.label] = { count: 0, total: 0 };
      typeCounts[e.label].count++;
      typeCounts[e.label].total += e.points;
    }
    for (const [label, data] of Object.entries(typeCounts)) {
      tickerLines.push({
        label: `${label} x${data.count}`,
        score: `+${data.total}`,
        color: '#4ecdc4',
      });
    }

    // Efficiency bonus
    const efficiencyBonus = result.totalScore - result.comboScore - landingBonus;
    if (efficiencyBonus > 0) {
      tickerLines.push({ label: 'Efficiency', score: `+${efficiencyBonus}`, color: '#a8e6cf' });
    }

    // Render ticker lines based on animation progress
    // Each line appears 0.3s apart, starting at 0.2s
    const lineStartTime = 0.2;
    const lineInterval = 0.1; // In terms of animProgress (0-1 over ~3s)

    for (let i = 0; i < tickerLines.length; i++) {
      const lineProgress = (animProgress - lineStartTime - i * lineInterval) / lineInterval;
      if (lineProgress < 0) break;

      const alpha = Math.min(lineProgress, 1);
      const line = tickerLines[i];
      const y = centerY + i * 28;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(line.label, WORLD_WIDTH / 2 - 100, y);

      ctx.fillStyle = line.color;
      ctx.textAlign = 'right';
      ctx.fillText(line.score, WORLD_WIDTH / 2 + 100, y);
    }

    // Total line (appears after all ticker lines)
    const totalTime = lineStartTime + tickerLines.length * lineInterval + 0.1;
    if (animProgress > totalTime) {
      const totalAlpha = Math.min((animProgress - totalTime) / 0.1, 1);
      ctx.globalAlpha = totalAlpha;

      // Divider
      const divY = centerY + tickerLines.length * 28 + 5;
      ctx.strokeStyle = COLORS.textSecondary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(WORLD_WIDTH / 2 - 100, divY);
      ctx.lineTo(WORLD_WIDTH / 2 + 100, divY);
      ctx.stroke();

      // Total
      const totalY = divY + 30;
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TOTAL: ${result.totalScore}`, WORLD_WIDTH / 2, totalY);

      // Best score
      const bestY = totalY + 25;
      if (result.isNewBest) {
        ctx.fillStyle = COLORS.star;
        ctx.font = 'bold 16px monospace';
        ctx.fillText('NEW BEST!', WORLD_WIDTH / 2, bestY);
      } else if (result.bestScore > 0) {
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = '14px monospace';
        ctx.fillText(`BEST: ${result.bestScore}`, WORLD_WIDTH / 2, bestY);
      }

      // Stars
      const starsY = bestY + 30;
      for (let i = 0; i < 3; i++) {
        const starX = WORLD_WIDTH / 2 + (i - 1) * 40;
        const filled = i < result.stars;
        ctx.fillStyle = filled ? COLORS.star : COLORS.starEmpty;
        ctx.font = '32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(filled ? '\u2605' : '\u2606', starX, starsY);
      }
    }

    ctx.globalAlpha = 1;

    // Buttons appear after ticker complete
    const buttonsTime = totalTime + 0.15;
    if (animProgress > buttonsTime) {
      const btnY = WORLD_HEIGHT - 80;
      const btnWidth = 160;
      const btnHeight = 44;

      // NEXT button
      ctx.fillStyle = COLORS.successParticle;
      ctx.fillRect(WORLD_WIDTH / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', WORLD_WIDTH / 2, btnY + 7);

      // RETRY (small)
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '14px monospace';
      ctx.fillText('RETRY', WORLD_WIDTH / 2, btnY + 40);
    }
  } else {
    // Death result — keep simple
    ctx.fillStyle = COLORS.lava;
    ctx.font = 'bold 48px monospace';
    ctx.fillText('SPLAT!', WORLD_WIDTH / 2, centerY + 40);

    if (animProgress > 0.8) {
      const btnY = centerY + 120;
      const btnWidth = 160;
      const btnHeight = 44;

      ctx.fillStyle = COLORS.lava;
      ctx.fillRect(WORLD_WIDTH / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RETRY', WORLD_WIDTH / 2, btnY + 7);

      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '14px monospace';
      ctx.fillText('LEVELS', WORLD_WIDTH / 2, btnY + 40);
    }
  }
}
```

**Step 3: Increase result animation duration for wins**

In `Game.ts`, update `renderResultOverlay`:

```typescript
private renderResultOverlay(ctx: CanvasRenderingContext2D) {
  if (!this.result) return;
  const elapsed = this.gameTime - this.resultStartTime;
  const duration = this.result.won ? 3000 : 1000;
  const animProgress = Math.min(elapsed / duration, 1);
  this.uiRenderer.renderResult(ctx, this.result, animProgress);
}
```

**Step 4: Update button hit detection for new button positions**

Update `getResultButtonTapped` in UIRenderer to match new button positions:

```typescript
getResultButtonTapped(
  x: number, y: number, result: GameResult
): 'main' | 'secondary' | null {
  const btnWidth = 160;
  const btnHeight = 44;

  if (result.won) {
    const btnY = WORLD_HEIGHT - 80;
    // NEXT button
    if (x >= WORLD_WIDTH / 2 - btnWidth / 2 && x <= WORLD_WIDTH / 2 + btnWidth / 2 &&
        y >= btnY - btnHeight / 2 && y <= btnY + btnHeight / 2) {
      return 'main';
    }
    // RETRY text
    if (x >= WORLD_WIDTH / 2 - 60 && x <= WORLD_WIDTH / 2 + 60 &&
        y >= btnY + 25 && y <= btnY + 50) {
      return 'secondary';
    }
  } else {
    const centerY = WORLD_HEIGHT / 2 - 60;
    const btnY = centerY + 120;
    // RETRY button
    if (x >= WORLD_WIDTH / 2 - btnWidth / 2 && x <= WORLD_WIDTH / 2 + btnWidth / 2 &&
        y >= btnY - btnHeight / 2 && y <= btnY + btnHeight / 2) {
      return 'main';
    }
    // LEVELS text
    if (x >= WORLD_WIDTH / 2 - 60 && x <= WORLD_WIDTH / 2 + 60 &&
        y >= btnY + 25 && y <= btnY + 50) {
      return 'secondary';
    }
  }

  return null;
}
```

**Step 5: Add score ding audio triggers**

In `Game.ts`, add a field and logic to play dings as ticker lines appear. Add to Game:

```typescript
private lastTickerLineCount = 0;
```

In `renderResultOverlay`, before calling `uiRenderer.renderResult`, add audio triggers:

```typescript
private renderResultOverlay(ctx: CanvasRenderingContext2D) {
  if (!this.result) return;
  const elapsed = this.gameTime - this.resultStartTime;
  const duration = this.result.won ? 3000 : 1000;
  const animProgress = Math.min(elapsed / duration, 1);

  // Play dings as ticker lines appear (wins only)
  if (this.result.won) {
    const lineStartTime = 0.2;
    const lineInterval = 0.1;
    const currentLineCount = Math.floor(Math.max(0, animProgress - lineStartTime) / lineInterval) + 1;
    if (currentLineCount > this.lastTickerLineCount) {
      this.audio.playScoreDing();
      this.lastTickerLineCount = currentLineCount;
    }

    // Flourish when total appears
    const comboLines = this.result.comboEvents.length > 0 ? Object.keys(
      this.result.comboEvents.reduce((acc, e) => ({ ...acc, [e.label]: true }), {} as Record<string, boolean>)
    ).length : 0;
    const totalLines = 1 + comboLines + (this.result.totalScore - this.result.comboScore - (this.result.landingAccuracy > 0.75 ? 50 : 30) > 0 ? 1 : 0);
    const totalTime = lineStartTime + totalLines * lineInterval + 0.1;
    if (animProgress > totalTime && this.lastTickerLineCount < totalLines + 100) {
      this.audio.playScoreFlourish();
      this.lastTickerLineCount = totalLines + 100; // Prevent replaying
    }
  }

  this.uiRenderer.renderResult(ctx, this.result, animProgress);
}
```

Reset `lastTickerLineCount` in `transitionToResult`:

```typescript
this.lastTickerLineCount = 0;
```

**Step 6: Test manually**

- Win a level → score ticker should animate line by line with dings
- Each combo type summarized with point total
- "TOTAL" appears with flourish sound
- "NEW BEST!" in gold or "BEST: X" in gray
- Stars animate below
- NEXT/RETRY buttons appear after ticker completes

**Step 7: Commit**

```bash
git add src/rendering/UIRenderer.ts src/audio/AudioManager.ts src/game/Game.ts
git commit -m "feat: animated score ticker on victory with combo recap"
```

---

### Task 10: Allow Tap-to-Skip on Victory Ticker

Let players tap anywhere during the score ticker to skip to the end.

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/main.ts`

**Step 1: Add skip method to Game**

In `src/game/Game.ts`:

```typescript
skipResultAnimation() {
  if (this.phase === 'RESULT' && this.result?.won) {
    // Jump animation progress to end
    this.resultStartTime = this.gameTime - 3000;
  }
}
```

**Step 2: Handle tap during result in main.ts**

In the RESULT handler in the `pointerdown` event, add a skip check before button handling:

```typescript
if (phase === 'RESULT') {
  const result = game.getResult();
  if (!result) return;

  const worldPos = canvasToWorld(e.clientX, e.clientY);
  const uiRenderer = game.getUIRenderer();
  const button = uiRenderer.getResultButtonTapped(worldPos.x, worldPos.y, result);

  if (button) {
    // Handle button taps (existing logic)
    // ...
  } else {
    // Tap outside buttons — skip animation if still playing
    game.skipResultAnimation();
  }
}
```

**Step 3: Test manually**

- Win a level → tap during score ticker → animation skips to end showing all scores + buttons

**Step 4: Commit**

```bash
git add src/game/Game.ts src/main.ts
git commit -m "feat: tap to skip victory score ticker animation"
```

---

### Task 11: Window Thread Combo Detection

Detect when character passes through window obstacles and award combo points.

**Files:**
- Modify: `src/game/Game.ts`
- Modify: `src/levels/LevelLoader.ts`

**Step 1: Check if window obstacles exist in level data**

Look at `src/game/types.ts` — the `ObstacleConfig` type already has `type: 'window'` and `gapHeight`. In `LevelLoader`, windows are created as two wall bodies with a gap. We need to track which obstacles are windows and detect when the character passes through the gap.

**Step 2: Add window gap tracking**

In `src/game/Game.ts`, track window gap regions for thread detection:

```typescript
// Add field
private windowGaps: { x: number; yTop: number; yBottom: number; passed: boolean }[] = [];
```

In `loadLevel()`, after loading the level, extract window gap positions:

```typescript
// Extract window gap positions for thread detection
this.windowGaps = [];
for (const obs of level.obstacles) {
  if (obs.type === 'window' && obs.gapHeight) {
    const gapCenterY = obs.position.y;
    const halfGap = obs.gapHeight / 2;
    this.windowGaps.push({
      x: obs.position.x,
      yTop: gapCenterY - halfGap,
      yBottom: gapCenterY + halfGap,
      passed: false,
    });
  }
}
```

**Step 3: Detect thread-the-needle in playback**

In the PLAYBACK `fixedUpdate()`, after combo tracking:

```typescript
// Window thread detection
for (const gap of this.windowGaps) {
  if (gap.passed) continue;
  const feetX = feetPos.x;
  // Check if character just crossed the window's x position
  if (Math.abs(feetX - gap.x) < 10) {
    // Check if character is within the gap
    if (feetPos.y > gap.yTop && feetPos.y < gap.yBottom) {
      gap.passed = true;
      const event = this.comboTracker.registerWindowThread({ x: gap.x, y: (gap.yTop + gap.yBottom) / 2 });
      if (event) {
        this.effects.spawnFloatingText(event.position, `+${event.points} ${event.label}!`, this.getComboColor(event.type));
      }
    }
  }
}
```

**Step 4: Test manually**

- Play a level with window obstacles → pass through the gap → should see "+25 THREAD!"

**Step 5: Commit**

```bash
git add src/game/Game.ts
git commit -m "feat: window thread combo detection for passing through gaps"
```

---

### Task 12: Final Integration Testing and Polish

Test all features together and fix any issues.

**Files:**
- All modified files

**Step 1: Full playthrough test**

Run: `npx vite dev`

Test checklist:
- [ ] Ghost line appears on retry, disappears on level change
- [ ] RETRY/NEXT/LEVELS buttons work correctly
- [ ] Near-miss combo triggers with floating text
- [ ] Flip combo triggers when character rotates
- [ ] Speed burst combo triggers on fast sections
- [ ] Window thread combo triggers on window levels
- [ ] Perfect landing combo triggers on center landing
- [ ] Combo multiplier badge appears during active combos
- [ ] Death camera zooms in on impact point
- [ ] Victory pose — arms go up
- [ ] Score ticker reveals line by line with dings
- [ ] "NEW BEST!" shows on new high score
- [ ] Tap to skip score ticker works
- [ ] All buttons respond to taps correctly

**Step 2: Fix any issues found**

Address any bugs or visual glitches.

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: integration testing polish for game feel features"
```
