import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import { step, tileAt } from './game';
import { type AreaId, createWorld, travel, wakeAtHome } from './world';

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
    village.hero.health = 2;
    expect(step(village, door)).toEqual([{ type: 'travel', to: 'elder-house' }]);
    travel(world, 'elder-house');
    expect(world.game.hero.health).toBe(2);
    expect(tileAt(world.game, world.game.player)?.exit).toBe('village');
    travel(world, 'village');
    expect(world.game).toBe(village);
    expect(world.game.player).toEqual(door);
  });
  it('keeps a map as you left it when you return', () => {
    const world = createWorld();
    travel(world, 'cave');
    const cave = world.game;
    cave.hero.power = 2;
    travel(world, 'village');
    expect(tileAt(world.game, world.game.player)?.exit).toBe('cave');
    travel(world, 'cave');
    expect(world.game).toBe(cave);
    expect(world.game.hero.power).toBe(2);
  });
  it('wakes beside the bed after a defeat, leaving the map you fell on as it was', () => {
    const world = createWorld();
    travel(world, 'cave');
    const cave = world.game;
    cave.hero.health = 0;
    cave.lost = true;
    wakeAtHome(world);
    expect(world.area).toBe('home');
    expect(world.game.player).toEqual(areas.home.bedside);
    expect(world.game.hero.health).toBe(world.game.hero.maxHealth);
    expect(cave.lost).toBe(false);
    travel(world, 'village');
    expect(tileAt(world.game, world.game.player)?.exit).toBe('home');
  });
});
