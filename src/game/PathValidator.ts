import { Vector2 } from './types';
import { distance, pathLength } from '../utils/math';
import { MIN_SEGMENT_LENGTH, PATH_SMOOTHING } from '../utils/constants';

export class PathValidator {
  private maxLength: number;
  private cachedLength = 0;

  constructor(maxLength: number) {
    this.maxLength = maxLength;
  }

  /** Returns whether a new point can be added (hasn't gone backward, within budget) */
  canAddPoint(currentPath: Vector2[], newPoint: Vector2): boolean {
    if (currentPath.length === 0) return true;
    const last = currentPath[currentPath.length - 1];
    if (newPoint.x <= last.x) return false;
    const addedLen = distance(last, newPoint);
    if (addedLen < MIN_SEGMENT_LENGTH) return false;
    if (this.cachedLength + addedLen > this.maxLength) return false;
    return true;
  }

  /** Notify validator that a point was added so it can update cached length */
  pointAdded(currentPath: Vector2[]) {
    if (currentPath.length < 2) {
      this.cachedLength = 0;
      return;
    }
    const last = currentPath[currentPath.length - 2];
    const curr = currentPath[currentPath.length - 1];
    this.cachedLength += distance(last, curr);
  }

  /** Returns remaining line length budget */
  remainingLength(currentPath: Vector2[]): number {
    return Math.max(0, this.maxLength - this.cachedLength);
  }

  /** Returns fuel fraction (0 = empty, 1 = full) */
  fuelFraction(currentPath: Vector2[]): number {
    if (this.maxLength === 0) return 0;
    return this.remainingLength(currentPath) / this.maxLength;
  }

  /** Reset cached length */
  reset() {
    this.cachedLength = 0;
  }

  /** Smooth the path by averaging adjacent points */
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
