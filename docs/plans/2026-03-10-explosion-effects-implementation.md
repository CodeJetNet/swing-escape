# Explosion Effects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two explosion effects — a glorious bomb explosion when the bar hits a wall, and an enhanced death when the character hits a wall with body parts breaking apart.

**Architecture:** Bar-wall detection via manual AABB check each frame (bar has physics collisions disabled). On detection, bar stops, ragdoll constraints are removed from physics world, and explosive forces scatter body parts. Character-wall death enhanced by also removing constraints so parts crumble apart.

**Tech Stack:** Matter.js physics, Canvas 2D rendering, existing EffectsRenderer particle system

---

### Task 1: Add `explode()` method to Ragdoll

**Files:**
- Modify: `src/physics/Ragdoll.ts:122-128`

**Step 1: Add `explode()` method after `goLoose()`**

Add a new method that marks constraints for removal and applies explosive impulse to all body parts radiating from a given origin point:

```typescript
explode(origin: Vector2, force: number) {
  this.isLoose = true;
  this.isReleased = true;
  this.barConstraintL = null;
  this.barConstraintR = null;
  // Constraints will be removed from physics world externally
  for (const body of this.getAllBodies()) {
    const dx = body.position.x - origin.x;
    const dy = body.position.y - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force - force * 0.5; // bias upward
    Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
    // Add random spin to each part for tumbling effect
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
  }
}
```

**Step 2: Add `getConstraints()` accessor**

Add a method to get just the body constraints (not bar constraints) for external removal:

```typescript
getBodyConstraints(): Matter.Constraint[] {
  return this.constraints;
}
```

**Step 3: Commit**

```bash
git add src/physics/Ragdoll.ts
git commit -m "feat: add explode() method to Ragdoll for body part scattering"
```

---

### Task 2: Add screen flash and bar explosion particles to EffectsRenderer

**Files:**
- Modify: `src/rendering/EffectsRenderer.ts`

**Step 1: Add screen flash state**

Add to class properties (after `slowMotionTimer`):

```typescript
private screenFlashAlpha = 0;
```

**Step 2: Add `spawnBarExplosion()` method**

Add after `spawnCrashParticles()`:

```typescript
spawnBarExplosion(position: Vector2) {
  // Fiery burst: orange, red, yellow particles
  this.spawnParticles(position, 30, '#ff6600', 6);  // orange
  this.spawnParticles(position, 25, '#e94560', 5);  // red
  this.spawnParticles(position, 20, '#ffd700', 4);  // yellow/gold
  this.triggerShake(20);
  this.screenFlashAlpha = 1;
}
```

**Step 3: Update `update()` to decay screen flash**

In the `update()` method, add after slow motion timer block:

```typescript
// Screen flash decay
if (this.screenFlashAlpha > 0) {
  this.screenFlashAlpha -= deltaMs / 150; // fade over 150ms
  if (this.screenFlashAlpha < 0) this.screenFlashAlpha = 0;
}
```

**Step 4: Add `renderScreenFlash()` method**

Add after `render()`:

```typescript
renderScreenFlash(ctx: CanvasRenderingContext2D, width: number, height: number) {
  if (this.screenFlashAlpha > 0) {
    ctx.globalAlpha = this.screenFlashAlpha * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
```

**Step 5: Update `clear()` to reset flash**

Add `this.screenFlashAlpha = 0;` to the `clear()` method.

**Step 6: Commit**

```bash
git add src/rendering/EffectsRenderer.ts
git commit -m "feat: add bar explosion particles and screen flash to EffectsRenderer"
```

---

### Task 3: Add bar-wall collision detection in Game.ts

**Files:**
- Modify: `src/game/Game.ts`

**Step 1: Add `checkBarWallCollision()` method**

Add a private method to Game class that checks if the bar position is inside any wall obstacle's bounds:

```typescript
private checkBarWallCollision(): Vector2 | null {
  if (!this.bar || !this.loadedLevel) return null;
  const barPos = this.bar.body.position;
  const barRadius = 6;

  for (const obs of this.loadedLevel.obstacles) {
    const body = obs.body;
    if (body.label !== 'wall' && body.label !== 'ceiling' && body.label !== 'window') continue;

    // Check against each part (windows have multiple parts)
    const partsToCheck = body.parts.length > 1 ? body.parts.slice(1) : [body];
    for (const part of partsToCheck) {
      const bounds = part.bounds;
      if (barPos.x + barRadius > bounds.min.x &&
          barPos.x - barRadius < bounds.max.x &&
          barPos.y + barRadius > bounds.min.y &&
          barPos.y - barRadius < bounds.max.y) {
        return { x: barPos.x, y: barPos.y };
      }
    }
  }
  return null;
}
```

**Step 2: Call detection in PLAYBACK fixedUpdate**

In `fixedUpdate()`, inside the PLAYBACK case, right after `this.bar.update()` (line ~420), add:

```typescript
// Check if bar hit a wall
const barWallHit = this.checkBarWallCollision();
if (barWallHit) {
  this.handleBarExplosion(barWallHit);
  break;
}
```

**Step 3: Add `handleBarExplosion()` method**

```typescript
private handleBarExplosion(impactPoint: Vector2) {
  if (!this.ragdoll || !this.physicsWorld) return;

  // Remove bar constraints
  for (const constraint of this.ragdoll.getBarConstraints()) {
    this.physicsWorld.removeConstraint(constraint);
  }

  // Remove all body constraints
  for (const constraint of this.ragdoll.getBodyConstraints()) {
    this.physicsWorld.removeConstraint(constraint);
  }

  // Explode ragdoll with strong force
  this.ragdoll.explode(impactPoint, 0.05);

  // Visual effects
  this.effects.spawnBarExplosion(impactPoint);
  this.audio.playThud();
  vibrate([100, 50, 200, 50, 100]);

  // Death zoom
  this.deathZoom = { active: true, progress: 0, targetX: impactPoint.x, targetY: impactPoint.y, phase: 'zoomIn' };
  this.landedOnPad = false;
  this.barConstraintsRemoved = true;
  this.transitionToResult();
}
```

**Step 4: Commit**

```bash
git add src/game/Game.ts
git commit -m "feat: add bar-wall collision detection and glorious bar explosion"
```

---

### Task 4: Enhance character-wall death with constraint breaking

**Files:**
- Modify: `src/game/Game.ts:207-218`

**Step 1: Update wall/ceiling collision handler**

In `setupCollisionHandlers()`, in the wall/ceiling death block, after `this.ragdoll?.goLoose()`, add constraint removal:

```typescript
// Remove bar constraints
if (!this.barConstraintsRemoved) {
  for (const constraint of this.ragdoll!.getBarConstraints()) {
    this.physicsWorld!.removeConstraint(constraint);
  }
  this.ragdoll!.release();
  this.barConstraintsRemoved = true;
}

// Break body apart — remove all body constraints
for (const constraint of this.ragdoll!.getBodyConstraints()) {
  this.physicsWorld!.removeConstraint(constraint);
}
```

Do the same for the lava collision block and the ground/landingPadFloor block.

**Step 2: Commit**

```bash
git add src/game/Game.ts
git commit -m "feat: break ragdoll constraints on character-wall death for crumble effect"
```

---

### Task 5: Render screen flash in main render loop

**Files:**
- Modify: `src/main.ts` (or wherever the main render loop calls `game.render()`)

Need to check where the main render loop is to add the screen flash rendering on top of everything. The flash should render in world coordinates after all other rendering.

**Step 1: Find and update the main render call**

Add screen flash rendering inside `Game.render()` at the end of `renderLevel()`, after drawing the ragdoll:

In `Game.ts` `renderLevel()` method, add at the end:

```typescript
// Screen flash overlay
this.effects.renderScreenFlash(ctx, WORLD_WIDTH, WORLD_HEIGHT);
```

**Step 2: Commit**

```bash
git add src/game/Game.ts
git commit -m "feat: render screen flash overlay on bar explosion"
```

---

### Task 6: Playtest and tune explosion parameters

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Test bar explosion**

- Draw a path that sends the bar into a wall
- Verify: bar stops, body parts fly everywhere with physics, fiery particles burst, screen flashes white, strong screen shake, phone vibrates (if on phone)

**Step 3: Test character explosion**

- Draw a path where the character (not bar) hits a wall
- Verify: existing death effects plus body parts disconnect and crumple/fall

**Step 4: Tune parameters if needed**

- Explosion force (`0.05`) — adjust if parts fly too far or not far enough
- Particle counts (30+25+20=75 total) — adjust for visual density
- Screen shake intensity (20) — adjust if too much or too little
- Flash duration (150ms) — adjust if too long or too short
- Angular velocity range (0.3) — adjust tumbling speed

**Step 5: Commit any tuning changes**

```bash
git add -A
git commit -m "tune: adjust explosion parameters after playtesting"
```
