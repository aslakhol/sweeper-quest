import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';

const mapRows = readFileSync(new URL('../src/maps/clearing-01.txt', import.meta.url), 'utf8')
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

test('a fight moves you onto the tile and earns its level in XP', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await tap(page, 3, 12, isMobile);
  await position(page, 3, 12);
  await tap(page, 2, 12, isMobile);
  await position(page, 2, 12);
  await expect(page.locator('#xp-value')).toHaveText('1/10');
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '10 of 10 hearts');
  expect(errors).toEqual([]);
});

test('stronger monsters cost hearts until the run ends', async ({ page, isMobile }) => {
  await tap(page, 7, 12, isMobile);
  await position(page, 7, 12);
  await tap(page, 8, 12, isMobile);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '8 of 10 hearts');
  // A reckless route that bumps the riskiest unknown tiles, found with the rules harness.
  const route = [
    [8, 12, 9, 11],
    [6, 9, 5, 8],
    [8, 8, 7, 7],
    [7, 7, 6, 6],
    [6, 6, 5, 5],
    [5, 5, 4, 4],
    [5, 5, 6, 4],
  ];
  for (const [fromX, fromY, x, y] of route) {
    await tap(page, fromX, fromY, isMobile);
    await position(page, fromX, fromY);
    await tap(page, x, y, isMobile);
  }
  await expect(page.getByRole('heading', { name: 'You fell in the clearing' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'You fell in the clearing' })).toBeVisible();
  await page.locator('#death-dialog').getByRole('button', { name: 'Start over' }).click();
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '10 of 10 hearts');
  await position(page, 5, 12);
});

test('a far hidden target stops on known ground and needs a new tap', async ({
  page,
  isMobile,
}) => {
  await tap(page, 4, 10, isMobile);
  await position(page, 4, 11);
  // Leave enough time for an accidental extra queued step to happen.
  await page.waitForTimeout(250);
  await position(page, 4, 11);
  await tap(page, 4, 10, isMobile);
  await position(page, 4, 10);
});

test('quick keys and two-key diagonals each move once', async ({ page }) => {
  await page.keyboard.press('ArrowUp');
  await position(page, 5, 11);
  await page.keyboard.down('w');
  await page.keyboard.down('a');
  await page.keyboard.up('a');
  await page.keyboard.up('w');
  await position(page, 4, 10);
  await page.keyboard.press('e');
  await position(page, 5, 9);
});

test('a note tool marks one tile and a long press marks without moving', async ({
  page,
  isMobile,
}) => {
  const tool = page.getByRole('button', { name: 'Mark level 3' });
  await tool.click();
  await tap(page, 4, 9, isMobile);
  await expect(page.getByRole('status')).toHaveText('Column 5, row 10: marked 3.');
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
  await position(page, 5, 12);
  const point = await tile(page, 4, 9);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y }],
  });
  await page.waitForTimeout(500);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('status')).toHaveText('Column 5, row 10: marked 4.');
  await position(page, 5, 12);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.getByRole('status')).toHaveText('Column 5, row 10: marked 5.');
});

test('shift keeps the note tool out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Shift needs a keyboard');
  const tool = page.getByRole('button', { name: 'Mark level 3' });
  await tool.click();
  await page.keyboard.down('Shift');
  await tap(page, 4, 9, false);
  await tap(page, 5, 9, false);
  await page.keyboard.up('Shift');
  await expect(page.getByRole('status')).toHaveText('Column 6, row 10: marked 3.');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 4, 9, false);
  await expect(page.getByRole('status')).toHaveText('Column 5, row 10: note cleared.');
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
});

test('number keys mark the hovered tile, or pick the tool elsewhere', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Number keys need a keyboard');
  const hidden = await tile(page, 4, 9);
  await page.mouse.move(hidden.x, hidden.y);
  await page.keyboard.press('2');
  await expect(page.getByRole('status')).toHaveText('Column 5, row 10: marked 2.');
  await page.keyboard.press('2');
  await expect(page.getByRole('status')).toHaveText('Column 5, row 10: note cleared.');
  const tool = page.getByRole('button', { name: 'Mark level 2' });
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
  const revealed = await tile(page, 5, 11);
  await page.mouse.move(revealed.x, revealed.y);
  await page.keyboard.press('2');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
});
