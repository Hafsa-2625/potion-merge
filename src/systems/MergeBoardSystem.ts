import Phaser from 'phaser';
import { BOARD_COLS, BOARD_ROWS } from '../config/gameConfig';
import { MergeItem } from '../objects/MergeItem';
import { canMerge, getNextTierId } from '../data/itemTiers';
import { BoardMetrics } from '../utils/layout';

export interface BoardCell {
  row: number;
  col: number;
  item: MergeItem | null;
}

export interface MergeResult {
  success: boolean;
  sourceItem: MergeItem;
  targetItem: MergeItem | null;
  newTier: number | null;
  mergedItem: MergeItem | null;
  removedItems: MergeItem[];
}

export class MergeBoardSystem {
  private grid: (MergeItem | null)[][];

  constructor() {
    this.grid = this.createEmptyGrid();
  }

  reset(): void {
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): (MergeItem | null)[][] {
    return Array.from({ length: BOARD_ROWS }, () =>
      Array.from({ length: BOARD_COLS }, () => null)
    );
  }

  getItemAt(row: number, col: number): MergeItem | null {
    if (!this.isInBounds(row, col)) return null;
    return this.grid[row][col];
  }

  isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
  }

  isCellEmpty(row: number, col: number): boolean {
    return this.isInBounds(row, col) && this.grid[row][col] === null;
  }

  placeItem(item: MergeItem, row: number, col: number): void {
    if (!this.isInBounds(row, col)) return;
    this.grid[row][col] = item;
    item.row = row;
    item.col = col;
  }

  removeItem(item: MergeItem): void {
    if (this.isInBounds(item.row, item.col) && this.grid[item.row][item.col] === item) {
      this.grid[item.row][item.col] = null;
    }
  }

  getEmptyCells(): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (this.grid[r][c] === null) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  }

  getAllItems(): MergeItem[] {
    const items: MergeItem[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const item = this.grid[r][c];
        if (item) items.push(item);
      }
    }
    return items;
  }

  findMergeTarget(source: MergeItem, targetRow: number, targetCol: number): MergeItem | null {
    if (!this.isInBounds(targetRow, targetCol)) return null;
    const target = this.grid[targetRow][targetCol];
    if (!target || target === source) return null;
    if (canMerge(source.tier, target.tier)) return target;
    return null;
  }

  /** Maps a world point onto a board cell, or null if outside the grid. */
  worldToCell(
    worldX: number,
    worldY: number,
    metrics: BoardMetrics
  ): { row: number; col: number } | null {
    const step = metrics.cell + metrics.gap;
    const col = Math.floor((worldX - metrics.originX) / step);
    const row = Math.floor((worldY - metrics.originY) / step);
    if (!this.isInBounds(row, col)) return null;

    const localX = worldX - metrics.originX - col * step;
    const localY = worldY - metrics.originY - row * step;
    if (localX > metrics.cell || localY > metrics.cell) return null;
    return { row, col };
  }

  findNearestMergeTarget(source: MergeItem, worldX: number, worldY: number, threshold: number): MergeItem | null {
    let best: MergeItem | null = null;
    let bestDist = threshold;

    for (const item of this.getAllItems()) {
      if (item === source) continue;
      if (!canMerge(source.tier, item.tier)) continue;
      const dist = Phaser.Math.Distance.Between(worldX, worldY, item.x, item.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    }
    return best;
  }

  resolveMerge(source: MergeItem, target: MergeItem): MergeResult {
    const newTier = getNextTierId(source.tier);
    if (newTier === null) {
      return {
        success: false,
        sourceItem: source,
        targetItem: target,
        newTier: null,
        mergedItem: null,
        removedItems: [],
      };
    }

    this.removeItem(source);
    target.upgradeTier(newTier);

    return {
      success: true,
      sourceItem: source,
      targetItem: target,
      newTier,
      mergedItem: target,
      removedItems: [source],
    };
  }

  hasAvailableMerges(): boolean {
    const tierCounts = new Map<number, number>();
    for (const item of this.getAllItems()) {
      tierCounts.set(item.tier, (tierCounts.get(item.tier) ?? 0) + 1);
    }
    for (const [tier, count] of tierCounts) {
      if (count >= 2 && getNextTierId(tier) !== null) return true;
    }
    return false;
  }

  isBoardFull(): boolean {
    return this.getEmptyCells().length === 0;
  }
}
