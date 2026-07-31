import Phaser from 'phaser';
import { getTierById } from '../data/itemTiers';

let nextItemId = 1;

/**
 * A single draggable board item with aura, hover, and lift feedback.
 *
 * Idle bobbing is applied to the inner sprite (not the container) so the hit
 * area never drifts away from the artwork.
 */
export class MergeItem extends Phaser.GameObjects.Container {
  readonly itemId: number;
  tier: number;
  row: number;
  col: number;
  isDragging = false;
  isLocked = false;

  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private aura: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private cellSize: number;
  private bob?: Phaser.Tweens.Tween;
  private auraPulse?: Phaser.Tweens.Tween;
  private ringPulse?: Phaser.Tweens.Tween;
  private hoverTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    tier: number,
    row: number,
    col: number,
    x: number,
    y: number,
    size: number
  ) {
    super(scene, x, y);
    this.itemId = nextItemId++;
    this.tier = tier;
    this.row = row;
    this.col = col;
    this.cellSize = size;

    this.shadow = scene.add.ellipse(0, 0, 10, 10, 0x000000, 0.32);
    this.aura = scene.add
      .image(0, 0, scene.textures.exists('aura') ? 'aura' : 'mote')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.45);
    this.ring = scene.add.graphics().setVisible(false);
    this.sprite = scene.add.image(0, 0, getTierById(tier).textureKey);

    this.add([this.shadow, this.aura, this.ring, this.sprite]);
    scene.add.existing(this);

    this.applyCellSize(size);
    this.tintAura();
    this.startBobbing();
    this.startAuraPulse();
    this.bindHover();
  }

  /** Re-scales all art and the hit area for a new cell size. */
  applyCellSize(size: number): void {
    this.cellSize = size;

    this.sprite.setDisplaySize(size * 0.92, size * 0.92);
    this.aura.setDisplaySize(size * 1.35, size * 1.35);
    this.shadow.setPosition(0, size * 0.38);
    this.shadow.setSize(size * 0.58, size * 0.15);

    this.ring.clear();
    this.ring.lineStyle(Math.max(3, size * 0.055), 0xffe08a, 1);
    this.ring.strokeCircle(0, 0, size * 0.48);
    this.ring.lineStyle(Math.max(2, size * 0.03), 0xffffff, 0.45);
    this.ring.strokeCircle(0, 0, size * 0.42);

    this.setSize(size, size);

    const half = size / 2;
    const radius = size * 0.48;
    if (this.input?.hitArea instanceof Phaser.Geom.Circle) {
      this.input.hitArea.setTo(half, half, radius);
    } else {
      this.setInteractive({
        hitArea: new Phaser.Geom.Circle(half, half, radius),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true,
        draggable: true,
      });
    }
  }

  private tintAura(): void {
    const color = getTierById(this.tier).color;
    this.aura.setTint(color);
  }

  private startBobbing(): void {
    this.bob = this.scene.tweens.add({
      targets: this.sprite,
      y: -Math.max(3, this.cellSize * 0.045),
      duration: Phaser.Math.Between(1200, 1800),
      delay: Phaser.Math.Between(0, 700),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startAuraPulse(): void {
    this.auraPulse = this.scene.tweens.add({
      targets: this.aura,
      alpha: { from: 0.28, to: 0.55 },
      scaleX: { from: 0.95, to: 1.08 },
      scaleY: { from: 0.95, to: 1.08 },
      duration: Phaser.Math.Between(1400, 2000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private bindHover(): void {
    this.on('pointerover', () => {
      if (this.isDragging || this.isLocked) return;
      this.hoverTween?.stop();
      this.hoverTween = this.scene.tweens.add({
        targets: this,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
      });
      this.aura.setAlpha(0.75);
    });

    this.on('pointerout', () => {
      if (this.isDragging || this.isLocked) return;
      this.hoverTween?.stop();
      this.hoverTween = this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
      });
    });
  }

  setBoardPosition(row: number, col: number, x: number, y: number): void {
    this.row = row;
    this.col = col;
    this.setPosition(x, y);
  }

  upgradeTier(newTier: number): void {
    this.tier = newTier;
    this.sprite.setTexture(getTierById(newTier).textureKey);
    this.sprite.setDisplaySize(this.cellSize * 0.92, this.cellSize * 0.92);
    this.tintAura();
    this.playMergePulse();
  }

  /** Visual state for the item currently held by the pointer. */
  setLifted(lifted: boolean): void {
    if (lifted) {
      this.setScale(1.18);
      this.shadow.setAlpha(0.14);
      this.shadow.setScale(1.3);
      this.aura.setAlpha(0.85);
      this.sprite.setAlpha(1);
    } else {
      this.setScale(1);
      this.shadow.setAlpha(0.32);
      this.shadow.setScale(1);
      this.aura.setAlpha(0.45);
      this.sprite.setAlpha(1);
    }
  }

  /** Gold pulsing ring shown on a valid merge partner. */
  setTargetHighlight(active: boolean): void {
    if (active === this.ring.visible) return;

    if (active) {
      this.ring.setVisible(true);
      this.ring.setAlpha(1);
      this.ringPulse = this.scene.tweens.add({
        targets: this.ring,
        alpha: 0.4,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 320,
        yoyo: true,
        repeat: -1,
      });
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 140,
      });
    } else {
      this.ringPulse?.remove();
      this.ringPulse = undefined;
      this.ring.setVisible(false).setScale(1);
      if (!this.isDragging) {
        this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 120 });
      }
    }
  }

  playMergePulse(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.32,
      scaleY: 1.32,
      duration: 160,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  playSpawnAnimation(): void {
    this.setScale(0);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
  }

  lock(): void {
    this.isLocked = true;
    this.setTargetHighlight(false);
    this.disableInteractive();
  }

  unlock(): void {
    this.isLocked = false;
    if (!this.isDragging) {
      this.applyCellSize(this.cellSize);
    }
  }

  destroy(fromScene?: boolean): void {
    this.bob?.remove();
    this.auraPulse?.remove();
    this.ringPulse?.remove();
    this.hoverTween?.stop();
    super.destroy(fromScene);
  }

  static resetIdCounter(): void {
    nextItemId = 1;
  }
}
