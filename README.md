# Potion Merge

A single-player 2D merge game built with **Phaser 3** and **TypeScript**, packaged as a single self-contained HTML file for playable-ad networks such as AppLovin.

Drag identical potions together to brew higher tiers. Create a **Legendary Potion** before your 30 moves run out.

## Deliverables

| Deliverable | Where |
| --- | --- |
| Playable HTML build | `dist/index.html` — one self-contained file, ~1.5 MB, no network requests |
| Source | this repository |

Produce the build with `npm run build`, then open `dist/index.html` by double-clicking it — it needs no web server, no install step and no internet connection. `dist/` is listed in `.gitignore`, so build locally if the file is not present in your copy.

## Game Concept

Merge matching items on a 4x5 grid to climb six tiers:

**Herb → Herb Bundle → Flask → Potion → Rare Potion → Legendary Potion**

- Every valid merge scores points, with a combo multiplier for quick successive merges.
- A fresh low-tier item spawns after each merge.
- **Win:** brew a Legendary Potion.
- **Lose:** run out of moves, or fill the board with no valid merges left.

A full session runs roughly 30-60 seconds, which suits the playable-ad format.

## Responsive Layout

The canvas always matches the viewport exactly (`Phaser.Scale.RESIZE`), so there are no letterbox bars on any device. Rather than scaling one fixed design resolution, every scene rebuilds its layout from the live canvas size via `src/utils/layout.ts`, which produces two arrangements:

- **Portrait** (phones, tablets): HUD bar on top, board centred, tier ladder pinned to the bottom.
- **Landscape** (desktop, rotated tablets): score, moves, tier ladder and hint move into a vertically centred column beside the board, so wide windows stay filled instead of showing a narrow strip. The menu and result screens split into two columns as well.

Board cell size, panel radii, icon sizes and every font size are derived from the current viewport, and the result screen measures its own content stack so nothing overflows on short windows.

Resizing or rotating mid-game is handled live: the board redraws, items are repositioned by grid coordinate, and the HUD relayouts without losing score or moves. The stateless menu and result scenes rebuild themselves after a debounce.

## Controls

- **Mouse or touch:** drag a potion onto an identical potion to merge them.
- A gold ring highlights the potion you are about to merge with.
- Invalid drops tween back to their original cell.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Install

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`).

### Build the production playable

```bash
npm run build
```

The output is a single self-contained file at `dist/index.html` (~1.5 MB). `vite-plugin-singlefile` inlines the JS and CSS, and all artwork is already embedded as base64, so the file makes **zero network requests** at runtime.

### Preview the production build

```bash
npm run preview
```

## Automated Checks

Two Puppeteer scripts cover the QA checklist:

```bash
npm run test:play   # dev server: plays a real drag session to a win on phone, tablet and desktop viewports
npm run test:dist   # dist/index.html: asserts no console output or network calls at three viewport sizes
```

`test:play` also rotates the viewport mid-game to confirm the board relayouts and stays draggable. Both report any console errors or warnings, and `test:dist` prints the bundle size and any external requests. Screenshots land in `scripts/shots/`.

## Art Pipeline

All textures are authored as inline SVG in `scripts/generateAssets.mjs` and compiled to base64 data URIs:

```bash
npm run generate-assets
```

This writes `src/assets/base64Assets.ts` and runs automatically before every build. The whole art set is about **16 KB**, which leaves the size budget dominated by the Phaser runtime itself.

Two details matter for feel:

- Each icon is authored so its visual bounding box is centred on the texture, which keeps the drag hit areas aligned with the artwork.
- Phaser offsets a Container's hit-test point by its `displayOrigin`, so item and button hit areas are defined starting at `(0, 0)` rather than `(-w/2, -h/2)`. Getting this wrong shifts the clickable region by half a cell.

## Project Structure

```
index.html                  playable container
scripts/
  generateAssets.mjs        SVG -> base64 texture generator
  smoke-test.mjs            headless play-through
  verify-dist.mjs           production build verification
src/
  main.ts                   Phaser bootstrap, scale + pointer-bounds handling
  config/gameConfig.ts      constants and tuning knobs
  data/itemTiers.ts         tier metadata and merge rules
  scenes/                   Preload -> Menu -> Game -> Result
  utils/layout.ts           responsive layout engine (portrait + landscape)
  systems/
    MergeBoardSystem.ts     grid occupancy, merge validation
    DragDropSystem.ts       pointer drag, snapping, merge targeting
    SpawnSystem.ts          seeded weighted spawning
    ScoreSystem.ts          scoring and combos
    ObjectiveSystem.ts      win/lose evaluation
  objects/MergeItem.ts      draggable board item
  ui/
    theme.ts                palette, panels, buttons
    background.ts           gradient backdrop + drifting glows
    HudUi.ts                score, moves, tier ladder, popups
  utils/                    layout, resize handling, seeded RNG, MRAID-aware CTA
  assets/base64Assets.ts    generated textures
```

## AppLovin / MRAID Notes

- The build is a single HTML file with no external asset requests.
- **CTA:** the **INSTALL NOW** button on the result screen opens an in-game **Coming Soon** overlay, because this build has no live store listing to point at. To ship it as a real playable, call `openCta(CTA_URL)` from `ResultScene.showComingSoon()`'s call site instead — `src/utils/cta.ts` already prefers `mraid.open(url)` when MRAID is present and falls back to `window.open`, and the destination is set by `CTA_URL` in `src/config/gameConfig.ts`.
- No audio is bundled, so there is no autoplay-policy interaction to manage.

## Assets & Licensing

Every asset in this project is original or permissively licensed:

- **Artwork** — all textures are hand-authored SVG in `scripts/generateAssets.mjs`, written for this project and compiled to base64. No third-party image files, sprite packs or downloaded art are used.
- **Fonts** — system font stacks only (Trebuchet MS / Verdana and Georgia / Palatino, with generic fallbacks). Nothing is bundled or fetched.
- **Audio** — none.
- **Third-party code** — Phaser 3 (MIT), Vite, TypeScript, `vite-plugin-singlefile` and Puppeteer (all MIT), used per `package.json`.

This project is released under the MIT license.

## Tuning

Everything balance-related lives in `src/config/gameConfig.ts`:

| Constant | Purpose |
| --- | --- |
| `MAX_MOVES` | move budget (difficulty) |
| `BOARD_ROWS` / `BOARD_COLS` | board size |
| `DESIGN_WIDTH` / `DESIGN_HEIGHT` | reference resolution for the UI scale multiplier |
| `TARGET_TIER_INDEX` | which tier wins the game |
| `SPAWN_WEIGHTS` | spawn mix across the low tiers |
| `COMBO_WINDOW_MS` | combo timing window |

The spawn mix seeds some tier-1 and tier-2 items because a pure tier-0 economy cannot reach tier 5 inside a short move budget: a Legendary Potion needs 31 merges from 32 herbs, but only about 16 when mid-tier items are seeded.

## Assumptions & Trade-offs

- **Vector SVG art** instead of bitmaps, to stay far inside the 5 MB budget while remaining crisp on high-DPI screens.
- **Move-based pressure** rather than a countdown, which reads more clearly in a very short session.
- **No audio** in this build, keeping the payload small and avoiding autoplay restrictions.
- **Single game mode** with no persistence or level progression, in order to polish one loop.
- **Fluid layout** driven by the real canvas size instead of a scaled fixed resolution, with a separate landscape arrangement. This costs a layout pass per scene but avoids letterboxing and cramped desktop views.
- **Debounced scene rebuild** on resize for the menu and result screens, since they hold no state; only the game scene relayouts in place.
- **Placeholder CTA.** With no real store listing behind this build, the install button shows a *Coming Soon* overlay rather than sending players to a dead URL. The MRAID-aware `openCta()` path is kept in the codebase so wiring a live store link is a one-line change.

## Future Improvements

- Power-ups: shuffle, tier boost, extra moves
- Level progression with varied objectives
- Sound effects and music, gated behind the first user interaction
- A live store CTA through `mraid.open()` in place of the Coming Soon overlay
- Analytics hooks for playable-ad funnels
- Undo and hint systems for accessibility

## License

MIT
