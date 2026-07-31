import Phaser from 'phaser';
import { GameResultData, SCENE_KEYS } from '../config/gameConfig';
import { getTierById } from '../data/itemTiers';
import { Layout, computeLayout, fontSize } from '../utils/layout';
import { SceneBackground } from '../ui/background';
import { COLORS, FONT_UI, HEX, createButton, createTitle, drawPanel } from '../ui/theme';
import { attachResponsiveRebuild } from '../utils/sceneResize';

interface Metrics {
  headingH: number;
  headingFs: number;
  trophySize: number;
  nameH: number;
  nameFs: number;
  rowH: number;
  rowFs: number;
  valueFs: number;
  gap: number;
  cardPad: number;
  radius: number;
  btnH: number;
  btnFs: number;
  btnGap: number;
}

function metricsFor(u: number): Metrics {
  return {
    headingH: 60 * u,
    headingFs: 50 * u,
    trophySize: 136 * u,
    nameH: 40 * u,
    nameFs: 25 * u,
    rowH: 42 * u,
    rowFs: 23 * u,
    valueFs: 27 * u,
    gap: 16 * u,
    cardPad: 24 * u,
    radius: 34 * u,
    btnH: 84 * u,
    btnFs: 27 * u,
    btnGap: 16 * u,
  };
}

export class ResultScene extends Phaser.Scene {
  private resultData!: GameResultData;
  private layout!: Layout;
  private comingSoonOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.RESULT);
  }

  init(data: GameResultData): void {
    // Guard against a resize-triggered restart arriving without data.
    this.resultData = data ?? this.resultData;
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.layout = computeLayout(width, height);
    // A resize rebuild re-runs create() on the same instance, so drop the stale handle.
    this.comingSoonOverlay = undefined;
    new SceneBackground(this, width, height, 10);

    if (this.resultData.won) {
      this.launchConfetti();
    }

    if (this.layout.isLandscape) {
      this.buildLandscape();
    } else {
      this.buildPortrait();
    }

    attachResponsiveRebuild(this, this.resultData);
  }

  /** Single centred column: card with heading, trophy and stats, buttons below. */
  private buildPortrait(): void {
    const { width, height, cx, ui, pad } = this.layout;
    const cardW = Math.min(width - pad * 2, 620 * ui);

    const natural = metricsFor(ui);
    const naturalH = this.portraitHeight(natural);
    const fit = Math.min(1, (height - pad * 2) / naturalH);
    const m = metricsFor(ui * fit);

    const totalH = this.portraitHeight(m);
    let y = (height - totalH) / 2;

    const cardH = this.cardHeight(m);
    drawPanel(this, cx, y + cardH / 2, cardW, cardH, { radius: m.radius });

    let inner = y + m.cardPad;
    this.heading(cx, inner + m.headingH / 2, m.headingFs);
    inner += m.headingH + m.gap;

    this.trophy(cx, inner + m.trophySize / 2, m.trophySize, m.nameFs, m.nameH);
    inner += m.trophySize + m.nameH + m.gap;

    this.statBlock(cx, inner + m.rowH / 2, cardW * 0.76, m);

    y += cardH + m.btnGap * 1.5;
    const btnW = Math.min(cardW * 0.62, 340 * ui * fit);

    this.actionButton(cx, y + m.btnH / 2, btnW, m, 'PLAY AGAIN', false);
    y += m.btnH + m.btnGap;
    this.actionButton(cx, y + m.btnH / 2, btnW, m, 'INSTALL NOW', true);
  }

  /** Two columns: outcome on the left, stats and actions on the right. */
  private buildLandscape(): void {
    const { width, height, ui, pad } = this.layout;
    const leftCx = width * 0.29;
    const rightCx = width * 0.72;
    const columnW = Math.min(width * 0.4 - pad, 520 * ui);

    const natural = metricsFor(ui);
    const naturalLeft = natural.headingH + natural.gap * 2 + natural.trophySize + natural.nameH;
    const naturalRight =
      natural.cardPad * 2 + natural.rowH * 3 + natural.gap * 2 + natural.btnH * 2 + natural.btnGap;
    const fit = Math.min(
      1,
      (height - pad * 2) / Math.max(naturalLeft, naturalRight)
    );
    const m = metricsFor(ui * fit);

    // Left column
    const leftH = m.headingH + m.gap * 2 + m.trophySize + m.nameH;
    let ly = (height - leftH) / 2;
    this.heading(leftCx, ly + m.headingH / 2, m.headingFs);
    ly += m.headingH + m.gap * 2;
    this.trophy(leftCx, ly + m.trophySize / 2, m.trophySize, m.nameFs, m.nameH);

    // Right column
    const statsH = m.cardPad * 2 + m.rowH * 3;
    const rightH = statsH + m.btnGap * 1.5 + m.btnH * 2 + m.btnGap;
    let ry = (height - rightH) / 2;

    drawPanel(this, rightCx, ry + statsH / 2, columnW, statsH, { radius: m.radius });
    this.statBlock(rightCx, ry + m.cardPad + m.rowH / 2, columnW * 0.78, m);

    ry += statsH + m.btnGap * 1.5;
    const btnW = Math.min(columnW * 0.8, 320 * ui * fit);

    this.actionButton(rightCx, ry + m.btnH / 2, btnW, m, 'PLAY AGAIN', false);
    ry += m.btnH + m.btnGap;
    this.actionButton(rightCx, ry + m.btnH / 2, btnW, m, 'INSTALL NOW', true);
  }

  private cardHeight(m: Metrics): number {
    return (
      m.cardPad * 2 + m.headingH + m.gap + m.trophySize + m.nameH + m.gap + m.rowH * 3
    );
  }

  private portraitHeight(m: Metrics): number {
    return this.cardHeight(m) + m.btnGap * 1.5 + m.btnH * 2 + m.btnGap;
  }

  private heading(cx: number, cy: number, fontPx: number): void {
    const title = createTitle(
      this,
      cx,
      cy,
      this.resultData.won ? 'You Win!' : 'Out of Moves',
      fontPx,
      this.resultData.won ? HEX.gold : HEX.red
    ).setScale(0.6);

    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      duration: 380,
      ease: 'Back.easeOut',
    });
  }

  private trophy(cx: number, cy: number, size: number, nameFs: number, nameH: number): void {
    const tier = getTierById(this.resultData.highestTier);

    const icon = this.add.image(cx, cy, tier.textureKey);
    icon.setDisplaySize(size, size);
    this.tweens.add({
      targets: icon,
      y: cy - size * 0.08,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(cx, cy + size / 2 + nameH / 2, tier.name, {
        fontFamily: FONT_UI,
        fontSize: `${Math.round(nameFs)}px`,
        color: HEX.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private statBlock(cx: number, firstRowCy: number, rowW: number, m: Metrics): void {
    const { score, movesUsed, highestTier } = this.resultData;
    const rows: [string, string][] = [
      ['Final Score', `${score}`],
      ['Moves Used', `${movesUsed}`],
      ['Highest Tier', `${highestTier + 1} / 6`],
    ];

    rows.forEach(([label, value], index) => {
      const y = firstRowCy + index * m.rowH;

      this.add
        .text(cx - rowW / 2, y, label, {
          fontFamily: FONT_UI,
          fontSize: `${Math.round(m.rowFs)}px`,
          color: HEX.textDim,
        })
        .setOrigin(0, 0.5);

      this.add
        .text(cx + rowW / 2, y, value, {
          fontFamily: FONT_UI,
          fontSize: `${Math.round(m.valueFs)}px`,
          color: HEX.text,
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
    });
  }

  private actionButton(
    cx: number,
    cy: number,
    width: number,
    m: Metrics,
    label: string,
    isCta: boolean
  ): void {
    createButton(this, {
      x: cx,
      y: cy,
      width,
      height: m.btnH,
      label,
      fontSize: Math.round(Math.min(m.btnFs, m.btnH * 0.4)),
      fill: isCta ? COLORS.buttonGreen : COLORS.button,
      fillDeep: isCta ? COLORS.buttonGreenDeep : COLORS.buttonDeep,
      onClick: isCta ? () => this.showComingSoon() : () => this.scene.start(SCENE_KEYS.GAME),
    });
  }

  /** Placeholder for the store CTA until the game actually ships. */
  private showComingSoon(): void {
    if (this.comingSoonOverlay) return;

    const { width, height, cx, cy, ui, pad } = this.layout;
    const overlay = this.add.container(0, 0).setDepth(1000).setAlpha(0);

    const dimmer = this.add.rectangle(cx, cy, width, height, 0x0d0620, 0.78).setInteractive();

    const cardW = Math.min(width - pad * 2, 520 * ui);
    const cardH = Math.min(height - pad * 2, 320 * ui);
    const card = drawPanel(this, cx, cy, cardW, cardH, { radius: 34 * ui, gloss: false });

    const title = this.add
      .text(cx, cy - cardH * 0.26, 'COMING SOON', {
        fontFamily: FONT_UI,
        fontSize: fontSize(38, ui),
        color: HEX.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = this.add
      .text(cx, cy, 'Potion Merge is still brewing.\nThe full game lands on the stores soon.', {
        fontFamily: FONT_UI,
        fontSize: fontSize(22, ui),
        color: HEX.text,
        align: 'center',
        lineSpacing: 8 * ui,
      })
      .setOrigin(0.5);

    const buttonH = Math.min(72 * ui, cardH * 0.22);
    const okButton = createButton(this, {
      x: cx,
      y: cy + cardH * 0.31,
      width: Math.min(cardW * 0.5, 240 * ui),
      height: buttonH,
      label: 'GOT IT',
      fontSize: Math.round(Math.min(28 * ui, buttonH * 0.42)),
      onClick: () => this.hideComingSoon(),
    });

    overlay.add([dimmer, card, title, body, okButton]);
    dimmer.on('pointerdown', () => this.hideComingSoon());

    this.comingSoonOverlay = overlay;
    this.tweens.add({ targets: overlay, alpha: 1, duration: 180, ease: 'Cubic.easeOut' });
  }

  private hideComingSoon(): void {
    const overlay = this.comingSoonOverlay;
    if (!overlay) return;

    this.comingSoonOverlay = undefined;
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 150,
      ease: 'Cubic.easeIn',
      onComplete: () => overlay.destroy(true),
    });
  }

  private launchConfetti(): void {
    const { width, height } = this.layout;
    const minSide = Math.min(width, height);

    for (let i = 0; i < 26; i++) {
      const sparkle = this.add.image(
        Phaser.Math.Between(Math.round(width * 0.06), Math.round(width * 0.94)),
        Phaser.Math.Between(-Math.round(height * 0.2), -20),
        'sparkle'
      );
      const size = Phaser.Math.Between(Math.round(minSide * 0.02), Math.round(minSide * 0.04));
      sparkle.setDisplaySize(size, size);
      sparkle.setDepth(-10);
      sparkle.setAlpha(0.85);

      this.tweens.add({
        targets: sparkle,
        y: height + 60,
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(2200, 4200),
        delay: Phaser.Math.Between(0, 1600),
        repeat: -1,
      });
    }
  }
}
