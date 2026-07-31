import Phaser from 'phaser';
import { MergeItem } from '../objects/MergeItem';
import { MergeBoardSystem } from './MergeBoardSystem';
import { BoardMetrics, cellToWorld } from '../utils/layout';

export type MergeCallback = (source: MergeItem, target: MergeItem) => void;
export type MoveCompleteCallback = (item: MergeItem, merged: boolean) => void;

export class DragDropSystem {
  private scene: Phaser.Scene;
  private board: MergeBoardSystem;
  private metrics: BoardMetrics;
  private draggedItem: MergeItem | null = null;
  private isLocked = false;
  private onMerge: MergeCallback;
  private onMoveComplete: MoveCompleteCallback;
  private trailTimer = 0;
  private dropGhost?: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    board: MergeBoardSystem,
    metrics: BoardMetrics,
    onMerge: MergeCallback,
    onMoveComplete: MoveCompleteCallback
  ) {
    this.scene = scene;
    this.board = board;
    this.metrics = metrics;
    this.onMerge = onMerge;
    this.onMoveComplete = onMoveComplete;

    this.dropGhost = scene.add.graphics().setDepth(5).setAlpha(0);

    scene.input.on('dragstart', this.onDragStart, this);
    scene.input.on('drag', this.onDrag, this);
    scene.input.on('dragend', this.onDragEnd, this);
    scene.events.once('shutdown', () => this.destroy());
  }

  registerItem(item: MergeItem): void {
    this.scene.input.setDraggable(item);
  }

  setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  private snapRadius(): number {
    return this.metrics.cell * 0.62;
  }

  private onDragStart(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject
  ): void {
    if (!(gameObject instanceof MergeItem)) return;
    if (this.isLocked || gameObject.isLocked) return;

    this.draggedItem = gameObject;
    gameObject.isDragging = true;
    gameObject.setDepth(900);
    gameObject.setLifted(true);
    this.trailTimer = 0;
    this.paintDropGhost(gameObject.row, gameObject.col, true);
  }

  private onDrag(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
    dragX: number,
    dragY: number
  ): void {
    if (!(gameObject instanceof MergeItem)) return;
    if (this.isLocked || gameObject !== this.draggedItem) return;

    gameObject.x = dragX;
    gameObject.y = dragY;

    const target = this.board.findNearestMergeTarget(gameObject, dragX, dragY, this.snapRadius());
    for (const item of this.board.getAllItems()) {
      item.setTargetHighlight(item === target);
    }

    if (target) {
      this.paintDropGhost(target.row, target.col, true);
    } else {
      const cell = this.board.worldToCell(dragX, dragY, this.metrics);
      if (cell) this.paintDropGhost(cell.row, cell.col, false);
      else this.clearDropGhost();
    }

    this.trailTimer += 1;
    if (this.trailTimer % 2 === 0) {
      this.emitTrail(dragX, dragY, gameObject.tier);
    }
  }

  private onDragEnd(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject
  ): void {
    if (!(gameObject instanceof MergeItem)) return;
    if (gameObject !== this.draggedItem) return;

    const item = gameObject;
    this.draggedItem = null;
    item.isDragging = false;
    item.setLifted(false);
    item.setDepth(10);
    this.clearDropGhost();

    for (const boardItem of this.board.getAllItems()) {
      boardItem.setTargetHighlight(false);
    }

    if (this.isLocked || item.isLocked) {
      this.tweenBack(item);
      return;
    }

    const mergeTarget = this.board.findNearestMergeTarget(
      item,
      item.x,
      item.y,
      this.snapRadius()
    );

    if (mergeTarget) {
      this.onMerge(item, mergeTarget);
      return;
    }

    this.tweenBack(item);
    this.onMoveComplete(item, false);
  }

  private paintDropGhost(row: number, col: number, mergeable: boolean): void {
    if (!this.dropGhost) return;
    const pos = cellToWorld(row, col, this.metrics);
    const cell = this.metrics.cell;
    const left = pos.x - cell / 2;
    const top = pos.y - cell / 2;
    const radius = cell * 0.17;
    const color = mergeable ? 0xffe08a : 0xb48cff;

    this.dropGhost.clear();
    this.dropGhost.fillStyle(color, mergeable ? 0.28 : 0.14);
    this.dropGhost.fillRoundedRect(left, top, cell, cell, radius);
    this.dropGhost.lineStyle(Math.max(2, cell * 0.04), color, mergeable ? 0.9 : 0.45);
    this.dropGhost.strokeRoundedRect(left, top, cell, cell, radius);
    this.dropGhost.setAlpha(1);
  }

  private clearDropGhost(): void {
    this.dropGhost?.clear().setAlpha(0);
  }

  private emitTrail(x: number, y: number, tier: number): void {
    const key = this.scene.textures.exists('particle') ? 'particle' : 'sparkle';
    const p = this.scene.add.image(x, y, key).setDepth(850);
    const size = Phaser.Math.Between(
      Math.round(this.metrics.cell * 0.12),
      Math.round(this.metrics.cell * 0.22)
    );
    p.setDisplaySize(size, size);
    p.setBlendMode(Phaser.BlendModes.ADD);
    p.setAlpha(0.75);

    this.scene.tweens.add({
      targets: p,
      alpha: 0,
      y: y + Phaser.Math.Between(8, 24),
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 280 + tier * 20,
      onComplete: () => p.destroy(),
    });
  }

  private tweenBack(item: MergeItem): void {
    const pos = cellToWorld(item.row, item.col, this.metrics);
    this.scene.tweens.add({
      targets: item,
      x: pos.x,
      y: pos.y,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  snapToCell(item: MergeItem): void {
    const pos = cellToWorld(item.row, item.col, this.metrics);
    item.setPosition(pos.x, pos.y);
  }

  destroy(): void {
    this.dropGhost?.destroy();
    this.scene.input.off('dragstart', this.onDragStart, this);
    this.scene.input.off('drag', this.onDrag, this);
    this.scene.input.off('dragend', this.onDragEnd, this);
  }
}
