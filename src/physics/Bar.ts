// src/physics/Bar.ts

import Matter from 'matter-js';
import { Vector2 } from '../game/types';
import { BAR_SPEED } from '../utils/constants';
import { distance } from '../utils/math';

export class Bar {
  body: Matter.Body;
  private path: Vector2[] = [];
  private pathIndex = 0;
  private distanceAlongSegment = 0;
  private finished = false;
  private velocity: Vector2 = { x: 0, y: 0 };

  constructor(position: Vector2) {
    this.body = Matter.Bodies.circle(position.x, position.y, 6, {
      isStatic: true,
      label: 'bar',
      collisionFilter: { category: 0 },
    });
  }

  setPath(path: Vector2[]) {
    this.path = path;
    this.pathIndex = 0;
    this.distanceAlongSegment = 0;
    this.finished = false;
  }

  isFinished(): boolean { return this.finished; }
  getVelocity(): Vector2 { return this.velocity; }

  update() {
    if (this.finished || this.path.length < 2) return;

    const from = this.path[this.pathIndex];
    const to = this.path[this.pathIndex + 1];
    if (!to) {
      this.finished = true;
      this.velocity = { x: 0, y: 0 };
      return;
    }

    const segLength = distance(from, to);
    this.distanceAlongSegment += BAR_SPEED;

    if (this.distanceAlongSegment >= segLength) {
      this.distanceAlongSegment -= segLength;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        this.finished = true;
        const lastFrom = this.path[this.path.length - 2];
        const lastTo = this.path[this.path.length - 1];
        const d = distance(lastFrom, lastTo);
        if (d > 0) {
          this.velocity = {
            x: ((lastTo.x - lastFrom.x) / d) * BAR_SPEED,
            y: ((lastTo.y - lastFrom.y) / d) * BAR_SPEED,
          };
        }
        Matter.Body.setPosition(this.body, this.path[this.path.length - 1]);
        return;
      }
    }

    const t = segLength > 0 ? this.distanceAlongSegment / segLength : 0;
    const currentFrom = this.path[this.pathIndex];
    const currentTo = this.path[this.pathIndex + 1];
    if (!currentTo) {
      this.finished = true;
      return;
    }

    const newPos = {
      x: currentFrom.x + (currentTo.x - currentFrom.x) * t,
      y: currentFrom.y + (currentTo.y - currentFrom.y) * t,
    };

    const prevPos = this.body.position;
    this.velocity = {
      x: newPos.x - prevPos.x,
      y: newPos.y - prevPos.y,
    };

    Matter.Body.setPosition(this.body, newPos);
  }
}
