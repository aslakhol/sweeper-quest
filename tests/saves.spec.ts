import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';

async function openSaves(page: Page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Saves', exact: true }).click();
}
const slot = (page: Page, number: number) =>
  page.getByRole('group', { name: `Save ${number}`, exact: true });
async function position(page: Page, x: number, y: number) {
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    new RegExp(`column ${x + 1}, row ${y + 1}\\.`),
  );
}
// A new game wakes up at home, and Mum speaks first.
async function wakeUp(page: Page) {
  const talk = page.locator('#talk');
  await expect(talk).toContainText('Mum');
  while (await talk.isVisible()) await talk.click();
}
async function stored(page: Page, key = 'sweeper-quest-save-1') {
  const text = await page.evaluate((key) => localStorage.getItem(key), key);
  if (text === null) throw new Error(`Missing save: ${key}`);
  return text;
}
async function seedOnReload(page: Page, entries: Record<string, string>) {
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded-save')) return;
    localStorage.clear();
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    sessionStorage.setItem('seeded-save', 'true');
  }, entries);
  await page.reload();
}

test('three slots keep separate progress and resume the last selected save', async ({ page }) => {
  await page.goto('/');
  await wakeUp(page);
  await page.keyboard.press('ArrowDown');
  await position(page, 6, 3);
  await openSaves(page);
  await expect(slot(page, 1)).toContainText('Playing');
  await slot(page, 2).getByRole('button', { name: 'New game' }).click();
  await wakeUp(page);
  await position(page, 6, 2);
  await page.keyboard.press('ArrowLeft');
  await position(page, 5, 2);
  await openSaves(page);
  await slot(page, 3).getByRole('button', { name: 'New game' }).click();
  await wakeUp(page);
  await page.keyboard.press('ArrowRight');
  await position(page, 7, 2);
  await page.reload();
  await position(page, 7, 2);
  await openSaves(page);
  await expect(slot(page, 3)).toContainText('Playing');
  await slot(page, 1).getByRole('button', { name: 'Continue' }).click();
  await position(page, 6, 3);
  await openSaves(page);
  await slot(page, 2).getByRole('button', { name: 'Continue' }).click();
  await position(page, 5, 2);
});

test('the original single save migrates to Save 1 without losing progress', async ({ page }) => {
  await page.goto('/');
  await wakeUp(page);
  await page.keyboard.press('ArrowDown');
  await openSaves(page);
  const original = await stored(page);
  await seedOnReload(page, { 'sweeper-quest-save': original });
  await position(page, 6, 3);
  expect(await stored(page)).toBe(original);
  expect(await stored(page, 'sweeper-quest-save')).toBe(original);
  await openSaves(page);
  await expect(slot(page, 2)).toContainText('Empty');
  await expect(slot(page, 3)).toContainText('Empty');
});

test('an incompatible save survives autosave, cancellation, downloads and playing another slot', async ({
  page,
}) => {
  await page.goto('/');
  const original = await stored(page);
  const incompatible = JSON.stringify({ ...JSON.parse(original), version: 0 });
  await seedOnReload(page, { 'sweeper-quest-save': incompatible });
  await expect(slot(page, 1)).toContainText('No longer compatible');
  await page.keyboard.press('Escape');
  await expect(page.locator('#saves-dialog')).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await stored(page)).toBe(incompatible);
  const downloadEvent = page.waitForEvent('download');
  await slot(page, 1).getByRole('button', { name: 'Download' }).click();
  const download = await downloadEvent;
  const file = await download.path();
  if (!file) throw new Error('Download is missing.');
  expect(await readFile(file, 'utf8')).toBe(incompatible);
  page.once('dialog', (dialog) => dialog.dismiss());
  await slot(page, 1).getByRole('button', { name: 'New game' }).click();
  expect(await stored(page)).toBe(incompatible);
  await slot(page, 2).getByRole('button', { name: 'New game' }).click();
  await page.reload();
  await openSaves(page);
  expect(await stored(page)).toBe(incompatible);
  page.once('dialog', (dialog) => dialog.accept());
  await slot(page, 1).getByRole('button', { name: 'New game' }).click();
  await wakeUp(page);
  await position(page, 6, 2);
  expect(await stored(page)).toBe(original);
});

test('imports a repaired save only after confirmation and rejects damaged files', async ({
  page,
}) => {
  await page.goto('/');
  await wakeUp(page);
  const original = await stored(page);
  const repaired = JSON.parse(original);
  repaired.games[0].player.x--;
  await openSaves(page);
  const input = slot(page, 1).locator('input[type=file]');
  await input.setInputFiles({
    name: 'damaged.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('alert')).toContainText('damaged or no longer compatible');
  expect(await stored(page)).toBe(original);
  const file = {
    name: 'repaired.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(repaired)),
  };
  page.once('dialog', (dialog) => dialog.dismiss());
  await input.setInputFiles(file);
  await expect(input).toHaveValue('');
  expect(await stored(page)).toBe(original);
  page.once('dialog', (dialog) => dialog.accept());
  await input.setInputFiles(file);
  await expect(page.locator('#saves-dialog')).not.toBeVisible();
  await position(page, 5, 2);
  await page.reload();
  await position(page, 5, 2);
});
