import { expect, type Page, test } from '@playwright/test';

async function at(page: Page, area: string, x: number, y: number) {
  await expect(page.locator('canvas')).toHaveAttribute(
    'aria-label',
    new RegExp(`^${area}\\. Player column ${x + 1}, row ${y + 1}\\.`),
  );
}
async function press(page: Page, keys: string[]) {
  for (const key of keys) await page.keyboard.press(key);
}
// From the home door down the village to the dojo door.
const toDojo = [
  'ArrowDown',
  'c',
  'c',
  ...Array(4).fill('ArrowDown'),
  'c',
  ...Array(7).fill('ArrowDown'),
  'z',
  'z',
  'q',
  'ArrowUp',
];

test('a new game wakes up at home and trains at the dojo', async ({ page }) => {
  await page.goto('/');
  const talk = page.locator('#talk');
  await expect(talk).toContainText('Mum');
  await talk.click();
  await expect(talk).toContainText('Doctor Madeleine sent word');
  await talk.click();
  await expect(talk).not.toBeVisible();
  await expect(page.locator('#power-value')).toHaveText('0');

  await press(page, ['z', 'z', 'ArrowDown']);
  await at(page, 'Village', 28, 6);
  await press(page, toDojo);
  await at(page, 'Dojo', 4, 5);
  await press(page, ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp']);
  await expect(talk).toContainText('Doctor Madeleine');
  await talk.click();
  await expect(talk).toContainText('Three goblin chiefs');
  await talk.click();

  const ask = page.locator('#ask');
  await expect(ask).toContainText('Will you help me save it?');
  await ask.getByRole('button', { name: 'Yes' }).click();
  await expect(talk).toContainText('you will need a sword');
  await talk.click();
  const found = page.locator('#found');
  await expect(found).toContainText('Sword');
  await expect(found).toContainText('Power 1!');
  await found.click();
  await expect(talk).toContainText('One monster hides in this grass.');
  for (let line = 0; line < 4; line++) await talk.click();

  // The first lesson: one slime in a patch of grass, and the numbers around it.
  await at(page, 'Dojo', 2, 4);
  await page.keyboard.press('ArrowUp');
  await at(page, 'Dojo', 2, 3);
  await page.keyboard.press('ArrowUp');
  await expect(talk).toContainText('In this next scenario, there are two monsters.');
  await at(page, 'Dojo', 4, 2);
});
