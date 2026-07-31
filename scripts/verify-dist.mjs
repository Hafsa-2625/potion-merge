/**
 * Verifies the single-file production build: bundle size, no console output,
 * no network requests, and a playable board at several viewport sizes.
 *
 * Run after `npm run build`: npm run test:dist
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { statSync, mkdirSync } from 'fs';
import { clickButton, collectProblems, readBoard, wait } from './lib/harness.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distFile = path.join(root, 'dist', 'index.html');
const shotDir = path.join(root, 'scripts', 'shots');
mkdirSync(shotDir, { recursive: true });

const VIEWPORTS = [
  { name: 'dist-phone', width: 390, height: 844 },
  { name: 'dist-tablet', width: 834, height: 1112 },
  { name: 'dist-desktop', width: 1600, height: 900 },
];

const browser = await puppeteer.launch({ headless: true });
const report = { distSizeMb: Number((statSync(distFile).size / (1024 * 1024)).toFixed(2)), views: [] };

for (const viewport of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });

  const problems = collectProblems(page);
  const externalRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('file:') && !url.startsWith('data:')) externalRequests.push(url);
  });

  await page.goto(pathToFileURL(distFile).href, { waitUntil: 'load' });
  await wait(2400);
  await page.screenshot({ path: path.join(shotDir, `${viewport.name}-menu.png`) });

  const started = await clickButton(page, 'START');
  await wait(1000);
  await clickButton(page, 'PLAY');
  await wait(800);
  await page.screenshot({ path: path.join(shotDir, `${viewport.name}-board.png`) });

  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { width: c.width, height: c.height } : null;
  });

  report.views.push({
    view: viewport.name,
    size: `${viewport.width}x${viewport.height}`,
    canvas,
    startedFromMenu: started,
    boardReadable: (await readBoard(page)) !== null,
    externalRequests,
    problems,
  });

  await page.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
