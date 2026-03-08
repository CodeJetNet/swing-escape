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
        this.speedBurstTimer = 0;
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

  getMultiplier(): number {
    return this.multiplier;
  }

  isComboActive(): boolean {
    return this.lastEventTime > 0 && this.currentTime - this.lastEventTime <= COMBO_RESET_MS;
  }
}
