// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT, COLORS } from './utils/constants';
import { Game } from './game/Game';

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

const game = new Game(ctx);

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

  ctx.restore();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
