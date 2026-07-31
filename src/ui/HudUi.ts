import Phaser from 'phaser';
import { HudState, MAX_MOVES } from '../config/gameConfig';
import { ITEM_TIERS } from '../data/itemTiers';
import { Layout, fontSize } from '../utils/layout';
import { FONT_UI, HEX, paintPanel } from './theme';

const HUD_DEPTH = 500;

export class HudUi {
  private scene: Phaser.Scene;
  private layout: Layout;

  private barPanel: Phaser.GameObjects.Graphics;
  private ladderPanel: Phaser.GameObjects.Graphics;
  private scoreLabel: Phaser.GameObjects.Text;
  private scoreValue: Phaser.GameObjects.Text;
  private movesLabel: Phaser.GameObjects.Text;
  private movesValue: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private ladderIcons: Phaser.GameObjects.Image[] = [];
  private lastHighestTier = -1;

  constructor(scene: Phaser.Scene, layout: Layout) {
    this.scene = scene;
    this.layout = layout;

    this.barPanel = scene.add.graphics().setDepth(HUD_DEPTH - 1);
    this.ladderPanel = scene.add.graphics().setDepth(HUD_DEPTH - 1);

    this.scoreLabel = this.text('SCORE', HEX.textDim, false);
    this.scoreValue = this.text('0', HEX.gold, true);
    this.movesLabel = this.text('MOVES', HEX.textDim, false);
    this.movesValue = this.text(`${MAX_MOVES}`, HEX.text, true);

    this.comboText = this.text('', HEX.gold, true).setAlpha(0);
    this.hintText = this.text('Drag a potion onto a matching one', HEX.textDim, false);

    for (const tier of ITEM_TIERS) {
      const icon = scene.add.image(0, 0, tier.textureKey).setDepth(HUD_DEPTH).setAlpha(0.25);
      this.ladderIcons.push(icon);
    }

    this.applyLayout(layout);
  }

  private text(value: string, color: string, bold: boolean): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, value, {
        fontFamily: FONT_UI,
        fontSize: '20px',
        color,
        fontStyle: bold ? 'bold' : 'normal',
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH);
  }

  /** Repositions and re-scales every HUD element for a new layout. */
  applyLayout(layout: Layout): void {
    this.layout = layout;
    const { ui, hud, isLandscape } = layout;

    paintPanel(this.barPanel, hud.bar.cx, hud.bar.cy, hud.bar.w, hud.bar.h, {
      radius: 30 * ui,
    });
    paintPanel(this.ladderPanel, hud.ladder.cx, hud.ladder.cy, hud.ladder.w, hud.ladder.h, {
      radius: 30 * ui,
      fillAlpha: 0.6,
      gloss: false,
    });

    this.scoreLabel.setFontSize(fontSize(18, ui));
    this.movesLabel.setFontSize(fontSize(18, ui));
    this.scoreValue.setFontSize(fontSize(38, ui));
    this.movesValue.setFontSize(fontSize(38, ui));
    this.comboText.setFontSize(fontSize(30, ui));
    this.hintText.setFontSize(fontSize(19, ui));

    if (isLandscape) {
      // Side-by-side stats inside the column for a cleaner card.
      const leftX = hud.bar.cx - hud.bar.w * 0.22;
      const rightX = hud.bar.cx + hud.bar.w * 0.22;
      this.scoreLabel.setPosition(leftX, hud.bar.cy - hud.bar.h * 0.22);
      this.scoreValue.setPosition(leftX, hud.bar.cy + hud.bar.h * 0.18);
      this.movesLabel.setPosition(rightX, hud.bar.cy - hud.bar.h * 0.22);
      this.movesValue.setPosition(rightX, hud.bar.cy + hud.bar.h * 0.18);
    } else {
      const inset = Math.min(hud.bar.w * 0.18, 130 * ui);
      this.scoreLabel.setPosition(hud.bar.cx - hud.bar.w / 2 + inset, hud.bar.cy - hud.bar.h * 0.22);
      this.scoreValue.setPosition(hud.bar.cx - hud.bar.w / 2 + inset, hud.bar.cy + hud.bar.h * 0.18);
      this.movesLabel.setPosition(hud.bar.cx + hud.bar.w / 2 - inset, hud.bar.cy - hud.bar.h * 0.22);
      this.movesValue.setPosition(hud.bar.cx + hud.bar.w / 2 - inset, hud.bar.cy + hud.bar.h * 0.18);
    }

    this.comboText.setPosition(hud.combo.cx, hud.combo.cy);
    this.hintText.setPosition(hud.hint.cx, hud.hint.cy);
    this.hintText.setVisible(hud.hint.cy < layout.height - 4);

    const count = this.ladderIcons.length;
    const iconSize = Math.min(hud.ladder.h * 0.66, (hud.ladder.w * 0.94) / count);
    const spacing = (hud.ladder.w * 0.9) / count;
    const startX = hud.ladder.cx - (spacing * (count - 1)) / 2;

    this.ladderIcons.forEach((icon, index) => {
      icon.setDisplaySize(iconSize, iconSize);
      icon.setPosition(startX + index * spacing, hud.ladder.cy);
    });
  }

  update(state: HudState): void {
    this.scoreValue.setText(`${state.score}`);
    this.movesValue.setText(`${state.movesLeft}`);
    this.movesValue.setColor(state.movesLeft <= 5 ? HEX.red : HEX.text);

    if (state.movesLeft <= 5) {
      this.scene.tweens.add({
        targets: this.movesValue,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 140,
        yoyo: true,
      });
    }

    if (state.highestTier !== this.lastHighestTier) {
      this.lastHighestTier = state.highestTier;
      this.refreshLadder(state.highestTier);
    }
  }

  private refreshLadder(highestTier: number): void {
    this.ladderIcons.forEach((icon, index) => {
      const unlocked = index <= highestTier;
      icon.setAlpha(unlocked ? 1 : 0.25);

      if (unlocked && index === highestTier) {
        this.scene.tweens.add({
          targets: icon,
          scaleX: icon.scaleX * 1.35,
          scaleY: icon.scaleY * 1.35,
          duration: 200,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
    });
  }

  showCombo(combo: number): void {
    if (combo < 2) return;

    const { hud } = this.layout;
    this.comboText.setText(`Combo x${combo}!`);
    this.comboText.setAlpha(1).setScale(0.7).setPosition(hud.combo.cx, hud.combo.cy);

    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: this.comboText,
      alpha: 0,
      y: hud.combo.cy - 26 * this.layout.ui,
      delay: 500,
      duration: 500,
    });
  }

  showScorePopup(x: number, y: number, amount: number): void {
    const ui = this.layout.ui;
    const popup = this.scene.add
      .text(x, y - 20 * ui, `+${amount}`, {
        fontFamily: FONT_UI,
        fontSize: fontSize(32, ui),
        color: HEX.green,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH);
    popup.setShadow(0, 3, '#0d0620', 6, false, true);

    this.scene.tweens.add({
      targets: popup,
      y: y - 96 * ui,
      alpha: 0,
      duration: 760,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  flashGoalReached(): void {
    const { hud, ui } = this.layout;
    const banner = this.scene.add
      .text(hud.banner.cx, hud.banner.cy, 'LEGENDARY!', {
        fontFamily: FONT_UI,
        fontSize: fontSize(44, ui),
        color: HEX.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1)
      .setScale(0.5);
    banner.setShadow(0, 6, '#2a0d4d', 10, false, true);

    this.scene.tweens.add({
      targets: banner,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 900,
      duration: 400,
      onComplete: () => banner.destroy(),
    });
  }
}
