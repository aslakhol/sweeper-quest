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
// Past Mum and Doctor Madeleine's lessons, outside the dojo door with a sword.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // The board label and Mum's greeting are both set while the page starts.
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /^Home\./);
  const talk = page.locator('#talk');
  while (await talk.isVisible()) await talk.click();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Previous page' }).click();
  await page.getByRole('button', { name: 'Skip training' }).click();
  await expect(page.locator('#found')).toContainText('Sword');
  await page.locator('#found').click();
  // Putting the sword away announces the new power, after which keys move the hero.
  await expect(page.getByRole('status')).toHaveText(/^Power 1\./);
  await position(page, 28, 21);
});
// Walk from the dojo to the south meadow gate, then step into the tall grass beside it.
async function enterMeadow(page: Page, touch: boolean) {
  await page.keyboard.press('z');
  await position(page, 27, 22);
  await page.keyboard.press('z');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await position(page, 16, 23);
  await tap(page, 15, 23, touch);
  await position(page, 15, 23);
}

// Two different hidden monsters hurt us; the revealed bat can no longer be attacked.
async function fallInBattle(page: Page, touch: boolean) {
  await enterMeadow(page, touch);
  await fallInBattleFromGate(page, touch);
}
async function fallInBattleFromGate(page: Page, touch: boolean) {
  await revealBatFromGate(page, touch);
  await tap(page, 14, 18, touch);
  await position(page, 14, 18);
  await tap(page, 13, 17, touch);
}
async function revealBatFromGate(page: Page, touch: boolean) {
  await tap(page, 15, 19, touch);
  await position(page, 15, 19);
  await tap(page, 15, 18, touch);
  await position(page, 15, 18);
  await tap(page, 14, 17, touch);
  await position(page, 15, 18);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '1 of 3 hearts');
}

test('a fight moves you onto the tile and gives nothing', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enterMeadow(page, isMobile);
  await tap(page, 15, 19, isMobile);
  await position(page, 15, 19);
  await expect(page.locator('#whetstones-value')).toHaveText('0/4');
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '3 of 3 hearts');
  expect(errors).toEqual([]);
});

test('a revealed stronger monster blocks taps and keyboard moves without more damage', async ({
  page,
  isMobile,
}) => {
  await enterMeadow(page, isMobile);
  await revealBatFromGate(page, isMobile);
  await tap(page, 14, 17, isMobile);
  await expect(page.getByRole('status')).toHaveText('Too strong.');
  await page.keyboard.press('q');
  await position(page, 15, 18);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '1 of 3 hearts');
  await page.reload();
  await tap(page, 14, 17, isMobile);
  await expect(page.getByRole('status')).toHaveText('Too strong.');
  await position(page, 15, 18);
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '1 of 3 hearts');
});

test('hidden stronger monsters can still end the run', async ({ page, isMobile }) => {
  await fallInBattle(page, isMobile);
  await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#death-dialog').getByRole('button', { name: 'Start over' }).click();
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '3 of 3 hearts');
  await expect(page.locator('#talk')).toContainText('Morning, sleepyhead.');
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    /^Home\. Player column 7, row 3\./,
  );
});

test('a reload picks up where you left off until you start over', async ({ page, isMobile }) => {
  await enterMeadow(page, isMobile);
  await page.reload();
  await position(page, 15, 23);
  await fallInBattleFromGate(page, isMobile);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#death-dialog').getByRole('button', { name: 'Start over' }).click();
  await position(page, 6, 2);
  await page.reload();
  await position(page, 6, 2);
});

test('continuing after a defeat wakes you at home with Mum', async ({ page, isMobile }) => {
  await fallInBattle(page, isMobile);
  await page.locator('#death-dialog').getByRole('button', { name: 'Continue' }).click();
  const talk = page.locator('#talk');
  await expect(talk).toContainText('Mum');
  await expect(talk).toContainText('You are awake!');
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    /^Home\. Player column 7, row 3\./,
  );
  await expect(page.locator('#hearts')).toHaveAttribute('aria-label', '3 of 3 hearts');
  await talk.click();
  await talk.click();
  await expect(talk).not.toBeVisible();
});

test('a far hidden target next to known ground is walked to and entered', async ({
  page,
  isMobile,
}) => {
  await enterMeadow(page, isMobile);
  await tap(page, 15, 19, isMobile);
  await position(page, 15, 19);
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
  await expect(talk).toContainText('whatever they are hiding');
  await talk.click();
  await talk.click();
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
  await page.keyboard.press('ArrowDown');
  await position(page, 28, 22);
  await page.keyboard.down('s');
  await page.keyboard.down('a');
  await page.keyboard.up('a');
  await page.keyboard.up('s');
  await position(page, 27, 23);
  await page.keyboard.press('e');
  await position(page, 28, 22);
});

test('a note tool marks one tile and a long press marks without moving', async ({
  page,
  isMobile,
}) => {
  await enterMeadow(page, isMobile);
  const tool = page.getByRole('button', { name: 'Mark level 3' });
  await tool.click();
  await tap(page, 15, 19, isMobile);
  await expect(page.getByRole('status')).toHaveText('Column 16, row 20: marked 3.');
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
  await position(page, 15, 23);
  const point = await tile(page, 15, 19);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y }],
  });
  await page.waitForTimeout(500);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('status')).toHaveText('Column 16, row 20: marked 4.');
  await position(page, 15, 23);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.getByRole('status')).toHaveText('Column 16, row 20: marked 5.');
});

test('shift keeps the note tool out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Shift needs a keyboard');
  await enterMeadow(page, false);
  const tool = page.getByRole('button', { name: 'Mark level 3' });
  await tool.click();
  await page.keyboard.down('Shift');
  await tap(page, 15, 19, false);
  await tap(page, 14, 19, false);
  await page.keyboard.up('Shift');
  await expect(page.getByRole('status')).toHaveText('Column 15, row 20: marked 3.');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await tap(page, 15, 19, false);
  await expect(page.getByRole('status')).toHaveText('Column 16, row 20: note cleared.');
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
});

test('number keys mark the hovered tile, or pick the tool elsewhere', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Number keys need a keyboard');
  await enterMeadow(page, false);
  const hidden = await tile(page, 15, 19);
  await page.mouse.move(hidden.x, hidden.y);
  await page.keyboard.press('2');
  await expect(page.getByRole('status')).toHaveText('Column 16, row 20: marked 2.');
  await page.keyboard.press('2');
  await expect(page.getByRole('status')).toHaveText('Column 16, row 20: note cleared.');
  const tool = page.getByRole('button', { name: 'Mark level 2' });
  await expect(tool).toHaveAttribute('aria-pressed', 'false');
  const revealed = await tile(page, 16, 23);
  await page.mouse.move(revealed.x, revealed.y);
  await page.keyboard.press('2');
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
});
