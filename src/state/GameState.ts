const STORAGE_KEY = 'swing-escape-state';

interface SavedState {
  currentLevel: number;
  starRatings: Record<number, number>;
  endlessModeHighScore: number;
}

export class GameState {
  private state: SavedState;

  constructor() {
    this.state = this.load();
  }

  private load(): SavedState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { currentLevel: 1, starRatings: {}, endlessModeHighScore: 0 };
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getCurrentLevel(): number { return this.state.currentLevel; }

  getStars(levelId: number): number { return this.state.starRatings[levelId] || 0; }

  getTotalStars(): number {
    return Object.values(this.state.starRatings).reduce((sum, s) => sum + s, 0);
  }

  completeLevel(levelId: number, stars: number) {
    const prev = this.state.starRatings[levelId] || 0;
    if (stars > prev) {
      this.state.starRatings[levelId] = stars;
    }
    if (levelId >= this.state.currentLevel) {
      this.state.currentLevel = levelId + 1;
    }
    this.save();
  }

  getEndlessHighScore(): number { return this.state.endlessModeHighScore; }

  setEndlessHighScore(score: number) {
    if (score > this.state.endlessModeHighScore) {
      this.state.endlessModeHighScore = score;
      this.save();
    }
  }

  reset() {
    this.state = { currentLevel: 1, starRatings: {}, endlessModeHighScore: 0 };
    this.save();
  }
}
