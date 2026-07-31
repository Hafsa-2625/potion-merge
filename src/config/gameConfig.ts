/**
 * Reference resolution. The game renders at the real canvas size, so these are
 * only used to derive the UI scale multiplier in the layout engine.
 */
export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

export const BOARD_ROWS = 5;
export const BOARD_COLS = 4;

export const MAX_MOVES = 30;
export const TARGET_TIER_INDEX = 5; // legendaryPotion

export const COMBO_WINDOW_MS = 1500;
export const COMBO_MULTIPLIER_STEP = 0.5;
export const MAX_COMBO_MULTIPLIER = 3;

/**
 * Spawn mix is weighted towards low tiers but seeds enough mid-tier items that
 * the legendary goal stays reachable inside the move budget.
 */
export const SPAWN_WEIGHTS = {
  tier0: 0.55,
  tier1: 0.35,
  tier2: 0.1,
};

export const CTA_URL = 'https://example.com/install';

export const SCENE_KEYS = {
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  RESULT: 'ResultScene',
} as const;

export const TEXTURE_KEYS = {
  HERB: 'herb',
  HERB_BUNDLE: 'herbBundle',
  FLASK: 'flask',
  POTION: 'potion',
  RARE_POTION: 'rarePotion',
  LEGENDARY_POTION: 'legendaryPotion',
  SPARKLE: 'sparkle',
  BUBBLE: 'bubble',
} as const;

export interface GameResultData {
  won: boolean;
  score: number;
  highestTier: number;
  movesUsed: number;
}

export interface HudState {
  score: number;
  movesLeft: number;
  highestTier: number;
  targetTier: number;
}
