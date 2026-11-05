import { describe, expect, it } from 'vitest';
import { canStep, type Game, neighbors, numberAt, step, type Tile, tileAt } from './game';
import { type AreaId, createWorld, travel, type World } from './world';

const highestHiddenLevel = 3;

// Narrow each hidden tile's possible level using only visible clues, like a careful player.
function levelBounds(game: Game) {
  const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
  const low = new Map<Tile, number>(hidden.map((tile) => [tile, 0]));
  const high = new Map<Tile, number>(hidden.map((tile) => [tile, highestHiddenLevel]));
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
        const hi = high.get(tile) ?? highestHiddenLevel;
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
function reachableTiles(game: Game) {
  const start = tileAt(game, game.player);
  if (!start) return [];
  const seen = new Set([start]);
  for (const tile of seen) {
    for (const next of neighbors(game, tile)) {
      if (next.revealed && !next.monster?.alive && !next.exit && canStep(game, tile, next))
        seen.add(next);
    }
  }
  return [...seen];
}
// Walks are skipped: every tile the solver stands on is reachable over known ground.
function moveTo(game: Game, from: Tile, target: Tile) {
  game.player = { x: from.x, y: from.y };
  step(game, target);
}
// Take every move the clues prove free, pick up what is visible, then fight any chief you survive.
function explore(game: Game) {
  for (;;) {
    const high = levelBounds(game);
    const moves = reachableTiles(game).flatMap((from) =>
      neighbors(game, from)
        .filter((target) => canStep(game, from, target))
        .map((target) => ({ from, target })),
    );
    const move =
      moves.find(({ target }) => (high.get(target) ?? Infinity) <= game.hero.power) ??
      moves.find(({ target }) => target.revealed && target.find) ??
      moves.find(
        ({ target }) =>
          target.monster?.alive &&
          target.revealed &&
          target.monster.level * (target.monster.level - game.hero.power) < game.hero.health,
      );
    if (!move) return;
    moveTo(game, move.from, move.target);
  }
}
const stats = ({ game: { hero } }: World) => [hero.power, hero.maxHealth];
const exitsFrom = (game: Game) => {
  const reached = reachableTiles(game);
  return game.tiles.filter(
    (tile) => tile.exit && reached.some((from) => canStep(game, from, tile)),
  );
};
// Tour every reachable map, again and again, until nothing else can be done anywhere.
function playWorld(world: World, areas?: AreaId[]) {
  const home = world.area;
  for (let before = ''; ; ) {
    explore(world.game);
    for (const { exit } of exitsFrom(world.game)) {
      if (!exit || (areas && !areas.includes(exit as AreaId))) continue;
      travel(world, exit);
      explore(world.game);
      travel(world, home);
      explore(world.game);
    }
    const after = JSON.stringify(world.game.hero);
    if (after === before) return;
    before = after;
  }
}
const finds = (game: Game) => game.tiles.filter((tile) => tile.find).length;
const chiefsAlive = (game: Game) =>
  game.tiles.filter((tile) => tile.monster?.goal && tile.monster.alive).length;

describe('the world', () => {
  it('cannot be finished from a single area, so being stuck sends you elsewhere', () => {
    const world = createWorld();
    playWorld(world, []);
    expect(stats(world)).toEqual([1, 3]);
    expect(world.game.hero.whetstones).toBeLessThan(4);
  }, 60_000);

  it('opens up power by power until a careful player has found everything', () => {
    const world = createWorld();
    const { hero } = world.game;
    playWorld(world);
    expect(hero.power).toBe(3);
    expect(hero.maxHealth).toBeGreaterThanOrEqual(5);
    for (const game of world.visited.values()) {
      expect(finds(game)).toBe(0);
      expect(chiefsAlive(game)).toBe(0);
    }
  }, 60_000);
});
