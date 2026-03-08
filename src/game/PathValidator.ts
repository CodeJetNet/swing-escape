import { Vector2 } from './types';
import { distance, pathLength } from '../utils/math';
import { MIN_SEGMENT_LENGTH, PATH_SMOOTHING } from '../utils/constants';

export class PathValidator {
  private maxLength: number;

  constructor(maxLength: number) {
    this.maxLength = maxLength;
  }

  canAddPoint(currentPath: Vector2[], newPoint: Vector2): boolean {
    if (currentPath.length === 0) return true;
    const last = currentPath[currentPath.length - 1];
    if (newPoint.x <= last.x) return false;
    if (distance(last, newPoint) < MIN_SEGMENT_LENGTH) return false;
    const currentLen = pathLength(currentPath);
    const addedLen = distance(last, newPoint);
    if (currentLen + addedLen > this.maxLength) return false;
    return true;
  }

  remainingLength(currentPath: Vector2[]): number {
    return Math.max(0, this.maxLength - pathLength(currentPath));
  }

  fuelFraction(currentPath: Vector2[]): number {
    if (this.maxLength === 0) return 0;
    return this.remainingLength(currentPath) / this.maxLength;
  }

  static smooth(points: Vector2[]): Vector2[] {
    if (points.length < 3) return [...points];
    const result: Vector2[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      result.push({
        x: curr.x + (prev.x + next.x - 2 * curr.x) * PATH_SMOOTHING,
        y: curr.y + (prev.y + next.y - 2 * curr.y) * PATH_SMOOTHING,
      });
    }
    result.push(points[points.length - 1]);
    return result;
  }
}
