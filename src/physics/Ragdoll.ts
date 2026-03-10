// src/physics/Ragdoll.ts

import Matter from 'matter-js';
import { JOINT_STIFFNESS, JOINT_STIFFNESS_LOOSE, MOMENTUM_MULTIPLIER } from '../utils/constants';
import { Vector2 } from '../game/types';

export interface RagdollParts {
  head: Matter.Body;
  torso: Matter.Body;
  upperArmL: Matter.Body;
  upperArmR: Matter.Body;
  lowerArmL: Matter.Body;
  lowerArmR: Matter.Body;
  upperLegL: Matter.Body;
  upperLegR: Matter.Body;
  lowerLegL: Matter.Body;
  lowerLegR: Matter.Body;
}

export class Ragdoll {
  parts: RagdollParts;
  constraints: Matter.Constraint[];
  private barConstraintL: Matter.Constraint | null = null;
  private barConstraintR: Matter.Constraint | null = null;
  private isReleased = false;
  private isLoose = false;

  constructor(position: Vector2) {
    const x = position.x;
    const y = position.y;

    const group = Matter.Body.nextGroup(true);
    const commonOptions = {
      collisionFilter: { group },
      frictionAir: 0.02,
      restitution: 0.3,
      density: 0.002,
    };

    // Create body parts relative to hanging position
    // Character hangs from hands, so body is below
    this.parts = {
      head: Matter.Bodies.circle(x, y + 35, 8, { ...commonOptions, label: 'head' }),
      torso: Matter.Bodies.rectangle(x, y + 55, 12, 28, { ...commonOptions, label: 'torso' }),
      upperArmL: Matter.Bodies.rectangle(x - 8, y + 12, 5, 18, { ...commonOptions, label: 'upperArmL' }),
      upperArmR: Matter.Bodies.rectangle(x + 8, y + 12, 5, 18, { ...commonOptions, label: 'upperArmR' }),
      lowerArmL: Matter.Bodies.rectangle(x - 8, y + 2, 4, 16, { ...commonOptions, label: 'lowerArmL' }),
      lowerArmR: Matter.Bodies.rectangle(x + 8, y + 2, 4, 16, { ...commonOptions, label: 'lowerArmR' }),
      upperLegL: Matter.Bodies.rectangle(x - 5, y + 78, 5, 20, { ...commonOptions, label: 'upperLegL' }),
      upperLegR: Matter.Bodies.rectangle(x + 5, y + 78, 5, 20, { ...commonOptions, label: 'upperLegR' }),
      lowerLegL: Matter.Bodies.rectangle(x - 5, y + 98, 4, 18, { ...commonOptions, label: 'lowerLegL' }),
      lowerLegR: Matter.Bodies.rectangle(x + 5, y + 98, 4, 18, { ...commonOptions, label: 'lowerLegR' }),
    };

    const stiffness = JOINT_STIFFNESS;
    this.constraints = [
      // Neck: head to torso
      Matter.Constraint.create({ bodyA: this.parts.head, bodyB: this.parts.torso,
        pointA: { x: 0, y: 8 }, pointB: { x: 0, y: -14 }, stiffness, length: 0 }),
      // Shoulders
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperArmL,
        pointA: { x: -6, y: -12 }, pointB: { x: 0, y: 9 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperArmR,
        pointA: { x: 6, y: -12 }, pointB: { x: 0, y: 9 }, stiffness, length: 0 }),
      // Elbows
      Matter.Constraint.create({ bodyA: this.parts.upperArmL, bodyB: this.parts.lowerArmL,
        pointA: { x: 0, y: -9 }, pointB: { x: 0, y: 8 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.upperArmR, bodyB: this.parts.lowerArmR,
        pointA: { x: 0, y: -9 }, pointB: { x: 0, y: 8 }, stiffness, length: 0 }),
      // Hips
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperLegL,
        pointA: { x: -3, y: 14 }, pointB: { x: 0, y: -10 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.torso, bodyB: this.parts.upperLegR,
        pointA: { x: 3, y: 14 }, pointB: { x: 0, y: -10 }, stiffness, length: 0 }),
      // Knees
      Matter.Constraint.create({ bodyA: this.parts.upperLegL, bodyB: this.parts.lowerLegL,
        pointA: { x: 0, y: 10 }, pointB: { x: 0, y: -9 }, stiffness, length: 0 }),
      Matter.Constraint.create({ bodyA: this.parts.upperLegR, bodyB: this.parts.lowerLegR,
        pointA: { x: 0, y: 10 }, pointB: { x: 0, y: -9 }, stiffness, length: 0 }),
    ];
  }

  getAllBodies(): Matter.Body[] {
    return Object.values(this.parts);
  }

  getAllConstraints(): Matter.Constraint[] {
    return [...this.constraints, ...(this.barConstraintL ? [this.barConstraintL] : []),
      ...(this.barConstraintR ? [this.barConstraintR] : [])];
  }

  attachToBar(barBody: Matter.Body) {
    this.barConstraintL = Matter.Constraint.create({
      bodyA: barBody, bodyB: this.parts.lowerArmL,
      pointA: { x: -4, y: 0 }, pointB: { x: 0, y: -8 },
      stiffness: 1, length: 0,
    });
    this.barConstraintR = Matter.Constraint.create({
      bodyA: barBody, bodyB: this.parts.lowerArmR,
      pointA: { x: 4, y: 0 }, pointB: { x: 0, y: -8 },
      stiffness: 1, length: 0,
    });
  }

  getBarConstraints(): Matter.Constraint[] {
    const result: Matter.Constraint[] = [];
    if (this.barConstraintL) result.push(this.barConstraintL);
    if (this.barConstraintR) result.push(this.barConstraintR);
    return result;
  }

  released(): boolean {
    return this.isReleased;
  }

  release() {
    this.isReleased = true;
    // Bar constraints will be removed externally
    this.barConstraintL = null;
    this.barConstraintR = null;
  }

  goLoose() {
    this.isLoose = true;
    for (const c of this.constraints) {
      c.stiffness = JOINT_STIFFNESS_LOOSE;
    }
  }

  explode(origin: Vector2, force: number) {
    this.isLoose = true;
    this.isReleased = true;
    this.barConstraintL = null;
    this.barConstraintR = null;
    for (const body of this.getAllBodies()) {
      const dx = body.position.x - origin.x;
      const dy = body.position.y - origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force - force * 0.5; // bias upward
      Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
    }
  }

  getBodyConstraints(): Matter.Constraint[] {
    return this.constraints;
  }

  /** Apply cartoon physics forces based on bar velocity */
  applyCartoonPhysics(barVelocity: Vector2) {
    if (this.isReleased) return;

    const speed = Math.sqrt(barVelocity.x ** 2 + barVelocity.y ** 2);
    if (speed < 0.01) return;

    const bodies = this.getAllBodies();
    for (const body of bodies) {
      const label = body.label;
      const isLeg = label.includes('Leg');
      const isLowerArm = label === 'lowerArmL' || label === 'lowerArmR';
      const isTorso = label === 'torso';
      const isHead = label === 'head';

      let forceX: number;
      let forceY: number;

      if (isLeg) {
        // Legs: apply force OPPOSITE to movement to exaggerate trailing
        const factor = MOMENTUM_MULTIPLIER * 0.6;
        forceX = -barVelocity.x * factor * 0.0001;
        forceY = -barVelocity.y * factor * 0.00005;
      } else if (isTorso || isHead) {
        // Torso/head: mild opposing force to trail behind arms
        const factor = MOMENTUM_MULTIPLIER * 0.2;
        forceX = -barVelocity.x * factor * 0.0001;
        forceY = 0;
      } else {
        // Arms: no extra force — they're pulled naturally by bar constraints
        forceX = 0;
        forceY = 0;
      }

      if (forceX !== 0 || forceY !== 0) {
        Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
      }
    }
  }

  getFeetPosition(): Vector2 {
    const footL = this.parts.lowerLegL.position;
    const footR = this.parts.lowerLegR.position;
    return {
      x: (footL.x + footR.x) / 2,
      y: Math.max(footL.y, footR.y),
    };
  }

  getHeadPosition(): Vector2 {
    return { ...this.parts.head.position };
  }

  doVictoryPose() {
    // Arms up in V shape
    const armForce = 0.008;
    Matter.Body.applyForce(this.parts.upperArmL, this.parts.upperArmL.position, { x: -armForce * 0.5, y: -armForce });
    Matter.Body.applyForce(this.parts.upperArmR, this.parts.upperArmR.position, { x: armForce * 0.5, y: -armForce });
    Matter.Body.applyForce(this.parts.lowerArmL, this.parts.lowerArmL.position, { x: -armForce * 0.3, y: -armForce * 0.8 });
    Matter.Body.applyForce(this.parts.lowerArmR, this.parts.lowerArmR.position, { x: armForce * 0.3, y: -armForce * 0.8 });

    // Small hop
    const hopForce = 0.003;
    for (const body of this.getAllBodies()) {
      Matter.Body.applyForce(body, body.position, { x: 0, y: -hopForce });
    }

    // Temporarily stiffen joints so pose holds
    for (const c of this.constraints) {
      c.stiffness = 1.0;
    }
  }

  /** Check if character is roughly upright (for landing) */
  isUpright(): boolean {
    const head = this.parts.head.position;
    const feet = this.getFeetPosition();
    const angle = Math.atan2(head.x - feet.x, feet.y - head.y);
    return Math.abs(angle) < Math.PI / 4;
  }
}
