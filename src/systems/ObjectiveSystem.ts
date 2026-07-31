import { MAX_MOVES, TARGET_TIER_INDEX } from '../config/gameConfig';
import { MergeBoardSystem } from './MergeBoardSystem';

export type GameEndReason = 'win' | 'moves' | 'board_lock';

export interface ObjectiveState {
  movesLeft: number;
  targetTier: number;
  highestTier: number;
  isGameOver: boolean;
  endReason: GameEndReason | null;
}

export class ObjectiveSystem {
  private movesLeft = MAX_MOVES;
  private highestTier = 0;
  private isGameOver = false;
  private endReason: GameEndReason | null = null;

  reset(): void {
    this.movesLeft = MAX_MOVES;
    this.highestTier = 0;
    this.isGameOver = false;
    this.endReason = null;
  }

  onValidMove(): void {
    if (this.isGameOver) return;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    if (this.movesLeft <= 0 && this.highestTier < TARGET_TIER_INDEX) {
      this.isGameOver = true;
      this.endReason = 'moves';
    }
  }

  onTierReached(tier: number): void {
    if (tier > this.highestTier) {
      this.highestTier = tier;
    }
    if (tier >= TARGET_TIER_INDEX && !this.isGameOver) {
      this.isGameOver = true;
      this.endReason = 'win';
    }
  }

  checkBoardLock(board: MergeBoardSystem): void {
    if (this.isGameOver) return;
    if (board.isBoardFull() && !board.hasAvailableMerges()) {
      this.isGameOver = true;
      this.endReason = 'board_lock';
    }
  }

  getState(): ObjectiveState {
    return {
      movesLeft: this.movesLeft,
      targetTier: TARGET_TIER_INDEX,
      highestTier: this.highestTier,
      isGameOver: this.isGameOver,
      endReason: this.endReason,
    };
  }

  hasWon(): boolean {
    return this.endReason === 'win';
  }
}
