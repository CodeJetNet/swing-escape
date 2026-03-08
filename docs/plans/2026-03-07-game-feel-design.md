# Swing Escape — Game Feel & Addiction Improvements Design

## Research Summary

Based on analysis of addictive physics games (Angry Birds, Cut the Rope, Stickman Hook, Getting Over It), the key principles that drive "one more try" behavior are:

1. **Zero-friction restart** — Instant retry with no menu navigation
2. **Learning from failure** — Ghost replays, visual feedback on what went wrong
3. **Layered scoring** — Multiple motivators beyond just completion (combos, style points)
4. **Satisfying death** — Funny/entertaining failure reduces frustration
5. **Disproportionate celebration** — Wins must feel like a party
6. **Flow state** — Balanced difficulty with clear, achievable micro-goals

Sources:
- [Addictive Game Mechanics Guide](https://mainleaf.com/the-definitive-guide-to-addictive-game-mechanics/)
- [Psychology Behind Gaming Addiction](https://sdlccorp.com/post/what-makes-a-game-addictive-the-psychology-behind-gaming/)
- [Creating Addictive Game Loops](https://blog.gametion.com/2024/10/creating-addictive-game-loops-for-engaging-gaming-experiences/)
- [How to Create a Game Like Stickman Hook](https://www.abtach.ae/blog/how-to-create-a-game-like-stickman-hook/)
- [Quick Restarts Keep Players Involved](https://game-design-snacks.fandom.com/wiki/Quick_restarts_keep_the_player_involved.)

---

## Feature 1: Zero-Friction Retry Flow

### On Death
- Ragdoll flops with quick camera zoom into impact point (0.3s zoom in, 0.4s hold, 0.3s zoom out)
- Two buttons appear immediately after: large RETRY (center), small LEVELS (corner)
- RETRY instantly reloads the same level with a quick fade

### On Win
- Character does victory pose, score ticker rolls in
- Two buttons: large NEXT and small RETRY (for score chasers)

### Ghost Line
- On retry, previous attempt's drawn path renders as faint ghost line
- Clears when you start drawing a new path
- Resets on level change

## Feature 2: Combo System

### Combo Events
- Near-miss (+10): Character passes within 15px of obstacle
- Window thread (+25): Character passes through a window/gap
- Flip (+15): Head goes below feet and back up (full rotation)
- Speed burst (+5): Bar velocity exceeds threshold for sustained period
- Perfect landing (+30): Land within center 25% of landing pad

### Combo Multiplier
- Each event within 1s of previous increases multiplier (x2, x3, max x5)
- Multiplier resets after 1.5s with no event
- Applies to next event's points

### Visual Feedback
- Floating text popup at event location ("+10 NEAR MISS!", "+25x2 THREAD!")
- Text floats up and fades over 0.8s
- Color coded by event type
- Small combo multiplier badge in corner during active combos

### Score Calculation
- Final score = combo points + landing bonus + efficiency bonus
- Best score per level saved to localStorage
- Stars remain based on line efficiency (unchanged)

## Feature 3: Death Camera & Death Counter

### Impact Zoom
- On death, zoom camera to 1.5x centered on impact point over 0.3s
- Hold 0.4s while ragdoll flops
- Zoom back out over 0.3s
- ~1 second total before buttons appear
- Implemented via canvas scale/translate interpolation in render loop

### Death Counter
- Persistent total deaths in localStorage
- Displayed as small text in top-right during DRAWING/PLAYBACK: "Deaths: 47"
- On death, counter increments with brief pulse animation
- Also tracked per-level in GameState

## Feature 4: Victory Celebration

### Victory Pose (immediate on landing)
- Apply upward impulse to arms (shoot up in V shape)
- Small upward force on whole body (hop)
- Briefly increase joint stiffness so pose holds ~1s
- Existing particle burst and chime play simultaneously

### Score Ticker (starts 0.5s after landing)
- Semi-transparent overlay panel at center
- Each line pops in with ding, 0.3s apart:
  - "Landing: +50" (or +30 for edge)
  - Combo events earned
  - "Efficiency: +20"
  - Divider
  - "TOTAL: 145" (large, flourish sound)
  - "BEST: 180" or "NEW BEST!" in gold
- Stars animate below total
- NEXT/RETRY buttons after ticker completes
- Tap to skip at any point
- Full celebration ~3 seconds
