export type Point = { x: number; y: number };
export type Note = 1 | 2 | 3 | 4 | 5 | 'danger';
export type Monster = {
  kind: 'slime' | 'bat' | 'goblin';
  level: number;
  alive: boolean;
  goal: boolean;
};
export type Tile = Point & {
  terrain: 'floor' | 'wall' | 'water';
  revealed: boolean;
  note?: Note;
  monster?: Monster;
  shards: number;
};
export type Game = {
  width: number;
  height: number;
  tiles: Tile[];
  start: Point;
  player: Point;
  health: number;
  maxHealth: number;
  power: number;
  shards: number;
  won: boolean;
  lost: boolean;
};
export type GameEvent =
  | { type: 'fight'; from: Point; at: Point; monster: Monster; damage: number }
  | { type: 'shard'; at: Point }
  | { type: 'death' }
  | { type: 'win' };

const monsters = {
  s: { kind: 'slime', level: 1, goal: false },
  b: { kind: 'bat', level: 2, goal: false },
  g: { kind: 'goblin', level: 3, goal: false },
  G: { kind: 'goblin', level: 3, goal: true },
} as const;

export function createGame(source: string): Game {
  const rows = source
    .trim()
    .split('\n')
    .map((row) => row.trim().split(/\s+/));
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width)) throw new Error('Map rows must have equal widths.');
  const tiles = rows.flatMap((row, y) =>
    row.map((symbol, x): Tile => {
      if (!['#', '~', '.', '@', 'P', 'Q', 's', 'b', 'g', 'G'].includes(symbol)) {
        throw new Error(`Unknown map symbol "${symbol}" at ${x},${y}.`);
      }
      return {
        x,
        y,
        terrain: symbol === '#' ? 'wall' : symbol === '~' ? 'water' : 'floor',
        revealed: symbol === '#' || symbol === '~',
        shards: symbol === 'P' ? 2 : symbol === 'Q' ? 3 : 0,
        monster:
          symbol === 's' || symbol === 'b' || symbol === 'g' || symbol === 'G'
            ? { ...monsters[symbol], alive: true }
            : undefined,
      };
    }),
  );
  const starts = rows.flatMap((row, y) =>
    row.flatMap((symbol, x) => (symbol === '@' ? [{ x, y }] : [])),
  );
  if (starts.length !== 1) throw new Error('Map must have exactly one start (@).');
  const start = starts[0];
  const game: Game = {
    width,
    height: rows.length,
    tiles,
    start,
    player: { ...start },
    health: 10,
    maxHealth: 10,
    power: 1,
    shards: 0,
    won: false,
    lost: false,
  };
  revealStep(game, start);
  return game;
}

export function tileAt(game: Game, point: Point): Tile | undefined {
  if (point.x < 0 || point.y < 0 || point.x >= game.width || point.y >= game.height)
    return undefined;
  return game.tiles[point.y * game.width + point.x];
}
export function same(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}
export function distance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
export function neighbors(game: Game, point: Point): Tile[] {
  const tiles: Tile[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const tile = tileAt(game, { x: point.x + dx, y: point.y + dy });
      if (tile) tiles.push(tile);
    }
  }
  return tiles;
}
export function numberAt(game: Game, point: Point): number {
  return neighbors(game, point).reduce(
    (sum, tile) => sum + (tile.monster?.alive ? tile.monster.level : 0),
    0,
  );
}
export function canStep(game: Game, from: Point, to: Point): boolean {
  if (distance(from, to) !== 1 || tileAt(game, to)?.terrain !== 'floor') return false;
  if (from.x !== to.x && from.y !== to.y) {
    return (
      tileAt(game, { x: from.x, y: to.y })?.terrain === 'floor' &&
      tileAt(game, { x: to.x, y: from.y })?.terrain === 'floor'
    );
  }
  return true;
}
function revealStep(game: Game, point: Point): void {
  const tile = tileAt(game, point);
  if (!tile) return;
  tile.revealed = true;
  delete tile.note;
  if (numberAt(game, point) !== 0) return;
  const pending = [tile];
  const visited = new Set<Tile>([tile]);
  for (let index = 0; index < pending.length; index++) {
    for (const neighbor of neighbors(game, pending[index])) {
      if (neighbor.terrain !== 'floor' || neighbor.monster?.alive || visited.has(neighbor))
        continue;
      visited.add(neighbor);
      neighbor.revealed = true;
      delete neighbor.note;
      if (numberAt(game, neighbor) === 0) pending.push(neighbor);
    }
  }
}
export function setNote(game: Game, point: Point, note: Note | undefined): void {
  const tile = tileAt(game, point);
  if (!tile || tile.revealed || tile.terrain !== 'floor') return;
  tile.note = note;
}
export function cycleNote(game: Game, point: Point): void {
  const note = tileAt(game, point)?.note;
  const next =
    note === 1 ? 2 : note === 2 ? 3 : note === 3 ? 4 : note === 4 ? 5 : note === 5 ? undefined : 1;
  setNote(game, point, next);
}
// Each level the monster has above your power costs that many times its level.
export function fightDamage(game: Game, monster: Monster): number {
  return monster.level * Math.max(0, monster.level - game.power);
}
// Fights always resolve: the monster dies unless its damage kills you first.
export function step(game: Game, target: Point): GameEvent[] {
  if (game.lost || !canStep(game, game.player, target)) return [];
  const tile = tileAt(game, target);
  if (!tile) return [];
  const events: GameEvent[] = [];
  if (tile.monster?.alive) {
    tile.revealed = true;
    delete tile.note;
    const damage = fightDamage(game, tile.monster);
    game.health = Math.max(0, game.health - damage);
    events.push({ type: 'fight', from: game.player, at: target, monster: tile.monster, damage });
    if (!game.health) {
      game.lost = true;
      events.push({ type: 'death' });
      return events;
    }
    tile.monster.alive = false;
    if (tile.monster.goal && !game.won) {
      game.won = true;
      events.push({ type: 'win' });
    }
  }
  game.player = { x: target.x, y: target.y };
  revealStep(game, target);
  if (tile.shards) {
    game.shards += tile.shards;
    game.power = game.shards >= 5 ? 3 : game.shards >= 2 ? 2 : 1;
    tile.shards = 0;
    events.push({ type: 'shard', at: target });
  }
  return events;
}

// A single breadth-first search visits only known, unoccupied floor tiles.
// Unknown contents never influence the route or the stopping position.
export function planWalk(game: Game, target: Point): Point[] | null {
  const targetTile = tileAt(game, target);
  if (targetTile?.terrain !== 'floor') return null;
  const key = (p: Point) => p.y * game.width + p.x;
  const queue: Point[] = [game.player];
  const previous = new Map<number, Point | null>([[key(game.player), null]]);
  let closest = game.player;
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (
      Math.hypot(current.x - target.x, current.y - target.y) <
      Math.hypot(closest.x - target.x, closest.y - target.y)
    )
      closest = current;
    if (same(current, target)) {
      closest = current;
      break;
    }
    for (const next of neighbors(game, current)) {
      if (
        previous.has(key(next)) ||
        !canStep(game, current, next) ||
        !next.revealed ||
        next.monster?.alive
      )
        continue;
      previous.set(key(next), current);
      queue.push(next);
    }
  }
  if (targetTile.revealed && !same(closest, target)) return null;
  if (same(closest, game.player)) return same(target, game.player) ? [] : null;
  const path: Point[] = [];
  let current: Point | null = closest;
  while (current && !same(current, game.player)) {
    path.push({ x: current.x, y: current.y });
    current = previous.get(key(current)) ?? null;
  }
  return path.reverse();
}
