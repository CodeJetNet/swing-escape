// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './utils/constants';
import { Game } from './game/Game';
import { InputHandler } from './game/InputHandler';
import { Vector2 } from './game/types';
import { levels } from './levels/levels';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function getScale() {
  const scaleX = window.innerWidth / WORLD_WIDTH;
  const scaleY = window.innerHeight / WORLD_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (window.innerWidth - WORLD_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - WORLD_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}

function canvasToWorld(clientX: number, clientY: number): Vector2 {
  const { scale, offsetX, offsetY } = getScale();
  return {
    x: (clientX - offsetX) / scale,
    y: (clientY - offsetY) / scale,
  };
}

let currentLevelIndex = 0;

const game = new Game(ctx);
let inputHandler: InputHandler | null = null;

// --- Pointer event handlers ---

canvas.addEventListener('pointerdown', (e) => {
  const phase = game.getPhase();

  if (phase === 'MENU') {
    // Tap to start: load current level and transition to DRAWING
    const level = levels[currentLevelIndex];
    game.loadLevel(level);
    inputHandler = new InputHandler(
      level.startPosition,
      level.maxLineLength,
      canvasToWorld
    );
    inputHandler.setOnDrawingComplete((path) => {
      console.log('Drawing complete, path points:', path.length);
      game.startPlayback(path);
    });
    return;
  }

  if (phase === 'DRAWING' && inputHandler) {
    inputHandler.handlePointerDown(e.clientX, e.clientY);
  }

  if (phase === 'RESULT') {
    // Tap to retry: go back to menu
    game.setPhase('MENU');
    inputHandler = null;
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (game.getPhase() === 'DRAWING' && inputHandler) {
    inputHandler.handlePointerMove(e.clientX, e.clientY);
  }
});

canvas.addEventListener('pointerup', () => {
  if (game.getPhase() === 'DRAWING' && inputHandler) {
    inputHandler.handlePointerUp();
  }
});

// --- Rendering helpers ---

function renderPath(ctx: CanvasRenderingContext2D, path: Vector2[]) {
  if (path.length < 2) return;
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function renderFuelGauge(ctx: CanvasRenderingContext2D, fraction: number) {
  const gaugeWidth = 200;
  const gaugeHeight = 12;
  const x = (WORLD_WIDTH - gaugeWidth) / 2;
  const y = 16;

  // Background
  ctx.fillStyle = COLORS.fuelGaugeBackground;
  ctx.fillRect(x, y, gaugeWidth, gaugeHeight);

  // Fill
  ctx.fillStyle = COLORS.fuelGauge;
  ctx.fillRect(x, y, gaugeWidth * fraction, gaugeHeight);

  // Label
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FUEL', WORLD_WIDTH / 2, y + gaugeHeight + 12);
}

// --- Game loop ---

let lastTime = performance.now();

function loop(time: number) {
  const delta = time - lastTime;
  lastTime = time;

  game.update(delta);

  const { scale, offsetX, offsetY } = getScale();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  game.render();

  // Draw path and fuel gauge during DRAWING phase
  const phase = game.getPhase();
  if ((phase === 'DRAWING' || phase === 'PLAYBACK') && inputHandler) {
    const path = inputHandler.getPath();
    renderPath(ctx, path);
    if (phase === 'DRAWING') {
      renderFuelGauge(ctx, inputHandler.getFuelFraction());
    }
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
