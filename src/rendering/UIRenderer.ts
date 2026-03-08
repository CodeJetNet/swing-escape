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
      const lineStartTime = 0.2;
      const lineInterval = 0.1;

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

      // Total line
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

      // Buttons after ticker complete
      const buttonsTime = totalTime + 0.15;
      if (animProgress > buttonsTime) {
        const btnY = WORLD_HEIGHT - 80;
        const btnWidth = 160;
        const btnHeight = 44;

        ctx.fillStyle = COLORS.successParticle;
        ctx.fillRect(WORLD_WIDTH / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight);
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT', WORLD_WIDTH / 2, btnY + 7);

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

  renderLevelNumber(ctx: CanvasRenderingContext2D, level: number) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${level}`, 15, 25);
  }

  renderLevelSelect(
    ctx: CanvasRenderingContext2D,
    levels: { id: number; stars: number; unlocked: boolean }[],
    endlessModeUnlocked: boolean
  ) {
    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT LEVEL', WORLD_WIDTH / 2, 60);

    // Grid of level boxes (5 columns)
    const cols = 5;
    const boxSize = 60;
    const gap = 15;
    const gridWidth = cols * boxSize + (cols - 1) * gap;
    const startX = (WORLD_WIDTH - gridWidth) / 2;
    const startY = 100;

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (boxSize + gap);
      const y = startY + row * (boxSize + gap + 10);

      if (level.unlocked) {
        // Unlocked level box
        ctx.fillStyle = '#16213e';
        ctx.fillRect(x, y, boxSize, boxSize);
        ctx.strokeStyle = COLORS.wallOutline;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, boxSize, boxSize);

        // Level number
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${level.id}`, x + boxSize / 2, y + 25);

        // Stars (small, below number)
        for (let s = 0; s < 3; s++) {
          const starX = x + boxSize / 2 + (s - 1) * 14;
          ctx.fillStyle = s < level.stars ? COLORS.star : COLORS.starEmpty;
          ctx.font = '12px monospace';
          ctx.fillText(s < level.stars ? '\u2605' : '\u2606', starX, y + 48);
        }
      } else {
        // Locked level (dark silhouette)
        ctx.fillStyle = 'rgba(22, 33, 62, 0.4)';
        ctx.fillRect(x, y, boxSize, boxSize);
        ctx.strokeStyle = 'rgba(15, 52, 96, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, boxSize, boxSize);

        // Lock icon (simple text)
        ctx.fillStyle = 'rgba(245, 245, 245, 0.2)';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\uD83D\uDD12', x + boxSize / 2, y + 35);
      }
    }

    // Back button
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('< Back', 20, 40);
  }

  getLevelAtPosition(
    x: number, y: number,
    levelCount: number
  ): number | null {
    const cols = 5;
    const boxSize = 60;
    const gap = 15;
    const gridWidth = cols * boxSize + (cols - 1) * gap;
    const startX = (WORLD_WIDTH - gridWidth) / 2;
    const startY = 100;

    for (let i = 0; i < levelCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (boxSize + gap);
      const by = startY + row * (boxSize + gap + 10);

      if (x >= bx && x <= bx + boxSize && y >= by && y <= by + boxSize) {
        return i;
      }
    }
    return null;
  }

  getResultButtonTapped(
    x: number, y: number, result: GameResult
  ): 'main' | 'secondary' | null {
    const btnWidth = 160;
    const btnHeight = 44;

    if (result.won) {
      const btnY = WORLD_HEIGHT - 80;
      if (x >= WORLD_WIDTH / 2 - btnWidth / 2 && x <= WORLD_WIDTH / 2 + btnWidth / 2 &&
          y >= btnY - btnHeight / 2 && y <= btnY + btnHeight / 2) {
        return 'main';
      }
      if (x >= WORLD_WIDTH / 2 - 60 && x <= WORLD_WIDTH / 2 + 60 &&
          y >= btnY + 25 && y <= btnY + 50) {
        return 'secondary';
      }
    } else {
      const centerY = WORLD_HEIGHT / 2 - 60;
      const btnY = centerY + 120;
      if (x >= WORLD_WIDTH / 2 - btnWidth / 2 && x <= WORLD_WIDTH / 2 + btnWidth / 2 &&
          y >= btnY - btnHeight / 2 && y <= btnY + btnHeight / 2) {
        return 'main';
      }
      if (x >= WORLD_WIDTH / 2 - 60 && x <= WORLD_WIDTH / 2 + 60 &&
          y >= btnY + 25 && y <= btnY + 50) {
        return 'secondary';
      }
    }

    return null;
  }

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

  isBackButtonTapped(x: number, y: number): boolean {
    return x < 100 && y < 60;
  }
}
