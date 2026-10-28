import { expect, it } from 'vitest';
import training from '../maps/training.txt?raw';
import {
  canStep,
  createGame,
  type Game,
  neighbors,
  numberAt,
  planWalk,
  step,
  type Tile,
} from './game';

// Narrow each hidden tile's possible level using only visible clues, like a careful player.
function levelBounds(game: Game) {
  const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
  const low = new Map<Tile, number>(hidden.map((tile) => [tile, 0]));
  const high = new Map<Tile, number>(hidden.map((tile) => [tile, 3]));
  const clues = game.tiles.filter(
    (tile) => tile.revealed && tile.terrain === 'floor' && !tile.monster?.alive,
  );
  for (let changed = true; changed; ) {
    changed = false;
    for (const clue of clues) {
      const around = neighbors(game, clue);
      const remaining =
        numberAt(game, clue) -
        around
          .filter((tile) => tile.revealed && tile.monster?.alive)
          .reduce((sum, tile) => sum + (tile.monster?.level ?? 0), 0);
      const unknown = around.filter((tile) => low.has(tile));
      const lowSum = unknown.reduce((sum, tile) => sum + (low.get(tile) ?? 0), 0);
      const highSum = unknown.reduce((sum, tile) => sum + (high.get(tile) ?? 0), 0);
      for (const tile of unknown) {
        const lo = low.get(tile) ?? 0;
        const hi = high.get(tile) ?? 3;
        const nextHigh = Math.min(hi, remaining - (lowSum - lo));
        const nextLow = Math.max(lo, remaining - (highSum - hi));
        if (nextHigh !== hi || nextLow !== lo) {
          high.set(tile, nextHigh);
          low.set(tile, nextLow);
          changed = true;
        }
      }
    }
  }
  return high;
}

function playCarefully(game: Game) {
  const actions = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  let guesses = 0;
  while (!game.won && !game.lost) {
    const high = levelBounds(game);
    const options = game.tiles
      .filter((tile) => tile.revealed && !tile.monster?.alive && planWalk(game, tile))
      .flatMap((from) =>
        neighbors(game, from)
          .filter(
            (target) => canStep(game, from, target) && (high.has(target) || target.monster?.alive),
          )
          .map((target) => {
            const level = target.revealed ? (target.monster?.level ?? 0) : (high.get(target) ?? 3);
            const cost = level * Math.max(0, level - game.power);
            return { from, target, cost, goal: Boolean(target.monster?.goal) };
          }),
      )
      .sort((a, b) => a.cost - b.cost);
    const safe = options.find((option) => !option.goal && option.cost === 0);
    const chief = options.find((option) => option.goal && option.cost < game.health);
    const action = safe ?? chief ?? options.find((option) => !option.goal);
    if (!action) break;
    if (!safe && !chief) guesses++;
    for (const next of planWalk(game, action.from) ?? []) step(game, next);
    actions[game.power]++;
    step(game, action.target);
  }
  return { actions, guesses };
}

it('opens with an empty area around the start', () => {
  const game = createGame(training);
  expect(numberAt(game, game.player)).toBe(0);
  expect(
    game.tiles.filter((tile) => tile.revealed && tile.terrain === 'floor').length,
  ).toBeGreaterThan(9);
});

it('can be won by careful deduction with a few forced guesses', () => {
  const game = createGame(training);
  const { actions, guesses } = playCarefully(game);
  expect(game.won).toBe(true);
  expect(game.health).toBeLessThan(game.maxHealth);
  expect(guesses).toBeGreaterThan(0);
  // Most of the run happens while many monsters can still hurt you.
  expect(actions[1] + actions[2]).toBeGreaterThan(40);
});
