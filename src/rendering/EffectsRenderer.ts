import { Vector2 } from '../game/types';
import { COLORS, TRAIL_LENGTH, SCREEN_SHAKE_DECAY } from '../utils/constants';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

export class EffectsRenderer {
  private trail: Vector2[] = [];
  private particles: Particle[] = [];
  private shakeIntensity = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private slowMotionTimer = 0;

  getShakeOffset(): Vector2 { return { x: this.shakeOffsetX, y: this.shakeOffsetY }; }
  getTimeScale(): number { return this.slowMotionTimer > 0 ? 0.3 : 1; }

  addTrailPoint(point: Vector2) {
    this.trail.push({ ...point });
    if (this.trail.length > TRAIL_LENGTH) this.trail.shift();
  }

  triggerShake(intensity: number) { this.shakeIntensity = intensity; }
  triggerSlowMotion(durationMs: number) { this.slowMotionTimer = durationMs; }

  spawnParticles(position: Vector2, count: number, color: string, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: position.x, y: position.y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 1,
        life: 1, maxLife: 1, color, size: 2 + Math.random() * 3,
      });
    }
  }

  spawnLandingBurst(position: Vector2, stars: number) {
    const count = stars * 12;
    this.spawnParticles(position, count, COLORS.successParticle, 3 + stars);
    if (stars >= 2) this.spawnParticles(position, 8, COLORS.star, 4);
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

    // Slow motion timer
    if (this.slowMotionTimer > 0) this.slowMotionTimer -= deltaMs;

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.1; // gravity
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

  clearTrail() { this.trail = []; }
  clear() {
    this.trail = [];
    this.particles = [];
    this.shakeIntensity = 0;
    this.slowMotionTimer = 0;
  }
}
