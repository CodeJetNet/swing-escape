// src/physics/PhysicsWorld.ts

import Matter from 'matter-js';
import { GRAVITY, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';

export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY, scale: 0.001 },
    });
    this.world = this.engine.world;

    // Ground below visible area as fallback
    const ground = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2, WORLD_HEIGHT + 50,
      WORLD_WIDTH * 2, 100,
      { isStatic: true, label: 'ground' }
    );
    Matter.Composite.add(this.world, ground);
  }

  step(delta: number) {
    Matter.Engine.update(this.engine, delta);
  }

  addBody(body: Matter.Body) {
    Matter.Composite.add(this.world, body);
  }

  addConstraint(constraint: Matter.Constraint) {
    Matter.Composite.add(this.world, constraint);
  }

  removeBody(body: Matter.Body) {
    Matter.Composite.remove(this.world, body);
  }

  removeConstraint(constraint: Matter.Constraint) {
    Matter.Composite.remove(this.world, constraint);
  }

  clear() {
    Matter.Composite.clear(this.world, false);
  }
}
