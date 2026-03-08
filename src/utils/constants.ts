// src/utils/constants.ts

// Physics
export const PHYSICS_FPS = 60;
export const PHYSICS_TIMESTEP = 1000 / PHYSICS_FPS;
export const GRAVITY = 1;

// World dimensions (logical coordinates, scaled to canvas)
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;

// Character
export const BAR_SPEED = 3; // pixels per physics frame along path
export const RAGDOLL_SCALE = 1;
export const STRETCH_FACTOR = 1.3; // max arm stretch at high speed
export const MOMENTUM_MULTIPLIER = 1.5; // cartoon exaggeration
export const JOINT_STIFFNESS = 0.8;
export const JOINT_STIFFNESS_LOOSE = 0.1; // on death

// Path drawing
export const MIN_SEGMENT_LENGTH = 5; // min distance between path points
export const PATH_SMOOTHING = 0.3; // smoothing factor (0 = none, 1 = max)
export const DEFAULT_MAX_LINE_LENGTH = 1200;

// Game feel
export const SCREEN_SHAKE_DECAY = 0.9;
export const SLOW_MOTION_DURATION = 300; // ms
export const SLOW_MOTION_FACTOR = 0.3;
export const TRAIL_LENGTH = 20;
export const TRAIL_FADE_RATE = 0.05;

// Landing
export const LANDING_TOLERANCE_ANGLE = Math.PI / 4; // 45 degrees from upright
export const LANDING_PAD_BOUNCE = 0.2;

// Colors
export const COLORS = {
  background: '#1a1a2e',
  bar: '#e94560',
  character: '#f5f5f5',
  characterOutline: '#333333',
  path: '#0f3460',
  pathGhost: 'rgba(15, 52, 96, 0.4)',
  fuelGauge: '#e94560',
  fuelGaugeBackground: 'rgba(255, 255, 255, 0.15)',
  wall: '#16213e',
  wallOutline: '#0f3460',
  lava: '#e94560',
  lavaGlow: 'rgba(233, 69, 96, 0.3)',
  landingPad: '#53d769',
  landingPadTarget: '#3aaf4c',
  text: '#f5f5f5',
  textSecondary: 'rgba(245, 245, 245, 0.6)',
  star: '#ffd700',
  starEmpty: 'rgba(255, 215, 0, 0.2)',
  particle: '#e94560',
  successParticle: '#53d769',
} as const;
