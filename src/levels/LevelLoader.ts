import Matter from 'matter-js';
import { LevelConfig, ObstacleConfig } from '../game/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { WORLD_HEIGHT } from '../utils/constants';

export interface LoadedLevel {
  obstacles: { config: ObstacleConfig; body: Matter.Body }[];
  landingPadBody: Matter.Body;
}

export class LevelLoader {
  static load(level: LevelConfig, physicsWorld: PhysicsWorld): LoadedLevel {
    const obstacles: LoadedLevel['obstacles'] = [];

    for (const obs of level.obstacles) {
      const body = LevelLoader.createObstacleBody(obs);
      physicsWorld.addBody(body);
      obstacles.push({ config: obs, body });
    }

    // Landing pad sensor
    const pad = level.landingPad;
    const landingPadBody = Matter.Bodies.rectangle(
      pad.position.x + pad.width / 2,
      pad.position.y + 4,
      pad.width, 8,
      { isStatic: true, label: 'landingPad', isSensor: true }
    );
    physicsWorld.addBody(landingPadBody);

    // Floor under landing pad (solid so character can stand)
    const floorBody = Matter.Bodies.rectangle(
      pad.position.x + pad.width / 2,
      pad.position.y + 12,
      pad.width, 8,
      { isStatic: true, label: 'landingPadFloor', restitution: 0.2 }
    );
    physicsWorld.addBody(floorBody);

    return { obstacles, landingPadBody };
  }

  private static createObstacleBody(obs: ObstacleConfig): Matter.Body {
    switch (obs.type) {
      case 'wall':
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: 'wall' }
        );

      case 'lava':
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: 'lava', isSensor: true }
        );

      case 'window': {
        const gapHeight = obs.gapHeight || 40;
        const wallAboveHeight = obs.position.y;
        const wallBelowY = obs.position.y + gapHeight;
        const wallBelowHeight = WORLD_HEIGHT - wallBelowY;

        const above = Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          wallAboveHeight / 2,
          obs.width, wallAboveHeight,
          { isStatic: true, label: 'wall' }
        );
        const below = Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          wallBelowY + wallBelowHeight / 2,
          obs.width, wallBelowHeight,
          { isStatic: true, label: 'wall' }
        );
        return Matter.Body.create({
          parts: [above, below],
          isStatic: true,
          label: 'window',
        });
      }

      case 'ceiling':
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: 'ceiling' }
        );

      default:
        return Matter.Bodies.rectangle(
          obs.position.x + obs.width / 2,
          obs.position.y + obs.height / 2,
          obs.width, obs.height,
          { isStatic: true, label: obs.type }
        );
    }
  }
}
