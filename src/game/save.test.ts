import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import { setNote, step, tileAt } from './game';
import { deserialize, serialize } from './save';
import { createWorld, travel } from './world';

describe('saves', () => {
  it('restores the world as it was left, with every map sharing one hero', () => {
    const world = createWorld();
    const village = world.game;
    const hidden = village.tiles.find((tile) => !tile.revealed && !tile.monster);
    if (!hidden) throw new Error('Village has no hidden floor.');
    setNote(village, hidden, 3);
    village.hero.power = 2;
    travel(world, 'cave');
    const cave = world.game;
    const start = cave.player;
    const target = cave.tiles.find((tile) => !tile.monster && tile.y === start.y - 1);
    if (!target) throw new Error('Cave has no floor by the stairs.');
    step(cave, target);

    const restored = deserialize(serialize(world));
    expect(restored?.area).toBe('cave');
    expect(restored?.game.player).toEqual(cave.player);
    expect(restored?.game.tiles.map((tile) => tile.revealed)).toEqual(
      cave.tiles.map((tile) => tile.revealed),
    );
    const savedVillage = restored?.visited.get('village');
    expect(savedVillage && tileAt(savedVillage, hidden)?.note).toBe(3);
    expect(savedVillage?.hero).toBe(restored?.game.hero);
    expect(restored?.game.hero.power).toBe(2);
  });
  it('remembers dead monsters and collected finds', () => {
    const world = createWorld();
    const slime = world.game.tiles.find((tile) => tile.monster);
    const find = world.game.tiles.find((tile) => tile.find);
    if (!slime?.monster || !find) throw new Error('Village has no monster or find.');
    slime.monster.alive = false;
    delete find.find;
    const restored = deserialize(serialize(world));
    expect(restored && tileAt(restored.game, slime)?.monster?.alive).toBe(false);
    expect(restored && tileAt(restored.game, find)?.find).toBeUndefined();
  });
  it('rejects saves it cannot load', () => {
    const save = JSON.parse(serialize(createWorld()));
    expect(deserialize('not json')).toBeUndefined();
    expect(deserialize(JSON.stringify({ ...save, version: 0 }))).toBeUndefined();
    const edited = [{ ...save.games[0], map: `${areas.village.map}\n` }];
    expect(deserialize(JSON.stringify({ ...save, games: edited }))).toBeUndefined();
  });
  it('rejects damaged saves without throwing', () => {
    const save = JSON.parse(serialize(createWorld()));
    for (const value of [
      null,
      {},
      { ...save, games: null },
      { ...save, games: [] },
      { ...save, hero: {} },
      { ...save, hero: { ...save.hero, carrying: ['unknown'] } },
      { ...save, area: 'removed-area' },
      { ...save, games: [{ ...save.games[0], tiles: [] }] },
      { ...save, games: [{ ...save.games[0], player: { x: -1, y: 0 } }] },
    ])
      expect(deserialize(JSON.stringify(value))).toBeUndefined();
  });
  it('preserves a monster revealed by a failed attack and the blocked player position', () => {
    const world = createWorld();
    const bat = world.game.tiles.find((tile) => tile.monster?.kind === 'bat');
    if (!bat) throw new Error('Village has no bat.');
    const from = world.game.tiles.find(
      (tile) =>
        tile.terrain === 'floor' &&
        !tile.monster &&
        !tile.person &&
        Math.max(Math.abs(tile.x - bat.x), Math.abs(tile.y - bat.y)) === 1,
    );
    if (!from) throw new Error('Bat has no approach.');
    world.game.player = { x: from.x, y: from.y };
    step(world.game, bat);
    const restored = deserialize(serialize(world));
    expect(restored?.game.player).toEqual(world.game.player);
    expect(restored?.game.hero.health).toBe(1);
    expect(restored && tileAt(restored.game, bat)).toMatchObject({
      revealed: true,
      monster: { alive: true },
    });
  });
});
