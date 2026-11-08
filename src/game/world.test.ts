import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import { step, tileAt } from './game';
import {
  type AreaId,
  createWorld,
  finishLesson,
  lessonWon,
  startLesson,
  travel,
  wakeAtHome,
} from './world';

describe('world', () => {
  it('every exit leads to a map with exactly one exit back', () => {
    for (const area of Object.keys(areas) as AreaId[]) {
      for (const { to } of Object.values(areas[area].exits)) {
        expect(() => travel({ ...createWorld(), area }, to)).not.toThrow();
      }
    }
  });
  it('starts a new game beside the bed at home', () => {
    const world = createWorld();
    expect(world.area).toBe('home');
    expect(world.game.player).toEqual(areas.home.bedside);
  });
  it('enters a house through its door and comes back out onto the same door', () => {
    const world = createWorld();
    travel(world, 'village');
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
    travel(world, 'village');
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
    travel(world, 'village');
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
  it('sends you back beside Doctor Madeleine once a lesson is won, for the next one', () => {
    const world = createWorld();
    travel(world, 'village');
    travel(world, 'dojo');
    Object.assign(world.game.hero, { sword: true, power: 1 });
    startLesson(world, 'lesson-1');
    expect(world.area).toBe('lesson-1');
    expect(finishLesson(world)).toEqual([]);
    step(world.game, { x: 2, y: 3 });
    step(world.game, { x: 2, y: 2 });
    expect(lessonWon(world)).toBe(true);
    expect(finishLesson(world)).toMatchObject([
      { type: 'talk', lines: areas.dojo.people.d.training.lessons[1].lines },
      { type: 'lesson', area: 'lesson-2' },
    ]);
    expect(world.area).toBe('dojo');
    expect(world.game.player).toEqual({ x: 4, y: 2 });
    expect(world.game.hero.lessons).toBe(1);
    expect(world.visited.has('lesson-1')).toBe(false);
  });
});
