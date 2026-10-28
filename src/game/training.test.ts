import { expect, it } from 'vitest';
import training from '../maps/training.txt?raw';
import { canStep, createGame, neighbors, numberAt, planWalk, same, step } from './game';

it('offers a low-risk western frontier and stronger eastern clues from the start', () => {
  const game = createGame(training);
  expect(numberAt(game, { x: 3, y: 8 })).toBe(1);
  expect(numberAt(game, { x: 4, y: 8 })).toBe(2);
  expect(numberAt(game, { x: 5, y: 8 })).toBe(2);
});

it('can finish the demo using only visible clue bounds, without blind attacks or damage', () => {
  const game = createGame(training);
  const powers = new Set([game.power]);
  let deductions = 0;
  // This is a map check, not a game hint system. Never read hidden contents.
  for (let turn = 0; turn < 150 && !game.won; turn++) {
    const reachable = game.tiles.filter(
      (tile) => tile.revealed && !tile.monster?.alive && planWalk(game, tile) !== null,
    );
    const pickup = reachable.find((tile) => tile.shards);
    const actions = reachable
      .flatMap((from) =>
        neighbors(game, from)
          .filter((target) => {
            if (!canStep(game, from, target)) return false;
            if (target.revealed)
              return Boolean(target.monster?.alive && target.monster.level <= game.power);
            // An unknown monster cannot exceed the unaccounted-for sum of any visible adjacent clue.
            const bounds = neighbors(game, target)
              .filter(
                (clue) =>
                  clue.revealed && clue.terrain === 'floor' && !clue.shards && !clue.monster?.alive,
              )
              .map(
                (clue) =>
                  numberAt(game, clue) -
                  neighbors(game, clue)
                    .filter((tile) => tile.revealed && tile.monster?.alive)
                    .reduce((sum, tile) => sum + (tile.monster?.level ?? 0), 0),
              );
            return Math.min(3, ...bounds) <= game.power;
          })
          .map((target) => ({ from, target })),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.from.x - game.player.x, a.from.y - game.player.y) -
          Math.hypot(b.from.x - game.player.x, b.from.y - game.player.y),
      );
    const action = pickup ? { from: pickup, target: pickup } : actions[0];
    expect(action, `No provably safe action at power ${game.power}`).toBeDefined();
    if (!action) break;
    let interrupted = false;
    for (const next of planWalk(game, action.from) ?? []) {
      if (step(game, next).length) {
        interrupted = true;
        break;
      }
    }
    if (!interrupted && !same(game.player, action.target)) {
      if (!action.target.revealed && game.power < 3) deductions++;
      step(game, action.target);
    }
    powers.add(game.power);
    expect(game.health).toBe(game.maxHealth);
  }
  expect(game.won).toBe(true);
  expect([...powers]).toEqual([1, 2, 3]);
  expect(deductions).toBeGreaterThan(10);
});
