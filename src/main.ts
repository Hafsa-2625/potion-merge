import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

/**
 * Cap DPR so 3x/4x phones don't explode GPU cost while still looking sharp
 * on Windows display scaling and retina screens.
 */
function pixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function viewportSize(parent: HTMLElement): {
  cssW: number;
  cssH: number;
  gameW: number;
  gameH: number;
} {
  const cssW = parent.clientWidth || window.innerWidth;
  const cssH = parent.clientHeight || window.innerHeight;
  const dpr = pixelRatio();
  return {
    cssW,
    cssH,
    gameW: Math.max(1, Math.round(cssW * dpr)),
    gameH: Math.max(1, Math.round(cssH * dpr)),
  };
}

/** Match the canvas CSS box to the viewport while the buffer stays at DPR size. */
function applyDisplaySize(game: Phaser.Game, cssW: number, cssH: number): void {
  game.canvas.style.width = `${cssW}px`;
  game.canvas.style.height = `${cssH}px`;
  game.scale.updateBounds();
}

function bootGame(): void {
  const parent = document.getElementById('game-container');
  if (!parent) return;

  const initial = viewportSize(parent);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#120727',
    width: initial.gameW,
    height: initial.gameH,
    scale: {
      // We own resize so the backing store stays at device-pixel size.
      // Phaser.Scale.RESIZE alone would reset the buffer to 1x CSS pixels.
      mode: Phaser.Scale.NONE,
      width: initial.gameW,
      height: initial.gameH,
      autoCenter: Phaser.Scale.NO_CENTER,
      expandParent: false,
    },
    scene: [PreloadScene, MenuScene, GameScene, ResultScene],
    input: {
      activePointers: 2,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
  });

  applyDisplaySize(game, initial.cssW, initial.cssH);

  const onResize = (): void => {
    const next = viewportSize(parent);
    if (next.gameW === game.scale.width && next.gameH === game.scale.height) {
      applyDisplaySize(game, next.cssW, next.cssH);
      return;
    }
    game.scale.resize(next.gameW, next.gameH);
    applyDisplaySize(game, next.cssW, next.cssH);
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  window.addEventListener('scroll', () => game.scale.updateBounds(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onResize();
  });

  // Exposed in every build so the automated QA harness can drive the shipped
  // single-file artifact, not just the dev server.
  (window as unknown as Record<string, unknown>).__POTION_GAME__ = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
