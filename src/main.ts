// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './utils/constants';
import { Game } from './game/Game';
import { InputHandler } from './game/InputHandler';
import { Vector2 } from './game/types';
import { levels } from './levels/levels';
import { GameState } from './state/GameState';

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

const gameState = new GameState();
let currentLevelIndex = gameState.getCurrentLevel() - 1;

const game = new Game(ctx);
let inputHandler: InputHandler | null = null;

function loadCurrentLevel() {
  // Clamp to available levels
  if (currentLevelIndex >= levels.length) {
    currentLevelIndex = levels.length - 1;
  }
  const level = levels[currentLevelIndex];
  game.loadLevel(level);
  inputHandler = new InputHandler(
    level.startPosition,
    level.maxLineLength,
    canvasToWorld
  );
  inputHandler.setOnDrawingComplete((path) => {
    game.startPlayback(path);
  });
}

// --- Pointer event handlers ---

canvas.addEventListener('pointerdown', (e) => {
  const phase = game.getPhase();

  if (phase === 'MENU') {
    // Tap to start: load current level and transition to DRAWING
    loadCurrentLevel();
    return;
  }

  if (phase === 'DRAWING' && inputHandler) {
    inputHandler.handlePointerDown(e.clientX, e.clientY);
  }

  if (phase === 'RESULT') {
    const result = game.getResult();
    if (result && result.won) {
      // Save progress and advance to next level
      const level = levels[currentLevelIndex];
      gameState.completeLevel(level.id, result.stars);
      currentLevelIndex++;
      if (currentLevelIndex >= levels.length) {
        // All levels complete, go back to menu
        currentLevelIndex = 0;
        game.setPhase('MENU');
        inputHandler = null;
      } else {
        loadCurrentLevel();
      }
    } else {
      // Lose: retry same level
      loadCurrentLevel();
    }
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

// --- Game loop ---

let lastTime = performance.now();

function loop(time: number) {
  const delta = time - lastTime;
  lastTime = time;

  // Pass fuel fraction to game for UI rendering
  if (inputHandler && game.getPhase() === 'DRAWING') {
    game.setFuelFraction(inputHandler.getFuelFraction());
  }

  game.update(delta);

  const { scale, offsetX, offsetY } = getScale();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  const shake = game.getEffects().getShakeOffset();
  ctx.translate(offsetX + shake.x, offsetY + shake.y);
  ctx.scale(scale, scale);

  game.render();

  // Draw path during DRAWING and PLAYBACK phases
  const phase = game.getPhase();
  if ((phase === 'DRAWING' || phase === 'PLAYBACK') && inputHandler) {
    const path = inputHandler.getPath();
    renderPath(ctx, path);
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
