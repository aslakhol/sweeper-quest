import { areas } from '../maps';
import { createGame, type Hero, type Tile } from './game';
import { type AreaId, createWorld, type World } from './world';

// Bump when the shape below changes. Saves from an older shape, or for an edited map, are dropped.
const version = 1;
type SavedTile = Pick<Tile, 'revealed' | 'note' | 'find'> & { alive?: boolean };
type Save = {
  version: number;
  area: AreaId;
  hero: Hero;
  games: {
    area: AreaId;
    map: string;
    player: { x: number; y: number };
    won: boolean;
    lost: boolean;
    tiles: SavedTile[];
  }[];
};

export function serialize(world: World): string {
  const save: Save = {
    version,
    area: world.area,
    hero: world.game.hero,
    games: [...world.visited].map(([area, game]) => ({
      area,
      map: areas[area].map,
      player: game.player,
      won: game.won,
      lost: game.lost,
      tiles: game.tiles.map(({ revealed, note, find, monster }) => ({
        revealed,
        note,
        find,
        alive: monster?.alive,
      })),
    })),
  };
  return JSON.stringify(save);
}

// Only the parts of a map that play can change are saved; the rest comes from its source.
export function deserialize(text: string): World | undefined {
  let save: Save;
  try {
    save = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (save.version !== version) return undefined;
  if (save.games.some(({ area, map }) => areas[area]?.map !== map)) return undefined;
  const world = createWorld();
  const { hero } = world.game;
  Object.assign(hero, save.hero);
  for (const saved of save.games) {
    const area = areas[saved.area];
    const game =
      world.visited.get(saved.area) ??
      createGame(area.map, { legend: area, hero, from: 'village' });
    Object.assign(game, { player: saved.player, won: saved.won, lost: saved.lost });
    game.tiles.forEach((tile, index) => {
      const { revealed, note, find, alive } = saved.tiles[index];
      Object.assign(tile, { revealed, note, find });
      if (tile.monster && alive !== undefined) tile.monster.alive = alive;
    });
    world.visited.set(saved.area, game);
  }
  const game = world.visited.get(save.area);
  return game && { ...world, area: save.area, game };
}
