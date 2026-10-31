import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { cameraTarget, layout } from '../src/render';

function size(file: string) {
  const rows = readFileSync(new URL(`../src/maps/${file}`, import.meta.url), 'utf8')
    .trim()
    .split('\n')
    .map((row) => row.trim().split(/\s+/));
  return { width: rows[0].length, height: rows.length };
}
// Map sizes by the area name that starts the board's label.
const maps: Record<string, ReturnType<typeof size>> = {
  Village: size('village.txt'),
  Inn: size('inn.txt'),
};

// Aim where the camera comes to rest once it has caught up with the player.
async function tile(page: Page, x: number, y: number) {
  await page.waitForTimeout(300);
  const label = (await page.locator('canvas').getAttribute('aria-label')) ?? '';
  const [, area, column, row] = /^(.+?)\. Player column (\d+), row (\d+)/.exec(label) ?? [];
  const player = { x: Number(column) - 1, y: Number(row) - 1 };
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Board is not visible');
  const { tile, left, top } = layout(
    cameraTarget(maps[area], player, box.width, box.height),
    box.width,
    box.height,
  );
  return { x: box.x + left + (x + 0.5) * tile, y: box.y + top + (y + 0.5) * tile };
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
// Walk from the village to the south meadow gate, then step into the tall grass beside it.
async function enterMeadow(page: Page, touch: boolean) {
  await page.keyboard.press('z');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft');
  await position(page, 16, 23);
  await tap(page, 15, 23, touch);
  await position(page, 15, 23);
}

test('a fight moves you onto the tile and earns its level in XP', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enterMeadow(page, isMobile);
  await tap(page, 15, 22, isMobile);
  await position(page, 15, 22);
  await expect(page.locator('#xp-value')).toHaveText('1/10');
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '10 of 10 hearts');
  expect(errors).toEqual([]);
});

test('stronger monsters cost hearts until the run ends', async ({ page, isMobile }) => {
  await enterMeadow(page, isMobile);
  await tap(page, 15, 22, isMobile);
  await position(page, 15, 22);
  // A reckless route through a bat and two goblins, found with the rules harness.
  await tap(page, 14, 20, isMobile);
  await position(page, 14, 20);
  await tap(page, 13, 19, isMobile);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '8 of 10 hearts');
  await tap(page, 13, 20, isMobile);
  await position(page, 13, 20);
  await tap(page, 12, 20, isMobile);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '2 of 10 hearts');
  await tap(page, 15, 18, isMobile);
  await position(page, 15, 18);
  await tap(page, 15, 17, isMobile);
  await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible();
  await page.locator('#death-dialog').getByRole('button', { name: 'Start over' }).click();
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '10 of 10 hearts');
  await position(page, 26, 22);
});

test('a far hidden target next to known ground is walked to and entered', async ({
  page,
  isMobile,
}) => {
  await enterMeadow(page, isMobile);
  await tap(page, 15, 22, isMobile);
  await position(page, 15, 22);
  await tap(page, 12, 19, isMobile);
  await position(page, 12, 19);
});

test('a door leads into a house where you can talk to people', async ({ page, isMobile }) => {
  await tap(page, 27, 16, isMobile);
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    /^Inn\. Player column 6, row 8\./,
  );
  await tap(page, 5, 2, isMobile);
  const talk = page.locator('#talk');
  await expect(talk).toContainText('Hilde');
  await expect(talk).toContainText('Welcome to the inn.');
  await talk.click();
  await expect(talk).toContainText('different every time');
  await talk.click();
  await talk.getByRole('button', { name: 'Continue' }).click();
  await expect(talk).not.toBeVisible();
  await position(page, 4, 3);
  await tap(page, 5, 7, isMobile);
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    /^Village\. Player column 28, row 17\./,
  );
});

test('quick keys and two-key diagonals each move once', async ({ page }) => {
  await page.keyboard.press('ArrowUp');
  await position(page, 26, 21);
  await page.keyboard.down('w');
  await page.keyboard.down('a');
  await page.keyboard.up('a');
  await page.keyboard.up('w');
  await position(page, 25, 20);
  await page.keyboard.press('e');
  await position(page, 26, 19);
});

test('a note tool marks one tile and a long press marks without moving', async ({
  page,
  isMobile,
}) => {
  await enterMeadow(page, isMobile);
  const tool = page.getByRole('button', { name: 'Mark level 3' });
  await tool.click();
  await tap(page, 14, 22, isMobile);
  await expect(page.getByRole('status')).toHaveText('Column 15, row 23: marked 3.');
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
  await position(page, 15, 23);
  const point = await tile(page, 14, 22);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y }],
  });
  await page.waitForTimeout(500);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('status')).toHaveText('Column 15, row 23: marked 4.');
  await position(page, 15, 23);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.getByRole('status')).toHaveText('Column 15, row 23: marked 5.');
});

test('shift keeps the note tool out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Shift needs a keyboard');
  await enterMeadow(page, false);
  const tool = page.getByRole('button', { name: 'Mark level 3' });
  await tool.click();
  await page.keyboard.down('Shift');
  await tap(page, 14, 22, false);
  await tap(page, 13, 22, false);
  await page.keyboard.up('Shift');
  await expect(page.getByRole('status')).toHaveText('Column 14, row 23: marked 3.');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 14, 22, false);
  await expect(page.getByRole('status')).toHaveText('Column 15, row 23: note cleared.');
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
});

test('number keys mark the hovered tile, or pick the tool elsewhere', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Number keys need a keyboard');
  await enterMeadow(page, false);
  const hidden = await tile(page, 14, 22);
  await page.mouse.move(hidden.x, hidden.y);
  await page.keyboard.press('2');
  await expect(page.getByRole('status')).toHaveText('Column 15, row 23: marked 2.');
  await page.keyboard.press('2');
  await expect(page.getByRole('status')).toHaveText('Column 15, row 23: note cleared.');
  const tool = page.getByRole('button', { name: 'Mark level 2' });
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
  const revealed = await tile(page, 16, 23);
  await page.mouse.move(revealed.x, revealed.y);
  await page.keyboard.press('2');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
});
