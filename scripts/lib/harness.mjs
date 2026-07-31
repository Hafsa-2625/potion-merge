/** Shared browser-driving helpers for the QA scripts. */

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function collectProblems(page) {
  const problems = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      problems.push(`console.${msg.type()}: ${msg.text()}`);
    }
  });
  return problems;
}

/** Converts game-space coordinates into page coordinates. */
export async function makeMapper(page) {
  const geom = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const game = window.__POTION_GAME__;
    return {
      left: rect.left,
      top: rect.top,
      scaleX: rect.width / game.scale.width,
      scaleY: rect.height / game.scale.height,
    };
  });

  return (x, y) => ({
    x: geom.left + x * geom.scaleX,
    y: geom.top + y * geom.scaleY,
  });
}

/** Finds a themed button by its label in whichever scene is active. */
export async function findButton(page, label) {
  return page.evaluate((wanted) => {
    const game = window.__POTION_GAME__;
    for (const scene of game.scene.scenes) {
      if (!scene.sys.isActive()) continue;

      const stack = [...scene.children.list];
      while (stack.length) {
        const obj = stack.pop();
        if (obj.type === 'Container') {
          const hasLabel = (obj.list ?? []).some(
            (child) => child.type === 'Text' && child.text === wanted
          );
          if (hasLabel) {
            const matrix = obj.getWorldTransformMatrix();
            return { x: matrix.tx, y: matrix.ty, scene: scene.scene.key };
          }
          stack.push(...(obj.list ?? []));
        }
      }
    }
    return null;
  }, label);
}

export async function clickButton(page, label) {
  const button = await findButton(page, label);
  if (!button) return false;

  const toPage = await makeMapper(page);
  const point = toPage(button.x, button.y);
  await page.mouse.click(point.x, point.y);
  return true;
}

/** Reads live merge items out of the running GameScene. */
export async function readBoard(page) {
  return page.evaluate(() => {
    const scene = window.__POTION_GAME__.scene.getScene('GameScene');
    if (!scene || !scene.sys.isActive()) return null;

    return scene.children.list
      .filter((c) => typeof c.itemId === 'number' && typeof c.tier === 'number')
      .map((c) => ({ id: c.itemId, tier: c.tier, x: c.x, y: c.y }));
  });
}

export async function activeScenes(page) {
  return page.evaluate(() =>
    window.__POTION_GAME__.scene.scenes.filter((s) => s.sys.isActive()).map((s) => s.scene.key)
  );
}

/** Plays merges until the goal tier is reached or no pairs remain. */
export async function playSession(page, maxAttempts = 40) {
  let attempts = 0;
  let bestTier = -1;

  while (attempts < maxAttempts) {
    attempts++;

    const items = await readBoard(page);
    if (!items || items.length < 2) break;

    bestTier = Math.max(bestTier, ...items.map((i) => i.tier));
    if (bestTier >= 5) break;

    const byTier = new Map();
    for (const item of items) {
      byTier.set(item.tier, [...(byTier.get(item.tier) ?? []), item]);
    }

    const pair = [...byTier.entries()]
      .filter(([tier, list]) => list.length >= 2 && tier < 5)
      .sort((a, b) => b[0] - a[0])
      .map(([, list]) => list)[0];

    if (!pair) break;

    const toPage = await makeMapper(page);
    const from = toPage(pair[0].x, pair[0].y);
    const to = toPage(pair[1].x, pair[1].y);

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 8 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await wait(520);
  }

  const finalItems = await readBoard(page);
  if (finalItems && finalItems.length) {
    bestTier = Math.max(bestTier, ...finalItems.map((i) => i.tier));
  }

  return { attempts, bestTier };
}
