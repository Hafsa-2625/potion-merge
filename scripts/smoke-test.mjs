/**
 * Responsive play-through check.
 *
 * Boots the dev server and, for several viewport sizes (phone, tablet, desktop),
 * verifies the menu renders, drag-to-merge works, and the goal is reachable.
 * Screenshots land in scripts/shots/.
 *
 * Run: npm run test:play
 */
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import {
  activeScenes,
  clickButton,
  collectProblems,
  playSession,
  wait,
} from './lib/harness.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = path.join(root, 'scripts', 'shots');
mkdirSync(shotDir, { recursive: true });

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 810 },
];

const server = await createServer({ root, server: { port: 5197 } });
await server.listen();

const browser = await puppeteer.launch({ headless: true });
const results = [];

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });
  const problems = collectProblems(page);

  await page.goto('http://localhost:5197/', { waitUntil: 'networkidle0', timeout: 20000 });
  await wait(2200);
  await page.screenshot({ path: path.join(shotDir, `${viewport.name}-1-menu.png`) });

  const started = await clickButton(page, 'START');
  await wait(1000);

  const dismissed = await clickButton(page, 'PLAY');
  await wait(800);
  await page.screenshot({ path: path.join(shotDir, `${viewport.name}-2-board.png`) });

  const session = await playSession(page);
  await wait(1800);
  await page.screenshot({ path: path.join(shotDir, `${viewport.name}-3-result.png`) });

  results.push({
    viewport: viewport.name,
    size: `${viewport.width}x${viewport.height}`,
    started,
    dismissed,
    merges: session.attempts,
    bestTier: session.bestTier,
    endedOn: await activeScenes(page),
    problems,
  });

  await page.close();
}

// Resize mid-game to confirm the board relayouts without breaking input.
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
const resizeProblems = collectProblems(page);
await page.goto('http://localhost:5197/', { waitUntil: 'networkidle0' });
await wait(2200);
await clickButton(page, 'START');
await wait(900);
await clickButton(page, 'PLAY');
await wait(700);

await page.setViewport({ width: 1280, height: 720 });
await wait(900);
await page.screenshot({ path: path.join(shotDir, 'resize-landscape.png') });
const afterResize = await playSession(page, 6);

results.push({
  viewport: 'rotate 420x900 -> 1280x720',
  mergesAfterResize: afterResize.attempts,
  bestTier: afterResize.bestTier,
  problems: resizeProblems,
});

console.log(JSON.stringify(results, null, 2));

await browser.close();
await server.close();
