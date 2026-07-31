import Phaser from 'phaser';
import { COLORS } from './theme';

/**
 * Full-bleed fantasy backdrop: gradient, soft edge vignette, and drifting motes.
 */
export class SceneBackground {
  private scene: Phaser.Scene;
  private gradient: Phaser.GameObjects.Graphics;
  private vignette: Phaser.GameObjects.Graphics;
  private motes: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, width: number, height: number, moteCount = 16) {
    this.scene = scene;

    this.gradient = scene.add.graphics().setDepth(-30);
    this.vignette = scene.add.graphics().setDepth(-28);

    const moteKey = scene.textures.exists('mote') ? 'mote' : 'bubble';
    for (let i = 0; i < moteCount; i++) {
      const mote = scene.add.image(0, 0, moteKey).setDepth(-25);
      mote.setBlendMode(Phaser.BlendModes.ADD);
      this.motes.push(mote);
    }

    this.resize(width, height);
    this.startDrift(height);
  }

  private startDrift(height: number): void {
    for (const mote of this.motes) {
      this.scene.tweens.add({
        targets: mote,
        y: `-=${Phaser.Math.Between(280, 520)}`,
        x: `+=${Phaser.Math.Between(-40, 40)}`,
        duration: Phaser.Math.Between(10000, 18000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 6000),
        onRepeat: () => {
          const size = Math.max(this.scene.scale.height, height);
          mote.y = size + mote.displayHeight;
          mote.x = Phaser.Math.Between(0, this.scene.scale.width);
        },
      });
    }
  }

  resize(width: number, height: number): void {
    this.gradient.clear();
    this.gradient.fillGradientStyle(
      COLORS.bgTop,
      COLORS.bgTop,
      COLORS.bgBottom,
      COLORS.bgBottom,
      1
    );
    this.gradient.fillRect(0, 0, width, height);

    const band = Math.min(160, height * 0.18);
    this.vignette.clear();
    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.35, 0.35, 0, 0);
    this.vignette.fillRect(0, 0, width, band);
    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.4, 0.4);
    this.vignette.fillRect(0, height - band, width, band);

    const scale = Math.min(width, height);
    for (const mote of this.motes) {
      const size = Phaser.Math.Between(Math.round(scale * 0.08), Math.round(scale * 0.24));
      mote.setDisplaySize(size, size);
      mote.setAlpha(Phaser.Math.FloatBetween(0.12, 0.32));
      if (mote.x > width || mote.y > height || mote.x === 0) {
        mote.setPosition(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height));
      }
    }
  }
}
