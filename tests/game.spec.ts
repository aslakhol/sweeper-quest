import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';

const mapRows = readFileSync(new URL('../src/maps/training.txt', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .map((row) => row.trim().split(/\s+/));
const boardWidth = mapRows[0].length;
const boardHeight = mapRows.length;

async function tile(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Board is not visible');
  return {
    x: box.x + ((x + 0.5) * box.width) / boardWidth,
    y: box.y + ((y + 0.5) * box.height) / boardHeight,
  };
}
async function tap(page: Page, x: number, y: number, touch: boolean) {
  const point = await tile(page, x, y);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
async function position(page: Page, x: number, y: number) {
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    new RegExp(`column ${x + 1}, row ${y + 1}\\.`),
  );
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('inspect corpses, collect both bundles, and beat the chief', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await tap(page, 3, 8, isMobile);
  await tap(page, 2, 7, isMobile);
  await position(page, 3, 8);
  await expect(page.locator('#coins-value')).toHaveText('0');
  await tap(page, 2, 7, isMobile);
  await position(page, 3, 8);
  await expect(page.getByRole('status')).toHaveText('Corpse clue: 2. Tap again to walk here.');
  await expect(page.locator('#coins-value')).toHaveText('0');
  await tap(page, 2, 7, isMobile);
  await expect(page.locator('#coins-value')).toHaveText('1');
  await tap(page, 1, 7, isMobile);
  // The corpse can be inspected again after leaving, even after its loot is gone.
  await tap(page, 2, 7, isMobile);
  await expect(page.getByRole('status')).toHaveText('Corpse clue: 2. Tap again to walk here.');
  await position(page, 1, 7);
  await tap(page, 1, 6, isMobile);
  await expect(page.locator('#power-value')).toHaveText('2');
  for (const [x, y] of [
    [1, 5],
    [1, 4],
    [1, 4],
    [1, 4],
    [1, 3],
    [1, 2],
    [1, 2],
    [1, 2],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 4],
    [4, 4],
    [4, 4],
    [4, 4],
    [4, 3],
    [5, 3],
    [5, 3],
    [5, 3],
    [6, 3],
    [7, 4],
  ])
    await tap(page, x, y, isMobile);
  await expect(page.locator('#power-value')).toHaveText('3');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (const [x, y] of [
    [6, 3],
    [5, 2],
    [4, 1],
  ])
    await tap(page, x, y, isMobile);
  await expect(page.getByRole('heading', { name: 'Goblin chief defeated' })).toBeVisible();
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '3 of 3 hearts');
  expect(errors).toEqual([]);
});

test('an early bat survives an underpowered attack and costs half a heart', async ({
  page,
  isMobile,
}) => {
  await tap(page, 4, 8, isMobile);
  await tap(page, 5, 7, isMobile);
  await position(page, 4, 8);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '2.5 of 3 hearts');
  await expect(page.locator('#coins-value')).toHaveText('0');
  await expect(page.locator('#slain')).toHaveText('· 0/19');
});

test('a far hidden target stops on known ground and needs a new tap', async ({
  page,
  isMobile,
}) => {
  await tap(page, 4, 7, isMobile);
  await position(page, 4, 8);
  // Leave enough time for an accidental extra queued step to happen.
  await page.waitForTimeout(250);
  await position(page, 4, 8);
  await tap(page, 4, 7, isMobile);
  await position(page, 4, 7);
});

test('quick keys and two-key diagonals each move once', async ({ page }) => {
  await page.keyboard.press('ArrowUp');
  await position(page, 4, 8);
  await page.keyboard.down('w');
  await page.keyboard.down('a');
  await page.keyboard.up('a');
  await page.keyboard.up('w');
  await position(page, 3, 7);
  await page.keyboard.press('e');
  await position(page, 4, 6);
});

test('note tool stays selected and a long press marks without moving', async ({
  page,
  isMobile,
}) => {
  await page.getByRole('button', { name: 'Mark level 3' }).click();
  await tap(page, 4, 7, isMobile);
  await expect(page.getByRole('status')).toHaveText('Column 5, row 8: marked 3.');
  await tap(page, 5, 7, isMobile);
  await expect(page.getByRole('status')).toHaveText('Column 6, row 8: marked 3.');
  await position(page, 4, 9);
  await page.getByRole('button', { name: 'Mark level 3' }).click();
  const point = await tile(page, 4, 7);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y }],
  });
  await page.waitForTimeout(500);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('status')).toHaveText('Column 5, row 8: marked 4.');
  await position(page, 4, 9);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.getByRole('status')).toHaveText('Column 5, row 8: marked 5.');
});

test('flood toggle opens a longer route and keeps its setting when starting over', async ({
  page,
  isMobile,
}) => {
  const toggle = page.getByRole('switch', { name: 'Flood connected zeros' });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await tap(page, 2, 9, isMobile);
  await position(page, 2, 9);
  await page.getByRole('button', { name: 'Start over ↻' }).click();
  await page.locator('#confirm-restart').click();
  await expect(toggle).toBeChecked();
  await tap(page, 2, 9, isMobile);
  await position(page, 2, 9);
  await toggle.uncheck();
  await page.getByRole('button', { name: 'Start over ↻' }).click();
  await page.locator('#confirm-restart').click();
  await expect(toggle).not.toBeChecked();
  await tap(page, 2, 9, isMobile);
  await position(page, 3, 9);
  await page.waitForTimeout(250);
  await position(page, 3, 9);
});

test('monster and corpse corner badges show tile clues that update after neighboring kills', async ({
  page,
  isMobile,
}) => {
  // Observe the real Canvas draw calls at the slime's corner badge.
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) throw new Error('Missing game canvas');
    const fillText = ctx.fillText.bind(ctx);
    ctx.fillText = (text, x, y, maxWidth) => {
      if (x === 2 * 48 + 40 && y === 7 * 48 + 39) canvas.dataset.corpseClue = text;
      if (x === 5 * 48 + 40 && y === 7 * 48 + 39) canvas.dataset.batClue = text;
      fillText(text, x, y, maxWidth);
    };
  });
  await tap(page, 4, 8, isMobile);
  await tap(page, 5, 7, isMobile); // Reveal the stronger bat without killing it.
  await expect(page.locator('canvas')).toHaveAttribute('data-bat-clue', '1');
  await tap(page, 3, 8, isMobile);
  await tap(page, 2, 7, isMobile);
  await expect(page.locator('canvas')).toHaveAttribute('data-corpse-clue', '2');
  for (const [x, y] of [
    [2, 7],
    [2, 7],
    [1, 7],
    [1, 6],
    [2, 6],
    [3, 6],
  ]) {
    await tap(page, x, y, isMobile);
  }
  await expect(page.locator('canvas')).toHaveAttribute('data-corpse-clue', '0');
});
