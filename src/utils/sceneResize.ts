import Phaser from 'phaser';

const REBUILD_DELAY_MS = 220;

/**
 * Rebuilds a stateless scene after the canvas settles at a new size.
 *
 * Menu and Result hold no gameplay state, so a debounced restart is both simpler
 * and more reliable than repositioning every element by hand.
 */
export function attachResponsiveRebuild(scene: Phaser.Scene, data?: object): void {
  let pending: Phaser.Time.TimerEvent | undefined;
  let lastWidth = scene.scale.gameSize.width;
  let lastHeight = scene.scale.gameSize.height;

  const onResize = (gameSize: Phaser.Structs.Size) => {
    if (gameSize.width === lastWidth && gameSize.height === lastHeight) return;
    lastWidth = gameSize.width;
    lastHeight = gameSize.height;

    pending?.remove();
    pending = scene.time.delayedCall(REBUILD_DELAY_MS, () => {
      if (scene.scene.isActive()) {
        scene.scene.restart(data);
      }
    });
  };

  scene.scale.on('resize', onResize);
  scene.events.once('shutdown', () => {
    pending?.remove();
    scene.scale.off('resize', onResize);
  });
}
