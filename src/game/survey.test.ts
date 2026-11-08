import { beforeEach, describe, expect, it, vi } from 'vitest';
import { areas } from '../maps';
import { createGame, createHero } from './game';
import { surveyWorld } from './survey';
import type { World } from './world';

vi.mock('../maps', () => ({
  areas: {
    village: {
      map: '',
      exits: {
        w: { to: 'wood', look: 'gate' },
        c: { to: 'cave', look: 'stairs' },
        h: { to: 'home', look: 'door' },
      },
    },
    wood: {
      map: '',
      exits: { '<': { to: 'village', look: 'gate' }, '>': { to: 'cave', look: 'stairs' } },
    },
    cave: {
      map: '',
      exits: { '<': { to: 'village', look: 'stairs' }, w: { to: 'wood', look: 'gate' } },
    },
    home: {
      map: '< , m',
      exits: { '<': { to: 'village', look: 'mat' } },
      people: {
        m: { name: 'Mum', colors: { hair: '', shirt: '' }, lines: [], heals: true },
      },
    },
  },
}));

beforeEach(() => {
  areas.village.map = '@ , w';
  areas.wood.map = [
    '# # # # # #',
    '# < , , > #',
    '# # b # # #',
    '# # . # # #',
    '# # + # # #',
    '# # # # # #',
  ].join('\n');
  // Its reciprocal exit leads back to the wood, so this tests travel beyond a village-centred star.
  areas.cave.map = 'w , * * * *';
});

// These surveys start in the village with a sword, rather than beside the bed at home.
function inVillage(): World {
  const hero = { ...createHero(), sword: true, power: 1 };
  const game = createGame(areas.village.map, { legend: areas.village, hero });
  return { area: 'village', game, visited: new Map([['village', game]]) };
}

describe('connected world survey', () => {
  it.each([
    { map: '@ +', revealedBeforePickup: true },
    { map: '@ s +', revealedBeforePickup: true },
    { map: '@ +\ns #', revealedBeforePickup: false },
  ])('records ground pickup visibility for $map', ({ map, revealedBeforePickup }) => {
    areas.village.map = map;
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    const pickups = report.actions.filter((action) => action.groundFind);
    expect(pickups).toHaveLength(1);
    expect(pickups[0]).toMatchObject({
      power: 1,
      groundFind: { find: 'heartPiece', revealedBeforePickup },
    });
  });

  it('does not count a chief drop as a ground pickup', () => {
    areas.village.map = '@ G';
    const world = inVillage();
    world.game.hero.power = 3;
    const report = surveyWorld({ profile: 'groups' }, world);
    expect(report.actions.flatMap((action) => action.events)).toContainEqual(
      expect.objectContaining({ type: 'find', find: 'heart' }),
    );
    expect(report.actions.some((action) => action.groundFind)).toBe(false);
  });

  it('does not count displayed shop wares as ground pickups', () => {
    const world = inVillage();
    const game = createGame('@ w', { legend: { wares: { w: { find: 'whetstone', price: 1 } } } });
    game.hero.coins = 1;
    world.game = game;
    world.visited.set('village', game);
    const report = surveyWorld({ profile: 'groups' }, world);
    expect(game.hero.whetstones).toBe(1);
    expect(report.actions.some((action) => action.groundFind)).toBe(false);
  });

  it('earns power elsewhere and returns to a persistent region with no power rewards', () => {
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    expect(report.world.game.hero.power).toBe(2);
    const visits = report.visits.filter((visit) => visit.area === 'wood');
    expect(visits[0]).toMatchObject({ powerOnEntry: 1, powerOnExit: 1, collected: 0 });
    expect(visits.some((visit) => visit.powerOnEntry === 2 && visit.collected === 1)).toBe(true);
    expect(
      report.access.find((access) => access.area === 'wood' && access.at.y === 4),
    ).toMatchObject({
      revealed: 2,
      reachable: 2,
      collected: 2,
    });
    expect(
      report.world.visited.get('wood')?.tiles.find((tile) => tile.monster)?.monster?.alive,
    ).toBe(false);
    expect(
      report.actions.flatMap((action) => action.events).filter((event) => event.type === 'find'),
    ).toHaveLength(5);
  });

  it('does not count a disconnected flood-revealed find as collected or reachable', () => {
    areas.village.map = '@ #\n# +';
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    expect(report.access.find((access) => access.at.x === 1 && access.at.y === 1)).toEqual({
      area: 'village',
      at: { x: 1, y: 1 },
      revealed: 1,
    });
    expect(report.world.game.hero.heartPieces).toBe(0);
    expect(report.actions.some((action) => action.groundFind)).toBe(false);
  });

  it('does not walk through an exit before actually returning from its destination', () => {
    areas.village.map = '@ w +';
    areas.wood.map = '<';
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    expect(report.access.find((entry) => entry.area === 'village' && entry.at.x === 2)).toEqual({
      area: 'village',
      at: { x: 2, y: 0 },
      revealed: 1,
    });
    expect(report.world.area).toBe('wood');
  });

  it('returns through an exit to explore its other side without needing a power increase', () => {
    areas.village.map = '@ w +';
    areas.wood.map = '< ,';
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    expect(
      report.access.find((entry) => entry.area === 'village' && entry.at.x === 2),
    ).toMatchObject({
      reachable: 1,
      collected: 1,
    });
    expect(report.actions).toContainEqual(
      expect.objectContaining({
        area: 'wood',
        kind: 'travel',
        events: [{ type: 'travel', to: 'village' }],
      }),
    );
  });

  it('uses a second entrance to reach another component of the same map', () => {
    areas.village.map = '@ , w , c';
    areas.wood.map = '< , # > , +';
    areas.cave.map = '< , w';
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    expect(report.visits.filter((visit) => visit.area === 'wood')[0].collected).toBe(0);
    expect(
      report.access.find((access) => access.area === 'wood' && access.at.x === 5)?.collected,
    ).toBe(1);
    expect(report.world.game.hero.heartPieces).toBe(1);
  });

  it('leaves stronger barriers intact despite spare hearts and access to a healer', () => {
    areas.village.map = '@ , w , h';
    areas.wood.map = '< , G , G';
    const world = inVillage();
    Object.assign(world.game.hero, { power: 2, health: 4, maxHealth: 4 });
    const wood = createGame(areas.wood.map, {
      legend: areas.wood,
      hero: world.game.hero,
      from: 'village',
    });
    for (const tile of wood.tiles) if (tile.monster) delete tile.monster.drop;
    world.visited.set('wood', wood);
    const report = surveyWorld({ profile: 'groups' }, world);
    const fights = report.actions.filter((action) => action.kind === 'fight');
    expect(fights).toHaveLength(0);
    expect(report.world.game.hero.health).toBe(4);
    expect(report.actions.some((action) => action.area === 'home' && action.kind === 'heal')).toBe(
      false,
    );
    expect(wood.tiles.filter((tile) => tile.monster?.alive)).toHaveLength(2);
    expect(report.access.some((entry) => entry.defeated !== undefined)).toBe(false);
  });

  it('never spends health on known or hidden stronger monsters', () => {
    areas.village.map = '@ , w';
    areas.wood.map = '< , G';
    const world = inVillage();
    Object.assign(world.game.hero, { power: 2, health: 3, maxHealth: 3 });
    const report = surveyWorld({ profile: 'groups' }, world);
    expect(report.actions.some((action) => action.kind === 'fight')).toBe(false);
    expect(report.world.visited.get('wood')?.tiles[2].monster?.alive).toBe(true);
    areas.village.map = '@ b . +';
    const hidden = surveyWorld({ profile: 'groups' }, inVillage());
    expect(hidden.world.game.hero.health).toBe(3);
    expect(hidden.world.game.tiles[1].monster?.alive).toBe(true);
  });

  it('stalls on a genuinely ambiguous frontier instead of gambling', () => {
    areas.village.map = '# b + #\n# @ # #';
    const report = surveyWorld({ profile: 'groups' }, inVillage());
    expect(report.actions).toEqual([]);
    expect(report.world.game.hero.health).toBe(3);
    expect(report.world.game.tiles.filter((tile) => !tile.revealed)).toHaveLength(2);
  });

  it('does not invent external upgrades when all known routes are blocked', () => {
    const report = surveyWorld({ profile: 'groups', destinations: [] }, inVillage());
    expect(report.world.visited.size).toBe(1);
    expect(report.world.game.hero.power).toBe(1);
  });
});
