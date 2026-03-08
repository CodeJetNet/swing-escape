// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './utils/constants';
import { Game } from './game/Game';
import { InputHandler } from './game/InputHandler';
import { LevelConfig, Vector2 } from './game/types';
import { levels } from './levels/levels';
import { LevelGenerator } from './levels/LevelGenerator';
import { GameState } from './state/GameState';

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());

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

function getLevel(id: number): LevelConfig {
  if (id <= levels.length) {
    return levels[id - 1];
  }
  return LevelGenerator.generate(id, id - levels.length);
}

const game = new Game(ctx);
game.setGameState(gameState);
let inputHandler: InputHandler | null = null;
let audioInitialized = false;

function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function loadCurrentLevel() {
  const levelId = currentLevelIndex + 1;
  const level = getLevel(levelId);
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
  // Initialize audio on first user gesture
  if (!audioInitialized) {
    game.initAudio();
    audioInitialized = true;
  }

  const phase = game.getPhase();

  if (phase === 'MENU') {
    // Tap to go to level select
    game.setPhase('LEVEL_SELECT');
    return;
  }

  if (phase === 'LEVEL_SELECT') {
    const worldPos = canvasToWorld(e.clientX, e.clientY);
    const uiRenderer = game.getUIRenderer();

    if (uiRenderer.isBackButtonTapped(worldPos.x, worldPos.y)) {
      game.setPhase('MENU');
      return;
    }

    const totalLevels = Math.max(levels.length, gameState.getCurrentLevel());
    const tappedIndex = uiRenderer.getLevelAtPosition(worldPos.x, worldPos.y, totalLevels);
    if (tappedIndex !== null) {
      const levelId = tappedIndex + 1;
      // Only allow unlocked levels
      if (levelId <= gameState.getCurrentLevel()) {
        currentLevelIndex = tappedIndex;
        const level = getLevel(levelId);
        game.transitionToLevel(level);
        inputHandler = new InputHandler(
          level.startPosition,
          level.maxLineLength,
          canvasToWorld
        );
        inputHandler.setOnDrawingComplete((path) => {
          game.startPlayback(path);
        });
      }
    }
    return;
  }

  if (phase === 'DRAWING' && inputHandler) {
    inputHandler.handlePointerDown(e.clientX, e.clientY);
  }

  if (phase === 'RESULT') {
    const result = game.getResult();
    if (!result) return;

    const worldPos = canvasToWorld(e.clientX, e.clientY);
    const uiRenderer = game.getUIRenderer();
    const button = uiRenderer.getResultButtonTapped(worldPos.x, worldPos.y, result);

    if (!button) {
      game.skipResultAnimation();
      return;
    }

    const levelId = currentLevelIndex + 1;

    if (result.won) {
      gameState.completeLevel(levelId, result.stars);
      if (button === 'main') {
        // NEXT level
        currentLevelIndex++;
        const nextLevel = getLevel(currentLevelIndex + 1);
        game.transitionToLevel(nextLevel);
        inputHandler = new InputHandler(nextLevel.startPosition, nextLevel.maxLineLength, canvasToWorld);
        inputHandler.setOnDrawingComplete((path) => game.startPlayback(path));
      } else {
        // RETRY same level
        const level = getLevel(levelId);
        game.transitionToLevel(level);
        inputHandler = new InputHandler(level.startPosition, level.maxLineLength, canvasToWorld);
        inputHandler.setOnDrawingComplete((path) => game.startPlayback(path));
      }
    } else {
      if (button === 'main') {
        // RETRY
        const level = getLevel(levelId);
        game.transitionToLevel(level);
        inputHandler = new InputHandler(level.startPosition, level.maxLineLength, canvasToWorld);
        inputHandler.setOnDrawingComplete((path) => game.startPlayback(path));
      } else {
        // LEVELS
        game.setPhase('LEVEL_SELECT');
        inputHandler = null;
      }
    }
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (game.getPhase() === 'DRAWING' && inputHandler) {
    const pathBefore = inputHandler.getPath().length;
    inputHandler.handlePointerMove(e.clientX, e.clientY);
    // Haptic feedback when new path points are added
    if (inputHandler.getPath().length > pathBefore) {
      vibrate(10);
    }
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

  const deathZoom = game.getDeathZoom();
  if (deathZoom.active) {
    const zs = deathZoom.scale;
    ctx.translate(deathZoom.targetX, deathZoom.targetY);
    ctx.scale(zs, zs);
    ctx.translate(-deathZoom.targetX, -deathZoom.targetY);
  }

  game.render();

  // Draw ghost path and active path during DRAWING and PLAYBACK phases
  const phase = game.getPhase();
  if ((phase === 'DRAWING' || phase === 'PLAYBACK')) {
    const ghostPath = game.getGhostPath();
    if (ghostPath.length > 1) {
      ctx.strokeStyle = COLORS.pathGhost;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(ghostPath[0].x, ghostPath[0].y);
      for (let i = 1; i < ghostPath.length; i++) {
        ctx.lineTo(ghostPath[i].x, ghostPath[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if ((phase === 'DRAWING' || phase === 'PLAYBACK') && inputHandler) {
    const path = inputHandler.getPath();
    renderPath(ctx, path);
  }

  ctx.restore();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
