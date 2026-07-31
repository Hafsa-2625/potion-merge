import Phaser from 'phaser';

export const FONT_UI = '"Trebuchet MS", Verdana, Geneva, sans-serif';
export const FONT_DISPLAY = 'Georgia, "Palatino Linotype", Palatino, "Times New Roman", serif';
/** @deprecated use FONT_UI – kept so older call sites keep compiling during the polish pass */
export const FONT = FONT_UI;

export const COLORS = {
  bgTop: 0x4a1d7a,
  bgMid: 0x2a1050,
  bgBottom: 0x0c0618,
  panel: 0x241048,
  panelLight: 0x3a1d68,
  panelStroke: 0xb48cff,
  panelStrokeSoft: 0x6e4aad,
  gold: 0xffe08a,
  goldDeep: 0xe0a030,
  text: 0xffffff,
  textDim: 0xd4c4f0,
  green: 0x6ef0a0,
  red: 0xff7a7a,
  button: 0xb45cff,
  buttonDeep: 0x6a28c4,
  buttonGreen: 0x3dcc7a,
  buttonGreenDeep: 0x1f8f4e,
  cell: 0x1a0c36,
  cellStroke: 0x7a55b8,
};

export const HEX = {
  text: '#ffffff',
  textDim: '#d4c4f0',
  gold: '#ffe08a',
  green: '#6ef0a0',
  red: '#ff7a7a',
};

export interface PanelOptions {
  radius?: number;
  fill?: number;
  fillAlpha?: number;
  stroke?: number;
  strokeAlpha?: number;
  strokeWidth?: number;
  gloss?: boolean;
  /** Gloss strip height as a fraction of panel height (default 0.18). */
  glossRatio?: number;
  glow?: boolean;
}

/**
 * Vertical centre of the title strip at the top of a panel. Layout only — nothing is
 * painted behind the title, so headings sit directly on the panel fill.
 */
export function panelHeaderY(
  cy: number,
  height: number,
  headerHeight: number,
  strokeWidth = 3
): number {
  return cy - height / 2 + strokeWidth + headerHeight / 2;
}

/** Repaints a rounded card into an existing Graphics object, centred on (x, y). */
export function paintPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {}
): void {
  const {
    radius = 28,
    fill = COLORS.panel,
    fillAlpha = 0.88,
    stroke = COLORS.panelStroke,
    strokeAlpha = 0.65,
    strokeWidth = 3,
    gloss = true,
    glossRatio = 0.18,
    glow = true,
  } = options;

  const safeRadius = Math.min(radius, width / 2, height / 2);
  const left = x - width / 2;
  const top = y - height / 2;

  g.clear();

  if (glow) {
    g.fillStyle(stroke, 0.12);
    g.fillRoundedRect(left - 6, top - 6, width + 12, height + 12, safeRadius + 6);
  }

  g.fillStyle(fill, fillAlpha);
  g.fillRoundedRect(left, top, width, height, safeRadius);

  const inset = strokeWidth;

  if (gloss) {
    // Soft top-down highlight. Drawn as thin strips with falling alpha so it fades out
    // instead of ending on a hard edge, and inset per-strip so it hugs the rounded corners.
    const glossLeft = left + inset;
    const glossWidth = width - inset * 2;
    const glossHeight = Math.max(1, Math.min(height * glossRatio, height - inset * 2));
    const cornerR = Math.max(0, safeRadius - inset);
    const steps = 18;
    const stepH = glossHeight / steps;

    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const alpha = 0.1 * (1 - t) * (1 - t);
      if (alpha < 0.004) break;

      const dy = i * stepH;
      const arcY = Math.min(dy + stepH / 2, cornerR);
      const cut = cornerR - Math.sqrt(Math.max(0, cornerR * cornerR - (cornerR - arcY) ** 2));

      g.fillStyle(0xffffff, alpha);
      g.fillRect(glossLeft + cut, top + inset + dy, glossWidth - cut * 2, stepH + 0.6);
    }
  }

  g.lineStyle(strokeWidth + 2, COLORS.panelStrokeSoft, strokeAlpha * 0.35);
  g.strokeRoundedRect(left, top, width, height, safeRadius);
  g.lineStyle(strokeWidth, stroke, strokeAlpha);
  g.strokeRoundedRect(left, top, width, height, safeRadius);
}

export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {}
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  paintPanel(g, x, y, width, height, options);
  return g;
}

export interface ButtonOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  fill?: number;
  fillDeep?: number;
  fontSize?: number;
  onClick: () => void;
}

/** Chunky tappable button with crisp hit area. */
export function createButton(
  scene: Phaser.Scene,
  options: ButtonOptions
): Phaser.GameObjects.Container {
  const {
    x,
    y,
    width = 300,
    height = 84,
    label,
    fill = COLORS.button,
    fillDeep = COLORS.buttonDeep,
    fontSize = 32,
    onClick,
  } = options;

  const container = scene.add.container(x, y);
  const radius = height / 2;
  const half = { w: width / 2, h: height / 2 };

  const glow = scene.add.graphics();
  glow.fillStyle(fill, 0.35);
  glow.fillRoundedRect(-half.w - 8, -half.h - 4, width + 16, height + 16, radius + 4);

  const base = scene.add.graphics();
  base.fillStyle(fillDeep, 1);
  base.fillRoundedRect(-half.w, -half.h + height * 0.12, width, height, radius);

  const face = scene.add.graphics();
  face.fillStyle(fill, 1);
  face.fillRoundedRect(-half.w, -half.h, width, height, radius);

  const text = scene.add
    .text(0, -1, label, {
      fontFamily: FONT_UI,
      fontSize: `${fontSize}px`,
      color: HEX.text,
      fontStyle: 'bold',
      stroke: '#2a0d4d',
      strokeThickness: Math.max(2, Math.round(fontSize * 0.08)),
    })
    .setOrigin(0.5);

  container.add([glow, base, face, text]);
  container.setSize(width, height);
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.45, to: 0.85 },
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  container.on('pointerover', () => {
    scene.tweens.add({ targets: container, scaleX: 1.06, scaleY: 1.06, duration: 120 });
  });
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.94,
      scaleY: 0.94,
      duration: 70,
      yoyo: true,
      onComplete: onClick,
    });
  });

  return container;
}

/** Display title with stroke + shadow for a sharper fantasy look. */
export function createTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontPx: number,
  color = HEX.gold
): Phaser.GameObjects.Text {
  const title = scene.add
    .text(x, y, text, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${Math.round(fontPx)}px`,
      color,
      fontStyle: 'bold',
      stroke: '#1a0830',
      strokeThickness: Math.max(4, Math.round(fontPx * 0.1)),
    })
    .setOrigin(0.5);
  title.setShadow(0, Math.round(fontPx * 0.08), '#000000', Math.round(fontPx * 0.18), false, true);
  return title;
}
