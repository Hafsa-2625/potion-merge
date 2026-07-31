import { COMBO_MULTIPLIER_STEP, COMBO_WINDOW_MS, MAX_COMBO_MULTIPLIER } from '../config/gameConfig';
import { getTierById } from '../data/itemTiers';

export class ScoreSystem {
  private score = 0;
  private comboCount = 0;
  private lastMergeTime = 0;
  private highestTier = 0;

  reset(): void {
    this.score = 0;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.highestTier = 0;
  }

  addMergeScore(resultingTier: number): number {
    const now = Date.now();
    if (now - this.lastMergeTime <= COMBO_WINDOW_MS) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastMergeTime = now;

    const baseScore = getTierById(resultingTier).scoreValue;
    const multiplier = Math.min(1 + (this.comboCount - 1) * COMBO_MULTIPLIER_STEP, MAX_COMBO_MULTIPLIER);
    const earned = Math.round(baseScore * multiplier);
    this.score += earned;

    if (resultingTier > this.highestTier) {
      this.highestTier = resultingTier;
    }

    return earned;
  }

  getScore(): number {
    return this.score;
  }

  getHighestTier(): number {
    return this.highestTier;
  }

  getComboCount(): number {
    return this.comboCount;
  }
}
