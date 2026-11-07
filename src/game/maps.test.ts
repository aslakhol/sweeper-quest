import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import { canStep, createGame, type Game, neighbors, step, type Tile } from './game';
import { levelBounds, openLayers, reachableTiles } from './solver';
import { type AreaId, createWorld, travel, type World } from './world';

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
      expect(game.lost).toBe(false);
      expect(finds(game)).toBe(0);
      expect(chiefsAlive(game)).toBe(0);
    }
  }, 60_000);

  // How much of each map's hidden ground the clues alone prove free at powers 1, 2 and 3.
  it.each([
    ['village', undefined],
    ['wood', 'village'],
    ['cave', 'village'],
  ] as const)('%s opens in layers', (area, from) => {
    const game = createGame(areas[area].map, { legend: areas[area], from });
    const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
    const layer = openLayers(game, 3);
    const share = (power: number) =>
      hidden.filter((tile) => (layer.get(tile) ?? Infinity) <= power).length / hidden.length;
    expect(share(1)).toBeGreaterThan(0.35);
    expect(share(1)).toBeLessThan(0.65);
    expect(share(2)).toBeGreaterThan(0.7);
    expect(share(2)).toBeLessThan(0.95);
    expect(share(3)).toBe(1);
  });
});
