import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import { createGame, type Game } from './game';
import { openLayers } from './solver';
import { surveyWorld } from './survey';
import { createWorld, type World } from './world';

const stats = ({ game: { hero } }: World) => [hero.power, hero.maxHealth];
const finds = (game: Game) => game.tiles.filter((tile) => tile.find).length;
const chiefsAlive = (game: Game) =>
  game.tiles.filter((tile) => tile.monster?.goal && tile.monster.alive).length;

describe('the world', () => {
  it('cannot be finished from a single area, so being stuck sends you elsewhere', () => {
    const world = createWorld();
    // The dojo stands in the village, and its sword is needed to fight at all.
    surveyWorld({ profile: 'bounds', destinations: ['village', 'dojo'] }, world);
    expect(stats(world)).toEqual([1, 3]);
    expect(world.game.hero.whetstones).toBeLessThan(4);
  }, 60_000);

  it('opens up power by power until a careful player has found everything', () => {
    const world = createWorld();
    const { hero } = world.game;
    const report = surveyWorld({ profile: 'bounds' }, world);
    expect(
      report.actions
        .flatMap((action) => action.events)
        .filter((event) => event.type === 'fight')
        .every((fight) => fight.damage === 0),
    ).toBe(true);
    expect(hero.power).toBe(4);
    expect(hero.maxHealth).toBeGreaterThanOrEqual(5);
    for (const game of world.visited.values()) {
      expect(game.lost).toBe(false);
      expect(finds(game)).toBe(0);
      expect(chiefsAlive(game)).toBe(0);
    }
  }, 60_000);

  // How much of each map's hidden ground the clues alone prove free at powers 1, 2 and 3.
  it.each([
    ['village', 'home'],
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
