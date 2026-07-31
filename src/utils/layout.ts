import { BOARD_COLS, BOARD_ROWS, DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/gameConfig';

export interface Rect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface BoardMetrics {
  originX: number;
  originY: number;
  cell: number;
  gap: number;
  width: number;
  height: number;
}

export interface Layout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  isLandscape: boolean;
  /** Multiplier applied to every design-space font size and icon. */
  ui: number;
  pad: number;
  board: BoardMetrics;
  hud: {
    bar: Rect;
    ladder: Rect;
    hint: { cx: number; cy: number };
    combo: { cx: number; cy: number };
    banner: { cx: number; cy: number };
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Derives a full layout from the live canvas size.
 *
 * Portrait stacks the HUD above and the tier ladder below the board. Landscape
 * moves both into a column beside the board so wide desktop windows stay filled
 * instead of showing a narrow letterboxed strip.
 */
export function computeLayout(width: number, height: number): Layout {
  const isLandscape = width / height > 1.15;
  const minSide = Math.min(width, height);

  const pad = Math.round(clamp(minSide * 0.035, 10, 44));
  const gap = Math.round(clamp(minSide * 0.014, 5, 16));
  const ui = clamp(Math.min(width / DESIGN_WIDTH, height / 1040), 0.42, 1.7);

  const board: BoardMetrics = {
    originX: 0,
    originY: 0,
    cell: 0,
    gap,
    width: 0,
    height: 0,
  };

  const fitCell = (availableWidth: number, availableHeight: number): number =>
    Math.floor(
      Math.min(
        (availableWidth - (BOARD_COLS - 1) * gap) / BOARD_COLS,
        (availableHeight - (BOARD_ROWS - 1) * gap) / BOARD_ROWS
      )
    );

  const finishBoard = (areaX: number, areaY: number, areaW: number, areaH: number): void => {
    board.cell = Math.max(28, fitCell(areaW, areaH));
    board.width = BOARD_COLS * board.cell + (BOARD_COLS - 1) * gap;
    board.height = BOARD_ROWS * board.cell + (BOARD_ROWS - 1) * gap;
    board.originX = areaX + (areaW - board.width) / 2;
    board.originY = areaY + (areaH - board.height) / 2;
  };

  if (isLandscape) {
    const columnW = clamp(width * 0.26, 200, 400);
    const columnCx = pad + columnW / 2;

    const barH = clamp(height * 0.2, 90, 190);
    const ladderH = clamp(height * 0.16, 72, 150);
    const hintH = 30 * ui;
    const stackGap = pad * 0.7;

    const stackH = barH + stackGap + ladderH + stackGap + hintH;
    const stackTop = Math.max(pad, (height - stackH) / 2);

    const barCy = stackTop + barH / 2;
    const ladderCy = barCy + barH / 2 + stackGap + ladderH / 2;
    const hintCy = ladderCy + ladderH / 2 + stackGap + hintH / 2;

    const vPad = pad * 1.2;
    const boardAreaX = pad + columnW + pad * 0.6;
    const boardAreaW = width - boardAreaX - pad;
    finishBoard(boardAreaX, vPad, boardAreaW, height - vPad * 2);

    const boardCx = board.originX + board.width / 2;

    return {
      width,
      height,
      cx: width / 2,
      cy: height / 2,
      isLandscape,
      ui,
      pad,
      board,
      hud: {
        bar: { cx: columnCx, cy: barCy, w: columnW, h: barH },
        ladder: { cx: columnCx, cy: ladderCy, w: columnW, h: ladderH },
        hint: { cx: columnCx, cy: hintCy },
        combo: { cx: boardCx, cy: Math.max(vPad * 0.55, 18 * ui) },
        banner: { cx: columnCx, cy: hintCy + 34 * ui },
      },
    };
  }

  const barH = clamp(height * 0.085, 62, 132);
  const barW = Math.min(width - pad * 2, 760);
  const barCy = pad + barH / 2;

  const ladderH = clamp(height * 0.072, 52, 118);
  const ladderW = Math.min(width - pad * 2, 700);
  const hintH = 30 * ui;
  const ladderCy = height - pad - hintH - ladderH / 2;
  const hintCy = height - pad - hintH / 2;

  const areaTop = barCy + barH / 2 + pad;
  const areaBottom = ladderCy - ladderH / 2 - pad;
  const areaW = Math.min(width - pad * 2, 760);
  finishBoard((width - areaW) / 2, areaTop, areaW, Math.max(120, areaBottom - areaTop));

  return {
    width,
    height,
    cx: width / 2,
    cy: height / 2,
    isLandscape,
    ui,
    pad,
    board,
    hud: {
      bar: { cx: width / 2, cy: barCy, w: barW, h: barH },
      ladder: { cx: width / 2, cy: ladderCy, w: ladderW, h: ladderH },
      hint: { cx: width / 2, cy: hintCy },
      combo: { cx: width / 2, cy: barCy + barH / 2 + 22 * ui },
      banner: {
        cx: width / 2,
        cy: Math.max(board.originY + board.height + 30 * ui, ladderCy - ladderH / 2 - 26 * ui),
      },
    },
  };
}

/** World position of a grid cell's centre. */
export function cellToWorld(row: number, col: number, board: BoardMetrics): { x: number; y: number } {
  return {
    x: board.originX + col * (board.cell + board.gap) + board.cell / 2,
    y: board.originY + row * (board.cell + board.gap) + board.cell / 2,
  };
}

/** Scales a design-space font size into the current layout. */
export function fontSize(base: number, ui: number, min = 11): string {
  return `${Math.max(min, Math.round(base * ui))}px`;
}

export const DESIGN = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
