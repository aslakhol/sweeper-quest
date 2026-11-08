import { areas } from '../maps';
import { createGame, type Hero, type Tile } from './game';
import { type AreaId, createWorld, type World } from './world';

// Bump when the shape below changes. Incompatible saves stay stored but cannot be loaded.
const version = 6;
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
  try {
    const save: Save = JSON.parse(text);
    if (save.version !== version || !Array.isArray(save.games) || !save.games.length)
      return undefined;
    if (save.games.some(({ area, map }) => !Object.hasOwn(areas, area) || areas[area].map !== map))
      return undefined;
    if (!save.games.some(({ area }) => area === save.area)) return undefined;
    if (new Set(save.games.map(({ area }) => area)).size !== save.games.length) return undefined;
    const world = createWorld();
    const { hero } = world.game;
    // Check every current hero field before copying data from a file or an older build.
    for (const key of Object.keys(hero) as (keyof Hero)[]) {
      const value = save.hero[key];
      if (typeof hero[key] === 'number') {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined;
      } else if (typeof hero[key] === 'boolean') {
        if (typeof value !== 'boolean') return undefined;
      } else if (
        !Array.isArray(value) ||
        value.some((item) => !['marble', 'spectacles', 'ring'].includes(item))
      )
        return undefined;
    }
    if (save.hero.maxHealth < 1 || save.hero.health > save.hero.maxHealth) return undefined;
    Object.assign(hero, save.hero);
    for (const saved of save.games) {
      const area = areas[saved.area];
      // Any entrance will do, since the saved position replaces it.
      const [entrance] = Object.values(area.exits);
      const game =
        world.visited.get(saved.area) ??
        createGame(area.map, { legend: area, hero, from: entrance.to });
      if (
        !Array.isArray(saved.tiles) ||
        saved.tiles.length !== game.tiles.length ||
        typeof saved.won !== 'boolean' ||
        typeof saved.lost !== 'boolean' ||
        !Number.isInteger(saved.player.x) ||
        !Number.isInteger(saved.player.y) ||
        saved.player.x < 0 ||
        saved.player.x >= game.width ||
        saved.player.y < 0 ||
        saved.player.y >= game.height
      )
        return undefined;
      for (const tile of saved.tiles) {
        if (
          typeof tile.revealed !== 'boolean' ||
          (tile.alive !== undefined && typeof tile.alive !== 'boolean') ||
          (tile.note !== undefined && ![1, 2, 3, 4, 5, 'danger'].includes(tile.note)) ||
          (tile.find !== undefined &&
            ![
              'whetstone',
              'greatstone',
              'heartPiece',
              'heart',
              'coin',
              'marble',
              'spectacles',
              'ring',
            ].includes(tile.find))
        )
          return undefined;
      }
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
  } catch {
    // A damaged save remains available to download and repair.
    return undefined;
  }
}
