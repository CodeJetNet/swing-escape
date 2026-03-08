import { COLORS, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';
import { GameResult } from '../game/types';

export class UIRenderer {
  renderFuelGauge(ctx: CanvasRenderingContext2D, fraction: number) {
    const barWidth = 200;
    const barHeight = 8;
    const x = WORLD_WIDTH / 2 - barWidth / 2;
    const y = 15;
    ctx.fillStyle = COLORS.fuelGaugeBackground;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = fraction > 0.3 ? COLORS.fuelGauge : '#ff4444';
    ctx.fillRect(x, y, barWidth * fraction, barHeight);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

  renderReady(ctx: CanvasRenderingContext2D, time: number) {
    const alpha = 0.5 + Math.sin(time / 400) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DRAW YOUR PATH!', WORLD_WIDTH / 2, WORLD_HEIGHT - 40);
    ctx.globalAlpha = 1;
  }

  renderResult(ctx: CanvasRenderingContext2D, result: GameResult, animProgress: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const centerY = WORLD_HEIGHT / 2 - 40;
    ctx.textAlign = 'center';
    if (result.won) {
      ctx.fillStyle = COLORS.successParticle;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('LANDED!', WORLD_WIDTH / 2, centerY);
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
    if (animProgress > 0.8) {
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '16px monospace';
      ctx.fillText('Tap to continue', WORLD_WIDTH / 2, centerY + 100);
    }
  }

  renderLevelNumber(ctx: CanvasRenderingContext2D, level: number) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${level}`, 15, 25);
  }
}
