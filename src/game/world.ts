import { areas } from '../maps';
import { arrive, createGame, type Game } from './game';

export type AreaId = keyof typeof areas;
export type World = { area: AreaId; game: Game; visited: Map<AreaId, Game> };

function isArea(id: string): id is AreaId {
  return Object.hasOwn(areas, id);
}

export function createWorld(): World {
  const game = createGame(areas.village.map, { legend: areas.village });
  return { area: 'village', game, visited: new Map([['village', game]]) };
}

// Maps keep their state between visits, and the hero comes along.
export function travel(world: World, to: string): void {
  if (!isArea(to)) throw new Error(`Unknown area "${to}".`);
  const from = world.area;
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
