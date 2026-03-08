// src/main.ts

import { WORLD_WIDTH, WORLD_HEIGHT } from './utils/constants';

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

// Compute scale to fit WORLD_WIDTH x WORLD_HEIGHT into viewport
function getScale(): { scale: number; offsetX: number; offsetY: number } {
  const scaleX = window.innerWidth / WORLD_WIDTH;
  const scaleY = window.innerHeight / WORLD_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (window.innerWidth - WORLD_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - WORLD_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}

function render() {
  const { scale, offsetX, offsetY } = getScale();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Placeholder: draw background and a test circle for the bar
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(100, 150, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f5f5';
  ctx.font = '24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Swing Escape', WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  ctx.font = '14px monospace';
  ctx.fillText('Touch anywhere to draw a path', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 30);

  ctx.restore();
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
