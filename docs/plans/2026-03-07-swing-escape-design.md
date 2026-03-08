# Swing Escape — Game Design Document

## Overview

Swing Escape is a browser-based physics puzzle game where the player draws a path, then watches their ragdoll character swing along it, dodge obstacles, and attempt to land on a target pad. Mobile-first with laptop support.

## Core Game Loop

### Drawing Phase
- Player sees the level: character hanging from a bar (dot) on the left, obstacles in the middle, landing pad on the right
- Touch/click anywhere to begin drawing a freehand path — line always starts from the bar
- Constraints: no going backward (left), limited line length (fuel gauge), path is smoothed to reduce jitter
- Ghost preview shows the line from the bar while drawing
- Lift finger / release mouse to confirm the path

### Playback Phase
- The bar follows the drawn path at a consistent speed
- Character hangs from the bar as a ragdoll with cartoon-physics reactions:
  - Forward movement: body trails behind, mostly hanging down
  - Downward movement: body goes horizontal
  - Upward swing: body swings forward with exaggerated momentum
- At end of path, character releases and flies as a free ragdoll

### Resolution
- **Win:** Character lands on the landing pad (within tolerance)
- **Lose:** Hits obstacle, touches lava, misses pad, or lands badly
- Star rating (1-3) based on line efficiency and landing quality

## Character Physics (Hybrid Approach)

### Matter.js Foundation
- Ragdoll made of connected rigid bodies: head, torso, upper arms, lower arms, upper legs, lower legs
- Joints use Matter.js constraints with tuned stiffness
- Collision detection handled entirely by Matter.js

### Cartoon Physics Overrides
- **Stretch factor:** Arms elongate slightly at high speed (squash-and-stretch), snap back when speed decreases
- **Exaggerated momentum:** Body swings further than realistic — multiplied angular forces during direction changes
- **Delayed reaction:** Body parts react with stagger (hands, torso, legs) creating a whip-like effect
- **Landing squash:** On impact, character compresses vertically and expands horizontally briefly
- **Ragdoll on failure:** Joints loosen dramatically for comical flop

### Bar Connection
- Hands pinned to bar via stiff constraint
- At end of path, constraint removed — character inherits bar velocity as free-flying ragdoll
- Release angle and speed determine launch trajectory

## Obstacles & Level Elements

- **Walls** — Solid rectangles to go over or around
- **Lava/spikes** — Ground hazards, instant death, animated glow
- **Windows/gaps** — Openings in walls; short ones require flipping sideways
- **Ceilings** — Force threading through tight vertical spaces
- **Moving platforms** — Walls that slide up/down on a timer (later levels)
- **Breakable barriers** — Thin walls that break at sufficient momentum

### Landing Pad
- Always on right side
- Target zone: center = 3 stars, edges = 1 star
- Visual: flat platform with bullseye pattern
- Can be elevated, ground-level, or below start height

### Level Format (JSON)
- Start position (bar location)
- Max line length (fuel budget)
- Array of obstacles: type, position, size, behavior
- Landing pad position and size
- Par line length for star rating

## Level Progression

### Hand-Crafted Levels (1-25)
- **1-3:** Tutorial. Just swing and land. No obstacles.
- **4-7:** Introduce walls. Go over them.
- **8-11:** Introduce lava. Must keep altitude.
- **12-15:** Introduce windows/gaps. Must time body position.
- **16-19:** Combine obstacles. Wall + lava, gap + lava.
- **20-22:** Introduce ceilings. Thread through tight corridors.
- **23-25:** Moving platforms and breakable barriers. Full complexity.

### Procedural Endless Mode (Level 26+)
- Algorithm picks from all obstacle types
- Difficulty increases per level: more obstacles, tighter gaps, smaller pads, shorter line budget
- Each generated level validated for solvability (simulated solution path)
- Difficulty flattens slightly every 10 levels for breathing room

### Local State (localStorage)
- Current level unlocked
- Star rating per level (best attempt)
- Total stars earned
- Endless mode high score (highest level reached)

### Progression UX
- Level select screen with star ratings
- Locked levels shown as silhouettes
- Next level unlocks on 1+ star completion
- Endless mode unlocks after level 25

## Juice & Game Feel

### Visual Effects
- **Swing trail** — Fading line behind character's feet, color shifts with speed
- **Speed lines** — Radial lines at high velocity
- **Screen shake** — On crash, scaled to impact force
- **Slow-motion** — 0.3s slowdown on tight gap passes (near-miss)
- **Landing burst** — Particle explosion on success, scales with star rating
- **Splat/ragdoll** — Comical death animation with particles
- **Camera zoom** — Slight zoom during release/flight phase

### Sound (Web Audio API, Synthesized)
- Whoosh while swinging (pitch scales with speed)
- Thud on crash
- Splat on lava
- Glass shatter on breakable barriers
- Triumphant chime on landing
- Star collection dings
- Ambient hum during drawing, tempo increase during playback

### UI Polish
- Animated fuel gauge while drawing
- "READY" pulse before drawing starts
- Bouncing replay button on failure
- Stars fly in one at a time on success
- Level transitions: fade to black, slide in

### Haptic Feedback (Mobile)
- Light vibration while drawing
- Strong pulse on crash
- Pattern buzz on successful landing

## Technical Architecture

### Tech Stack
- TypeScript
- HTML Canvas 2D — rendering
- Matter.js — physics engine
- Web Audio API — synthesized sounds
- Vite — dev server + bundler
- localStorage — state persistence

### Code Structure
```
src/
  main.ts              — Entry point, canvas + game init
  game/
    Game.ts            — Main game loop (update/render)
    InputHandler.ts    — Touch/mouse input, path recording
    PathValidator.ts   — Constraints (no backward, length limit, smoothing)
  physics/
    PhysicsWorld.ts    — Matter.js world setup and step
    Ragdoll.ts         — Character body, joints, cartoon overrides
    Bar.ts             — Bar that follows drawn path
  rendering/
    Renderer.ts        — Canvas 2D drawing orchestration
    CharacterRenderer.ts
    ObstacleRenderer.ts
    EffectsRenderer.ts — Particles, trails, screen shake
    UIRenderer.ts      — HUD, fuel gauge, stars
  levels/
    LevelLoader.ts     — Parse level JSON, build physics bodies
    LevelGenerator.ts  — Procedural generation for endless mode
    levels.json        — Hand-crafted level definitions
  audio/
    AudioManager.ts    — Web Audio API synthesized sounds
  state/
    GameState.ts       — localStorage persistence, progression
  utils/
    math.ts            — Vector math, interpolation
    constants.ts       — Tuning values (gravity, stretch, speeds)
```

### Game Loop
- Fixed timestep physics (60fps), variable render
- State machine: MENU -> DRAWING -> PLAYBACK -> RESULT -> MENU
- RequestAnimationFrame for smooth rendering
- Responsive canvas fills viewport, scales to device

### Mobile Considerations
- Touch events with passive listeners
- Viewport meta tag to prevent zoom/bounce
- CSS prevents text selection and context menus
- Canvas resolution matched to devicePixelRatio for retina
