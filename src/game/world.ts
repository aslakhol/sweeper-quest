import { areas } from '../maps';
import { arrive, createGame, type Game } from './game';

export type AreaId = keyof typeof areas;
export type World = { area: AreaId; game: Game; visited: Map<AreaId, Game> };

function isArea(id: string): id is AreaId {
  return Object.hasOwn(areas, id);
}

// A new game starts with waking up beside your bed at home.
export function createWorld(): World {
  const game = createGame(areas.home.map, { legend: areas.home, from: 'village' });
  game.player = { ...areas.home.bedside };
  return { area: 'home', game, visited: new Map([['home', game]]) };
}

// Maps keep their state between visits, and the hero comes along.
export function travel(world: World, to: string, from: string = world.area): void {
  if (!isArea(to)) throw new Error(`Unknown area "${to}".`);
  const area = areas[to];
  let game = world.visited.get(to);
  if (game) arrive(game, from);
  else {
    game = createGame(area.map, { legend: area, hero: world.game.hero, from });
    world.visited.set(to, game);
  }
  world.area = to;
  world.game = game;
}

// A defeat costs the walk back: you wake beside your bed with every heart, and the map stays as it was.
export function wakeAtHome(world: World): void {
  world.game.lost = false;
  world.game.hero.health = world.game.hero.maxHealth;
  travel(world, 'home', 'village');
  world.game.player = { ...areas.home.bedside };
}
