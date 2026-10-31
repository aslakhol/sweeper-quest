import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import { step, tileAt } from './game';
import { type AreaId, createWorld, travel } from './world';

describe('world', () => {
  it('every exit leads to a map with exactly one exit back', () => {
    for (const area of Object.keys(areas) as AreaId[]) {
      for (const { to } of Object.values(areas[area].exits)) {
        expect(() => travel({ ...createWorld(), area }, to)).not.toThrow();
      }
    }
  });
  it('enters a house through its door and comes back out onto the same door', () => {
    const world = createWorld();
    const door = { x: 21, y: 6 };
    const village = world.game;
    village.player = { x: 21, y: 7 };
    village.hero.health = 7;
    expect(step(village, door)).toEqual([{ type: 'travel', to: 'elder-house' }]);
    travel(world, 'elder-house');
    expect(world.game.hero.health).toBe(7);
    expect(tileAt(world.game, world.game.player)?.exit).toBe('village');
    travel(world, 'village');
    expect(world.game).toBe(village);
    expect(world.game.player).toEqual(door);
  });
  it('goes down to a fresh dungeon floor on every trip', () => {
    const world = createWorld();
    travel(world, 'dungeon', () => 0);
    const first = world.game;
    first.hero.xp = 5;
    expect(tileAt(first, first.player)?.exit).toBe('village');
    travel(world, 'village');
    expect(tileAt(world.game, world.game.player)?.exit).toBe('dungeon');
    travel(world, 'dungeon', () => 0.99);
    expect(world.game).not.toBe(first);
    expect(world.game.hero.xp).toBe(5);
  });
});
