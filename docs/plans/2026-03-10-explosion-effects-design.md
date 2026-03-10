# Explosion Effects Design

## Overview

Two distinct explosion effects when hitting walls: a glorious bomb-like explosion when the bar hits a wall, and a less dramatic crumble when the character hits a wall directly.

## Bar Hits Wall — Glorious Explosion

### Detection
- Each frame during PLAYBACK, check if the bar's next position intersects any wall body
- When detected, bar stops at the wall surface (no more path traversal)

### Physics
- All 9 ragdoll constraints removed instantly
- Explosive impulse applied to each of the 10 body parts, radiating outward from bar position
- Parts remain physics-active: bounce off walls, fall with gravity

### Visual Effects
- Large particle burst: 60-80 particles in fiery colors (orange, red, yellow)
- Screen flash: brief white overlay fading over ~150ms
- Screen shake: intensity ~20 (current death shake is 8)
- Body parts continue rendering as they fly and tumble

### Haptics
- Phone vibration burst pattern: `[100, 50, 200, 50, 100]` (~500ms total)

### Camera
- Existing death zoom effect centers on the explosion point

## Character Hits Wall — Less Glorious

### Unchanged from current behavior
- `ragdoll.goLoose()` (floppy joints, stiffness 0.8 → 0.1)
- 20 red crash particles
- Screen shake intensity 8
- Death zoom effect
- Thud sound
- Phone vibrate 200ms

### Added
- Break all 9 ragdoll constraints so parts separate and crumple/fall apart
- No extra explosive force — parts just disconnect and tumble down under gravity
