import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/gameConfig';
import { BASE64_ASSETS } from '../assets/base64Assets';
import { ITEM_TIERS } from '../data/itemTiers';
import { computeLayout, fontSize } from '../utils/layout';
import { COLORS, FONT_DISPLAY, HEX } from '../ui/theme';

/** Raster target. SVG intrinsic size is small; drawing into this canvas keeps icons sharp on HiDPI. */
const TEXTURE_SIZE = 512;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    const layout = computeLayout(width, height);
    const { cx, cy, ui } = layout;

    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    bg.fillRect(0, 0, width, height);

    this.add
      .text(cx, cy - 70 * ui, 'Potion Merge', {
        fontFamily: FONT_DISPLAY,
        fontSize: fontSize(48, ui),
        color: HEX.gold,
        fontStyle: 'bold',
        stroke: '#2a0d4d',
        strokeThickness: Math.max(4, Math.round(6 * ui)),
      })
      .setOrigin(0.5);

    const barWidth = Math.min(width * 0.55, 380 * ui);
    const barHeight = Math.max(12, 18 * ui);
    const barX = cx - barWidth / 2;
    const barY = cy + 10 * ui;

    const track = this.add.graphics();
    track.fillStyle(0x000000, 0.4);
    track.fillRoundedRect(barX, barY, barWidth, barHeight, barHeight / 2);
    track.lineStyle(2, COLORS.panelStroke, 0.45);
    track.strokeRoundedRect(barX, barY, barWidth, barHeight, barHeight / 2);

    const fill = this.add.graphics();
    const drawFill = (progress: number) => {
      fill.clear();
      if (progress <= 0) return;
      fill.fillStyle(COLORS.gold, 1);
      fill.fillRoundedRect(
        barX,
        barY,
        Math.max(barHeight, barWidth * progress),
        barHeight,
        barHeight / 2
      );
    };

    this.loadEmbeddedTextures(drawFill).then(() => {
      this.ensureMissingTextures();
      this.createEffectTextures();
      this.time.delayedCall(100, () => this.scene.start(SCENE_KEYS.MENU));
    });
  }

  /**
   * Decode each SVG data URI, then rasterise into a high-res canvas texture.
   * Feeding the raw Image into Phaser kept the 256px bitmap and looked soft
   * once cells grew past that on desktop / retina.
   */
  private loadEmbeddedTextures(onProgress: (progress: number) => void): Promise<void> {
    const entries = Object.entries(BASE64_ASSETS).filter(([, uri]) => Boolean(uri));
    if (entries.length === 0) {
      onProgress(1);
      return Promise.resolve();
    }

    let loaded = 0;
    onProgress(0);

    const jobs = entries.map(
      ([key, uri]) =>
        new Promise<void>((resolve) => {
          if (this.textures.exists(key)) {
            resolve();
            return;
          }

          const image = new Image();
          const done = () => {
            loaded++;
            onProgress(loaded / entries.length);
            resolve();
          };

          image.onload = () => {
            try {
              if (!this.textures.exists(key)) {
                const canvas = document.createElement('canvas');
                canvas.width = TEXTURE_SIZE;
                canvas.height = TEXTURE_SIZE;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';
                  ctx.drawImage(image, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
                  this.textures.addCanvas(key, canvas);
                } else {
                  this.textures.addImage(key, image);
                }
              }
            } catch {
              // Fall through to ensureMissingTextures.
            }
            done();
          };
          image.onerror = () => done();
          image.src = uri;
        })
    );

    return Promise.all(jobs).then(() => undefined);
  }

  private ensureMissingTextures(): void {
    for (const tier of ITEM_TIERS) {
      if (this.textures.exists(tier.textureKey)) continue;

      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(tier.color, 1);
      g.fillCircle(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, TEXTURE_SIZE * 0.4);
      g.lineStyle(10, 0xffffff, 0.4);
      g.strokeCircle(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, TEXTURE_SIZE * 0.4);
      g.generateTexture(tier.textureKey, TEXTURE_SIZE, TEXTURE_SIZE);
      g.destroy();
    }

    for (const key of ['sparkle', 'bubble']) {
      if (this.textures.exists(key)) continue;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, key === 'bubble' ? 0.25 : 1);
      g.fillCircle(
        TEXTURE_SIZE / 2,
        TEXTURE_SIZE / 2,
        key === 'bubble' ? TEXTURE_SIZE * 0.45 : TEXTURE_SIZE * 0.18
      );
      g.generateTexture(key, TEXTURE_SIZE, TEXTURE_SIZE);
      g.destroy();
    }
  }

  /** Soft glow + particle discs drawn at runtime for consistent look. */
  private createEffectTextures(): void {
    if (!this.textures.exists('mote')) {
      const size = 256;
      const texture = this.textures.createCanvas('mote', size, size);
      if (texture) {
        const ctx = texture.getContext();
        const half = size / 2;
        const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
        gradient.addColorStop(0, 'rgba(255,230,170,0.55)');
        gradient.addColorStop(0.4, 'rgba(200,150,255,0.28)');
        gradient.addColorStop(1, 'rgba(120,80,200,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        texture.refresh();
      }
    }

    if (!this.textures.exists('particle')) {
      const size = 64;
      const texture = this.textures.createCanvas('particle', size, size);
      if (texture) {
        const ctx = texture.getContext();
        const half = size / 2;
        const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.35, 'rgba(255,230,150,0.9)');
        gradient.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        texture.refresh();
      }
    }

    if (!this.textures.exists('aura')) {
      const size = 256;
      const texture = this.textures.createCanvas('aura', size, size);
      if (texture) {
        const ctx = texture.getContext();
        const half = size / 2;
        const gradient = ctx.createRadialGradient(half, half, half * 0.2, half, half, half);
        gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
        gradient.addColorStop(0.55, 'rgba(255,220,140,0.12)');
        gradient.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        texture.refresh();
      }
    }
  }
}
