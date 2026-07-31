import Phaser from 'phaser';
import { MAX_MOVES, SCENE_KEYS } from '../config/gameConfig';
import { ITEM_TIERS } from '../data/itemTiers';
import { Layout, computeLayout, fontSize } from '../utils/layout';
import { SceneBackground } from '../ui/background';
import {
  COLORS,
  FONT_DISPLAY,
  FONT_UI,
  HEX,
  createButton,
  createTitle,
  drawPanel,
  panelHeaderY,
} from '../ui/theme';
import { attachResponsiveRebuild } from '../utils/sceneResize';

export class MenuScene extends Phaser.Scene {
  private layout!: Layout;

  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.layout = computeLayout(width, height);
    new SceneBackground(this, width, height, 18);

    if (this.layout.isLandscape) {
      this.buildLandscape();
    } else {
      this.buildPortrait();
    }

    this.playEntrance();
    attachResponsiveRebuild(this);
  }

  private buildPortrait(): void {
    const { width, height, cx, ui, pad } = this.layout;
    const cardW = Math.min(width - pad * 2, 660 * ui);

    this.titleBlock(cx, height * 0.13, 70 * ui, 24 * ui);
    this.tierShowcase(cx, height * 0.355, cardW, Math.min(height * 0.2, 230 * ui));
    this.howToPlay(cx, height * 0.59, cardW, Math.min(height * 0.22, 260 * ui));

    createButton(this, {
      x: cx,
      y: height * 0.8,
      width: Math.min(cardW * 0.64, 360 * ui),
      height: 96 * ui,
      label: 'START',
      fontSize: Math.round(38 * ui),
      onClick: () => this.scene.start(SCENE_KEYS.GAME),
    });

    this.add
      .text(cx, height * 0.9, 'Tap START to brew', {
        fontFamily: FONT_UI,
        fontSize: fontSize(18, ui),
        color: HEX.textDim,
      })
      .setOrigin(0.5)
      .setName('hint');
  }

  private buildLandscape(): void {
    const { width, height, ui, pad } = this.layout;
    const leftCx = width * 0.28;
    const rightCx = width * 0.7;
    const columnW = Math.min(width * 0.44 - pad, 680 * ui);

    this.titleBlock(leftCx, height * 0.28, 68 * ui, 24 * ui);

    createButton(this, {
      x: leftCx,
      y: height * 0.58,
      width: Math.min(columnW * 0.72, 360 * ui),
      height: 96 * ui,
      label: 'START',
      fontSize: Math.round(38 * ui),
      onClick: () => this.scene.start(SCENE_KEYS.GAME),
    });

    this.add
      .text(leftCx, height * 0.72, 'Tap START to brew', {
        fontFamily: FONT_UI,
        fontSize: fontSize(18, ui),
        color: HEX.textDim,
      })
      .setOrigin(0.5);

    this.heroPotion(leftCx, height * 0.82, Math.min(110 * ui, height * 0.14));
    this.tierShowcase(rightCx, height * 0.28, columnW, Math.min(height * 0.34, 250 * ui));
    this.howToPlay(rightCx, height * 0.68, columnW, Math.min(height * 0.38, 280 * ui));
  }

  private titleBlock(cx: number, cy: number, size: number, subSize: number): void {
    const title = createTitle(this, cx, cy, 'Potion Merge', size);
    title.setName('title');

    this.tweens.add({
      targets: title,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Soft gold under-glow behind the title.
    if (this.textures.exists('mote')) {
      const glow = this.add
        .image(cx, cy, 'mote')
        .setDepth(title.depth - 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(size * 4.2, size * 1.8)
        .setAlpha(0.35);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.2, to: 0.45 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
      });
    }

    this.add
      .text(cx, cy + size * 0.85, 'Brew the Legendary Potion', {
        fontFamily: FONT_DISPLAY,
        fontSize: `${Math.round(subSize)}px`,
        color: HEX.textDim,
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
  }

  private heroPotion(cx: number, cy: number, size: number): void {
    const key = ITEM_TIERS[ITEM_TIERS.length - 1].textureKey;
    if (!this.textures.exists(key)) return;

    const icon = this.add.image(cx, cy, key).setDisplaySize(size, size).setAlpha(0.9);
    this.tweens.add({
      targets: icon,
      y: cy - size * 0.08,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private tierShowcase(cx: number, cy: number, w: number, h: number): void {
    const ui = this.layout.ui;
    const headerH = Math.min(h * 0.24, 50 * ui);
    drawPanel(this, cx, cy, w, h, { radius: 36 * ui, gloss: false });

    this.add
      .text(cx, panelHeaderY(cy, h, headerH), 'MERGE CHAIN', {
        fontFamily: FONT_UI,
        fontSize: fontSize(16, ui),
        color: HEX.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    const count = ITEM_TIERS.length;
    const spacing = (w * 0.86) / count;
    const startX = cx - (spacing * (count - 1)) / 2;
    const iconY = cy + h * 0.02;
    const iconSize = Math.min(spacing * 0.85, h * 0.48);

    ITEM_TIERS.forEach((tier, index) => {
      const x = startX + index * spacing;
      const isGoal = index === count - 1;

      if (index > 0) {
        this.add
          .text(x - spacing / 2, iconY, '›', {
            fontFamily: FONT_UI,
            fontSize: fontSize(28, ui),
            color: HEX.gold,
          })
          .setOrigin(0.5)
          .setAlpha(0.7);
      }

      if (isGoal && this.textures.exists('aura')) {
        this.add
          .image(x, iconY, 'aura')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDisplaySize(iconSize * 1.6, iconSize * 1.6)
          .setAlpha(0.55);
      }

      const icon = this.add.image(x, iconY, tier.textureKey);
      const size = isGoal ? iconSize * 1.22 : iconSize;
      icon.setDisplaySize(size, size);

      this.tweens.add({
        targets: icon,
        y: iconY - h * 0.04,
        duration: 1300 + index * 80,
        delay: index * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      if (isGoal) {
        this.add
          .text(x, cy + h * 0.36, 'GOAL', {
            fontFamily: FONT_UI,
            fontSize: fontSize(15, ui),
            color: HEX.gold,
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
      }
    });
  }

  private howToPlay(cx: number, cy: number, w: number, h: number): void {
    const ui = this.layout.ui;
    const headerH = Math.min(h * 0.24, 58 * ui);
    drawPanel(this, cx, cy, w, h, { radius: 36 * ui, gloss: false });

    this.add
      .text(cx, panelHeaderY(cy, h, headerH), 'HOW TO PLAY', {
        fontFamily: FONT_UI,
        fontSize: fontSize(24, ui),
        color: HEX.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const lines = [
      'Drag a potion onto a matching one',
      'Each match brews the next tier up',
      `Reach the Legendary Potion in ${MAX_MOVES} moves`,
    ];

    const rowGap = h * 0.2;
    const firstY = cy - h * 0.06;
    const bulletX = cx - w * 0.4;

    lines.forEach((line, index) => {
      const y = firstY + index * rowGap;
      this.add.circle(bulletX, y, Math.max(4, 7 * ui), COLORS.gold);
      this.add.circle(bulletX, y, Math.max(2, 3 * ui), 0xffffff, 0.55);
      this.add
        .text(bulletX + 22 * ui, y, line, {
          fontFamily: FONT_UI,
          fontSize: fontSize(21, ui),
          color: HEX.text,
          wordWrap: { width: w * 0.74 },
        })
        .setOrigin(0, 0.5);
    });
  }

  private playEntrance(): void {
    const fadeables = this.children.list.filter((child) => {
      const depth = (child as Phaser.GameObjects.GameObject & { depth?: number }).depth ?? 0;
      if (depth < 0) return false;
      return (
        child.type === 'Text' ||
        child.type === 'Container' ||
        child.type === 'Image' ||
        child.type === 'Graphics'
      );
    });

    fadeables.forEach((node, index) => {
      const go = node as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha;
      if (typeof go.setAlpha !== 'function') return;
      const target = go.alpha > 0 ? go.alpha : 1;
      go.setAlpha(0);
      this.tweens.add({
        targets: go,
        alpha: target,
        duration: 450,
        delay: Math.min(index * 16, 320),
        ease: 'Cubic.easeOut',
      });
    });
  }
}
