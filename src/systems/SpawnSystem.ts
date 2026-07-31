import Phaser from 'phaser';
import { SPAWN_WEIGHTS } from '../config/gameConfig';
import { MergeBoardSystem } from './MergeBoardSystem';
import { MergeItem } from '../objects/MergeItem';
import { SeededRandom } from '../utils/random';
import { BoardMetrics, cellToWorld } from '../utils/layout';

export class SpawnSystem {
  private scene: Phaser.Scene;
  private board: MergeBoardSystem;
  private rng: SeededRandom;
  private metrics: BoardMetrics;

  constructor(
    scene: Phaser.Scene,
    board: MergeBoardSystem,
    seed: number,
    metrics: BoardMetrics
  ) {
    this.scene = scene;
    this.board = board;
    this.rng = new SeededRandom(seed);
    this.metrics = metrics;
  }

  spawnInitialItems(count: number): MergeItem[] {
    const empty = [...this.board.getEmptyCells()];
    for (let i = empty.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [empty[i], empty[j]] = [empty[j], empty[i]];
    }

    return empty.slice(0, count).map((cell) => this.createItemAt(cell.row, cell.col, this.pickSpawnTier()));
  }

  spawnAfterMerge(): MergeItem | null {
    const empty = this.board.getEmptyCells();
    if (empty.length === 0) return null;

    const cell = this.rng.pickRandom(empty);
    return this.createItemAt(cell.row, cell.col, this.pickSpawnTier());
  }

  private pickSpawnTier(): number {
    const pick = this.rng.pickWeighted({
      tier0: SPAWN_WEIGHTS.tier0,
      tier1: SPAWN_WEIGHTS.tier1,
      tier2: SPAWN_WEIGHTS.tier2,
    });
    if (pick === 'tier2') return 2;
    return pick === 'tier1' ? 1 : 0;
  }

  private createItemAt(row: number, col: number, tier: number): MergeItem {
    const pos = cellToWorld(row, col, this.metrics);
    const item = new MergeItem(this.scene, tier, row, col, pos.x, pos.y, this.metrics.cell);
    this.board.placeItem(item, row, col);
    item.playSpawnAnimation();
    return item;
  }
}
