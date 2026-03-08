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
        ctx.fillStyle = COLORS.lava;
        ctx.fillRect(obs.position.x, obs.position.y, obs.width, obs.height);
        // Animated bubbles
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
        ctx.fillStyle = COLORS.wall;
        ctx.strokeStyle = COLORS.wallOutline;
        ctx.lineWidth = 2;
        ctx.fillRect(obs.position.x, 0, obs.width, obs.position.y);
        ctx.strokeRect(obs.position.x, 0, obs.width, obs.position.y);
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
