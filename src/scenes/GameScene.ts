import Phaser from 'phaser';
import {
  BOARD_COLS,
  BOARD_ROWS,
  MAX_MOVES,
  SCENE_KEYS,
  TARGET_TIER_INDEX,
} from '../config/gameConfig';
import { MergeBoardSystem } from '../systems/MergeBoardSystem';
import { DragDropSystem } from '../systems/DragDropSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { HudUi } from '../ui/HudUi';
import { MergeItem } from '../objects/MergeItem';
import { Layout, cellToWorld, computeLayout, fontSize } from '../utils/layout';
import { createGameSeed } from '../utils/random';
import { SceneBackground } from '../ui/background';
import {
  COLORS,
  FONT_UI,
  HEX,
  createButton,
  drawPanel,
  paintPanel,
  panelHeaderY,
} from '../ui/theme';

const INITIAL_ITEM_COUNT = 10;

export class GameScene extends Phaser.Scene {
  private layout!: Layout;
  private background!: SceneBackground;
  private board!: MergeBoardSystem;
  private dragSystem!: DragDropSystem;
  private spawnSystem!: SpawnSystem;
  private scoreSystem!: ScoreSystem;
  private objectiveSystem!: ObjectiveSystem;
  private hud!: HudUi;
  private boardPanel!: Phaser.GameObjects.Graphics;
  private cellGraphics!: Phaser.GameObjects.Graphics;
  private isProcessing = false;
  private hasInteracted = false;
  private instructionOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create(): void {
    MergeItem.resetIdCounter();
    this.isProcessing = false;
    this.hasInteracted = false;

    const { width, height } = this.scale.gameSize;
    this.layout = computeLayout(width, height);
    this.background = new SceneBackground(this, width, height, 10);

    this.boardPanel = this.add.graphics().setDepth(1);
    this.cellGraphics = this.add.graphics().setDepth(2);
    this.paintBoard();

    this.initSystems();

    for (const item of this.spawnSystem.spawnInitialItems(INITIAL_ITEM_COUNT)) {
      item.setDepth(10);
      this.dragSystem.registerItem(item);
    }

    this.hud = new HudUi(this, this.layout);
    this.refreshHud();
    this.showInstructions();

    this.scale.on('resize', this.handleResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.handleResize, this));
  }

  private initSystems(): void {
    this.board = new MergeBoardSystem();
    this.scoreSystem = new ScoreSystem();
    this.objectiveSystem = new ObjectiveSystem();

    // Systems hold a live reference to the board metrics, so a resize is picked
    // up without rebuilding them.
    this.spawnSystem = new SpawnSystem(this, this.board, createGameSeed(), this.layout.board);
    this.dragSystem = new DragDropSystem(
      this,
      this.board,
      this.layout.board,
      (source, target) => this.handleMerge(source, target),
      () => {}
    );
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const next = computeLayout(gameSize.width, gameSize.height);

    // Preserve the metrics object identity so the systems keep their reference.
    Object.assign(this.layout.board, next.board);
    this.layout = { ...next, board: this.layout.board };

    this.background.resize(gameSize.width, gameSize.height);
    this.paintBoard();

    for (const item of this.board.getAllItems()) {
      item.applyCellSize(this.layout.board.cell);
      const pos = cellToWorld(item.row, item.col, this.layout.board);
      item.setPosition(pos.x, pos.y);
    }

    this.hud.applyLayout(this.layout);

    if (this.instructionOverlay) {
      this.instructionOverlay.destroy();
      this.instructionOverlay = undefined;
      this.hasInteracted = false;
      this.showInstructions();
    }
  }

  private paintBoard(): void {
    const { board, ui } = this.layout;

    paintPanel(
      this.boardPanel,
      board.originX + board.width / 2,
      board.originY + board.height / 2,
      board.width + board.gap * 3,
      board.height + board.gap * 3,
      { radius: 40 * ui, fillAlpha: 0.62, glow: true }
    );

    const radius = board.cell * 0.2;
    this.cellGraphics.clear();

    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const pos = cellToWorld(r, c, board);
        const left = pos.x - board.cell / 2;
        const top = pos.y - board.cell / 2;

        this.cellGraphics.fillStyle(COLORS.cell, 0.78);
        this.cellGraphics.fillRoundedRect(left, top, board.cell, board.cell, radius);

        this.cellGraphics.fillStyle(0xffffff, 0.04);
        this.cellGraphics.fillRoundedRect(
          left + 3,
          top + 3,
          board.cell - 6,
          board.cell * 0.38,
          radius * 0.7
        );

        this.cellGraphics.lineStyle(Math.max(2, board.cell * 0.03), COLORS.cellStroke, 0.45);
        this.cellGraphics.strokeRoundedRect(left, top, board.cell, board.cell, radius);
      }
    }
  }

  private showInstructions(): void {
    const { width, height, cx, cy, ui } = this.layout;
    const overlay = this.add.container(0, 0).setDepth(1000);

    const dimmer = this.add
      .rectangle(cx, cy, width, height, 0x0d0620, 0.72)
      .setInteractive();

    const cardW = Math.min(width - this.layout.pad * 2, 620 * ui);
    const cardH = Math.min(height - this.layout.pad * 2, 440 * ui);
    const headerH = Math.min(cardH * 0.2, 74 * ui);
    const card = drawPanel(this, cx, cy, cardW, cardH, { radius: 36 * ui, gloss: false });

    const heading = this.add
      .text(cx, panelHeaderY(cy, cardH, headerH), 'HOW TO PLAY', {
        fontFamily: FONT_UI,
        fontSize: fontSize(34, ui),
        color: HEX.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = this.add
      .text(
        cx,
        cy - cardH * 0.06,
        `Drag a potion onto a matching\npotion to brew the next tier.\n\nReach the Legendary Potion\nwithin ${MAX_MOVES} moves.`,
        {
          fontFamily: FONT_UI,
          fontSize: fontSize(24, ui),
          color: HEX.text,
          align: 'center',
          lineSpacing: 8 * ui,
        }
      )
      .setOrigin(0.5);

    const buttonH = Math.min(78 * ui, cardH * 0.19);
    const playButton = createButton(this, {
      x: cx,
      y: cy + cardH * 0.32,
      width: Math.min(cardW * 0.5, 260 * ui),
      height: buttonH,
      label: 'PLAY',
      fontSize: Math.round(Math.min(30 * ui, buttonH * 0.42)),
      onClick: () => this.dismissInstructions(),
    });

    overlay.add([dimmer, card, heading, body, playButton]);
    this.instructionOverlay = overlay;

    dimmer.on('pointerdown', () => this.dismissInstructions());
  }

  private dismissInstructions(): void {
    if (this.hasInteracted) return;
    this.hasInteracted = true;

    const overlay = this.instructionOverlay;
    this.instructionOverlay = undefined;
    if (!overlay) return;

    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 180,
      onComplete: () => overlay.destroy(),
    });
  }

  private handleMerge(source: MergeItem, target: MergeItem): void {
    if (this.isProcessing || this.objectiveSystem.getState().isGameOver) return;

    this.isProcessing = true;
    this.dragSystem.setLocked(true);

    const result = this.board.resolveMerge(source, target);
    if (!result.success || result.newTier === null) {
      this.isProcessing = false;
      this.dragSystem.setLocked(false);
      return;
    }

    const newTier = result.newTier;
    const mergedItem = result.mergedItem!;

    this.tweens.add({
      targets: source,
      x: target.x,
      y: target.y,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: 170,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        source.destroy();
        this.completeMerge(mergedItem, newTier);
      },
    });
  }

  private completeMerge(mergedItem: MergeItem, newTier: number): void {
    const earned = this.scoreSystem.addMergeScore(newTier);
    this.objectiveSystem.onTierReached(newTier);
    this.objectiveSystem.onValidMove();

    this.hud.showScorePopup(mergedItem.x, mergedItem.y, earned);
    this.hud.showCombo(this.scoreSystem.getComboCount());
    this.playMergeEffect(mergedItem.x, mergedItem.y, newTier);

    if (newTier >= TARGET_TIER_INDEX) {
      this.hud.flashGoalReached();
      this.cameras.main.shake(260, 0.006);
    }

    const newItem = this.spawnSystem.spawnAfterMerge();
    if (newItem) {
      newItem.setDepth(10);
      this.dragSystem.registerItem(newItem);
    }

    this.objectiveSystem.checkBoardLock(this.board);
    this.refreshHud();

    this.time.delayedCall(220, () => {
      this.isProcessing = false;
      this.dragSystem.setLocked(false);
      this.checkGameEnd();
    });
  }

  private playMergeEffect(x: number, y: number, tier: number): void {
    const cell = this.layout.board.cell;

    // Flash disc
    if (this.textures.exists('aura')) {
      const flash = this.add
        .image(x, y, 'aura')
        .setDepth(290)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(cell * 0.6, cell * 0.6)
        .setAlpha(0.9);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 2.4,
        scaleY: 2.4,
        duration: 380,
        onComplete: () => flash.destroy(),
      });
    }

    const ring = this.add.graphics().setDepth(300).setPosition(x, y);
    ring.lineStyle(Math.max(3, cell * 0.06), COLORS.gold, 1);
    ring.strokeCircle(0, 0, cell * 0.28);
    ring.lineStyle(Math.max(2, cell * 0.03), 0xffffff, 0.6);
    ring.strokeCircle(0, 0, cell * 0.22);

    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 2.3,
      scaleY: 2.3,
      duration: 460,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    const particleKey = this.textures.exists('particle') ? 'particle' : 'sparkle';
    const sparkleCount = 10 + tier * 3;
    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = this.add.image(x, y, i % 2 === 0 ? 'sparkle' : particleKey).setDepth(300);
      sparkle.setBlendMode(Phaser.BlendModes.ADD);
      const size = Phaser.Math.Between(Math.round(cell * 0.12), Math.round(cell * 0.26));
      sparkle.setDisplaySize(size, size);

      const angle = (i / sparkleCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.25, 0.25);
      const distance = Phaser.Math.Between(Math.round(cell * 0.45), Math.round(cell * 1.05));

      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.15,
        scaleY: 0.15,
        angle: Phaser.Math.Between(-220, 220),
        duration: Phaser.Math.Between(420, 700),
        ease: 'Cubic.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }

    this.cameras.main.shake(80 + tier * 12, 0.002 + tier * 0.0004);
  }

  private refreshHud(): void {
    const state = this.objectiveSystem.getState();
    this.hud.update({
      score: this.scoreSystem.getScore(),
      movesLeft: state.movesLeft,
      highestTier: Math.max(state.highestTier, this.scoreSystem.getHighestTier()),
      targetTier: state.targetTier,
    });
  }

  private checkGameEnd(): void {
    const state = this.objectiveSystem.getState();
    if (!state.isGameOver) return;

    this.dragSystem.setLocked(true);
    for (const item of this.board.getAllItems()) {
      item.lock();
    }

    this.time.delayedCall(700, () => {
      this.scene.start(SCENE_KEYS.RESULT, {
        won: this.objectiveSystem.hasWon(),
        score: this.scoreSystem.getScore(),
        highestTier: Math.max(state.highestTier, this.scoreSystem.getHighestTier()),
        movesUsed: MAX_MOVES - state.movesLeft,
      });
    });
  }
}
