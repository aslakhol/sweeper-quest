import { type Area, areas } from '../maps';
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
// Areas with several maps, like the dungeon, start a random one fresh each time.
export function travel(world: World, to: string, random = Math.random): void {
  if (!isArea(to)) throw new Error(`Unknown area "${to}".`);
  const from = world.area;
  const area: Area = areas[to];
  let game = world.visited.get(to);
  if (game) arrive(game, from);
  else {
    const map = 'map' in area ? area.map : area.maps[Math.floor(random() * area.maps.length)];
    game = createGame(map, { legend: area, hero: world.game.hero, from });
    if ('map' in area) world.visited.set(to, game);
  }
  world.area = to;
  world.game = game;
}
