import { Vector2 } from './types';
import { PathValidator } from './PathValidator';

export class InputHandler {
  private path: Vector2[] = [];
  private isDrawing = false;
  private validator: PathValidator;
  private startPosition: Vector2;
  private canvasToWorld: (clientX: number, clientY: number) => Vector2;
  private onDrawingComplete: ((path: Vector2[]) => void) | null = null;

  constructor(
    startPosition: Vector2,
    maxLineLength: number,
    canvasToWorld: (clientX: number, clientY: number) => Vector2
  ) {
    this.startPosition = startPosition;
    this.validator = new PathValidator(maxLineLength);
    this.canvasToWorld = canvasToWorld;
  }

  setOnDrawingComplete(cb: (path: Vector2[]) => void) {
    this.onDrawingComplete = cb;
  }

  getPath(): Vector2[] {
    return this.path;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  getFuelFraction(): number {
    return this.validator.fuelFraction(this.path);
  }

  handlePointerDown(clientX: number, clientY: number) {
    this.isDrawing = true;
    this.path = [{ ...this.startPosition }];
  }

  handlePointerMove(clientX: number, clientY: number) {
    if (!this.isDrawing) return;
    const worldPoint = this.canvasToWorld(clientX, clientY);
    if (this.validator.canAddPoint(this.path, worldPoint)) {
      this.path.push(worldPoint);
    }
  }

  handlePointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.path.length < 2) {
      this.path = [];
      return;
    }
    const smoothed = PathValidator.smooth(this.path);
    this.path = smoothed;
    if (this.onDrawingComplete) {
      this.onDrawingComplete(smoothed);
    }
  }

  reset(startPosition: Vector2, maxLineLength: number) {
    this.startPosition = startPosition;
    this.validator = new PathValidator(maxLineLength);
    this.path = [];
    this.isDrawing = false;
  }
}
