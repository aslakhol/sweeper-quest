export type Point = { x: number; y: number };
export type Note = 1 | 2 | 3 | 4 | 5 | 'danger';
export type Monster = {
  kind: 'slime' | 'bat' | 'goblin';
  level: number;
  alive: boolean;
  goal: boolean;
  drop?: Find;
};
// Things villagers have lost out in the world. Bringing one back earns their reward.
export type Keepsake = 'marble' | 'spectacles' | 'ring';
export type Find =
  | 'sword'
  | 'whetstone'
  | 'greatstone'
  | 'heartPiece'
  | 'heart'
  | 'coin'
  | Keepsake;
export type Tile = Point & {
  terrain: 'floor' | 'wall' | 'water';
  // How the tile is drawn. Only terrain affects the rules.
  look:
    | 'grass'
    | 'path'
    | 'rock'
    | 'tree'
    | 'roof'
    | 'house'
    | 'door'
    | 'fence'
    | 'water'
    | 'wood'
    | 'interior'
    | 'mat'
    | 'table'
    | 'bed'
    | 'shelf'
    | 'cave'
    | 'stairs'
    | 'gate';
  revealed: boolean;
  note?: Note;
  monster?: Monster;
  // Lies hidden on the tile until someone walks onto it.
  find?: Find;
  // A find on display that walking up to offers to sell.
  price?: number;
  // The map that stepping onto this tile leads to.
  exit?: string;
  person?: Person;
};
export type Person = {
  name: string;
  lines: readonly string[];
  colors: { hair: string; shirt: string };
  // Finishing a conversation with them restores every heart.
  heals?: boolean;
  // What they say instead when you already have every heart.
  fullHealthLines?: readonly string[];
  // What they say when you wake up at the start of a new game.
  introLines?: readonly string[];
  // What they say when you wake up after a defeat.
  wakeLines?: readonly string[];
  // They hand over a reward, once, for the keepsake they lost.
  quest?: {
    wants: Keepsake;
    reward: Find;
    thanks: readonly string[];
    // What they say once the quest is done, instead of their usual lines.
    after: readonly string[];
  };
  // They ask you to help, hand over a sword when you agree, and teach you in lessons.
  training?: Training;
};
export type Training = {
  question: string;
  accepted: readonly string[];
  declined: readonly string[];
  // Each lesson is a map you are sent into once they have explained it.
  lessons: readonly { area: string; lines: readonly string[] }[];
  // What they say once every lesson is won, instead of their usual lines.
  after: readonly string[];
};
// Symbols a particular map adds on top of the shared ones.
export type Legend = {
  // How hidden floor, and the ground under monsters and people, is drawn.
  floor?: Tile['look'];
  exits?: Record<string, { to: string; look: Tile['look'] }>;
  people?: Record<string, Person>;
  // Finds that belong to this map, such as a villager's keepsake.
  finds?: Record<string, Find>;
  // Finds for sale on a table.
  wares?: Record<string, { find: Find; price: number }>;
};
// The hero's stats travel with the player from map to map.
export type Hero = {
  // Without a sword you have power 0, and even a slime hurts.
  sword: boolean;
  // How many of the dojo lessons you have won.
  lessons: number;
  health: number;
  maxHealth: number;
  power: number;
  whetstones: number;
  heartPieces: number;
  coins: number;
  carrying: Keepsake[];
  // Keepsakes someone has asked you to look for.
  asked: Keepsake[];
  returned: Keepsake[];
};
export type Game = {
  width: number;
  height: number;
  tiles: Tile[];
  start: Point;
  player: Point;
  hero: Hero;
  won: boolean;
  lost: boolean;
};
export type GameEvent =
  | { type: 'fight'; from: Point; at: Point; monster: Monster; damage: number }
  | { type: 'blocked'; at: Point }
  | { type: 'death' }
  | { type: 'win' }
  | { type: 'travel'; to: string }
  | { type: 'talk'; person: Person; lines: readonly string[] }
  | { type: 'heal'; at: Point; amount: number }
  | { type: 'find'; at: Point; find: Find }
  | { type: 'offer'; at: Point; find: Find; price: number }
  | { type: 'ask'; at: Point; person: Person; question: string }
  | { type: 'lesson'; area: string }
  | { type: 'powerUp'; at: Point; power: number }
  | { type: 'heartUp'; at: Point; maxHealth: number };

const grounds = {
  '.': { terrain: 'floor', look: 'grass', revealed: false },
  '@': { terrain: 'floor', look: 'grass', revealed: true },
  ',': { terrain: 'floor', look: 'grass', revealed: true },
  '=': { terrain: 'floor', look: 'path', revealed: true },
  '#': { terrain: 'wall', look: 'rock', revealed: true },
  T: { terrain: 'wall', look: 'tree', revealed: true },
  '^': { terrain: 'wall', look: 'roof', revealed: true },
  H: { terrain: 'wall', look: 'house', revealed: true },
  D: { terrain: 'wall', look: 'door', revealed: true },
  F: { terrain: 'wall', look: 'fence', revealed: true },
  '~': { terrain: 'water', look: 'water', revealed: true },
  _: { terrain: 'floor', look: 'wood', revealed: true },
  W: { terrain: 'wall', look: 'interior', revealed: true },
  O: { terrain: 'wall', look: 'table', revealed: true },
  B: { terrain: 'wall', look: 'bed', revealed: true },
  S: { terrain: 'wall', look: 'shelf', revealed: true },
} as const satisfies Record<string, Pick<Tile, 'terrain' | 'look' | 'revealed'>>;
const monsters = {
  s: { kind: 'slime', level: 1, goal: false },
  b: { kind: 'bat', level: 2, goal: false },
  g: { kind: 'goblin', level: 3, goal: false },
  G: { kind: 'goblin', level: 3, goal: true, drop: 'heart' },
  C: { kind: 'goblin', level: 3, goal: true, drop: 'greatstone' },
} as const;
const findSymbols = { '*': 'whetstone', '+': 'heartPiece', $: 'coin' } as const;

// Four pieces make one level of power or one heart. A greatstone or a heart counts as all four.
export const piecesPerUpgrade = 4;
const startingHearts = 3;

function isKey<T extends object>(object: T, key: string): key is Extract<keyof T, string> {
  return Object.hasOwn(object, key);
}

export function createHero(): Hero {
  return {
    sword: false,
    lessons: 0,
    health: startingHearts,
    maxHealth: startingHearts,
    power: 0,
    whetstones: 0,
    heartPieces: 0,
    coins: 0,
    carrying: [],
    asked: [],
    returned: [],
  };
}

// A map entered from another starts the player on the exit leading back there.
function exitTo(tiles: Tile[], from: string): Point {
  const exits = tiles.filter((tile) => tile.exit === from);
  if (exits.length !== 1) throw new Error(`Map must have exactly one exit to ${from}.`);
  return { x: exits[0].x, y: exits[0].y };
}

export function createGame(
  source: string,
  { legend = {}, hero = createHero(), from }: { legend?: Legend; hero?: Hero; from?: string } = {},
): Game {
  const rows = source
    .trim()
    .split('\n')
    .map((row) => row.trim().split(/\s+/));
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width)) throw new Error('Map rows must have equal widths.');
  const tiles = rows.flatMap((row, y) =>
    row.map((symbol, x): Tile => {
      const exit = legend.exits?.[symbol];
      if (exit) return { x, y, terrain: 'floor', look: exit.look, revealed: true, exit: exit.to };
      const ware = legend.wares?.[symbol];
      if (ware) return { x, y, terrain: 'wall', look: 'table', revealed: true, ...ware };
      const person = legend.people?.[symbol];
      if (person)
        return { x, y, terrain: 'floor', look: legend.floor ?? 'grass', revealed: true, person };
      if (isKey(monsters, symbol)) {
        const monster = monsters[symbol];
        // The chief is the visible goal; every other monster hides until fought.
        return {
          x,
          y,
          terrain: 'floor',
          look: legend.floor ?? 'grass',
          revealed: monster.goal,
          monster: { ...monster, alive: true },
        };
      }
      const find =
        legend.finds?.[symbol] ?? (isKey(findSymbols, symbol) ? findSymbols[symbol] : undefined);
      if (find)
        return { x, y, terrain: 'floor', look: legend.floor ?? 'grass', revealed: false, find };
      if (symbol === '.' && legend.floor)
        return { x, y, terrain: 'floor', look: legend.floor, revealed: false };
      if (isKey(grounds, symbol)) return { x, y, ...grounds[symbol] };
      throw new Error(`Unknown map symbol "${symbol}" at ${x},${y}.`);
    }),
  );
  const starts = rows.flatMap((row, y) =>
    row.flatMap((symbol, x) => (symbol === '@' ? [{ x, y }] : [])),
  );
  if (!from && starts.length !== 1) throw new Error('Map must have exactly one start (@).');
  const start = from ? exitTo(tiles, from) : starts[0];
  const game: Game = {
    width,
    height: rows.length,
    tiles,
    start,
    player: { ...start },
    hero,
    won: false,
    lost: false,
  };
  revealStep(game, start);
  return game;
}

// Coming back to a map you have visited puts you on the exit you left by.
export function arrive(game: Game, from: string): void {
  game.player = exitTo(game.tiles, from);
  revealStep(game, game.player);
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
  // A diagonal step only needs one open corner; it cannot squeeze between two obstacles.
  if (from.x !== to.x && from.y !== to.y) {
    return (
      tileAt(game, { x: from.x, y: to.y })?.terrain === 'floor' ||
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
// Notes only go on hidden floor.
export function canNote(game: Game, point: Point): boolean {
  const tile = tileAt(game, point);
  return tile?.terrain === 'floor' && !tile.revealed;
}
export function setNote(game: Game, point: Point, note: Note | undefined): void {
  const tile = tileAt(game, point);
  if (tile && canNote(game, point)) tile.note = note;
}
// Placing the note a tile already has removes it; a different note replaces it.
export function toggleNote(game: Game, point: Point, note: Note): void {
  setNote(game, point, tileAt(game, point)?.note === note ? undefined : note);
}
export function cycleNote(game: Game, point: Point): void {
  const note = tileAt(game, point)?.note;
  const next =
    note === 1 ? 2 : note === 2 ? 3 : note === 3 ? 4 : note === 4 ? 5 : note === 5 ? undefined : 1;
  setNote(game, point, next);
}
// Each level the monster has above your power costs that many times its level.
export function fightDamage(game: Game, monster: Monster): number {
  return monster.level * Math.max(0, monster.level - game.hero.power);
}
export function heal(game: Game): GameEvent[] {
  const amount = game.hero.maxHealth - game.hero.health;
  if (!amount) return [];
  game.hero.health = game.hero.maxHealth;
  return [{ type: 'heal', at: game.player, amount }];
}
export function collect(game: Game, at: Point, find: Find): GameEvent[] {
  const { hero } = game;
  const events: GameEvent[] = [{ type: 'find', at, find }];
  switch (find) {
    case 'sword':
    case 'whetstone':
    case 'greatstone': {
      if (find === 'sword') hero.sword = true;
      else hero.whetstones += find === 'whetstone' ? 1 : piecesPerUpgrade;
      const power = Number(hero.sword) + Math.floor(hero.whetstones / piecesPerUpgrade);
      if (power > hero.power) {
        hero.power = power;
        events.push({ type: 'powerUp', at, power });
      }
      break;
    }
    case 'heartPiece':
    case 'heart': {
      hero.heartPieces += find === 'heartPiece' ? 1 : piecesPerUpgrade;
      const maxHealth = startingHearts + Math.floor(hero.heartPieces / piecesPerUpgrade);
      if (maxHealth > hero.maxHealth) {
        hero.maxHealth = maxHealth;
        hero.health = maxHealth;
        events.push({ type: 'heartUp', at, maxHealth });
      }
      break;
    }
    case 'coin':
      hero.coins++;
      break;
    default:
      hero.carrying.push(find);
  }
  return events;
}
export function canFinishQuest(hero: Hero, { quest }: Person): boolean {
  return !!quest && hero.carrying.includes(quest.wants);
}
// Bringing a person what they want hands over their reward along with their thanks.
function talk(game: Game, at: Point, person: Person): GameEvent[] {
  const { quest, training } = person;
  const { hero } = game;
  if (training) {
    if (!hero.sword)
      return [
        { type: 'talk', person, lines: person.lines },
        { type: 'ask', at, person, question: training.question },
      ];
    const lesson = training.lessons[hero.lessons];
    if (!lesson) return [{ type: 'talk', person, lines: training.after }];
    return [
      { type: 'talk', person, lines: lesson.lines },
      { type: 'lesson', area: lesson.area },
    ];
  }
  if (quest && !hero.asked.includes(quest.wants)) hero.asked.push(quest.wants);
  if (person.fullHealthLines && hero.health === hero.maxHealth)
    return [{ type: 'talk', person, lines: person.fullHealthLines }];
  if (quest && hero.returned.includes(quest.wants))
    return [{ type: 'talk', person, lines: quest.after }];
  if (!quest || !canFinishQuest(hero, person))
    return [{ type: 'talk', person, lines: person.lines }];
  hero.carrying = hero.carrying.filter((keepsake) => keepsake !== quest.wants);
  hero.returned.push(quest.wants);
  return [{ type: 'talk', person, lines: quest.thanks }, ...collect(game, at, quest.reward)];
}
// Agreeing to train hands over a sword, and the first lesson follows.
export function answer(game: Game, at: Point, person: Person, yes: boolean): GameEvent[] {
  const { training } = person;
  if (!training || game.hero.sword) return [];
  if (!yes) return [{ type: 'talk', person, lines: training.declined }];
  return [
    { type: 'talk', person, lines: training.accepted },
    ...collect(game, at, 'sword'),
    ...talk(game, at, person),
  ];
}
function forSale(tile: Tile | undefined): tile is Tile & { find: Find; price: number } {
  return !!tile?.find && tile.price !== undefined;
}
export function buy(game: Game, at: Point): GameEvent[] {
  const tile = tileAt(game, at);
  if (!tile?.find || tile.price === undefined || game.hero.coins < tile.price) return [];
  game.hero.coins -= tile.price;
  const events = collect(game, at, tile.find);
  delete tile.find;
  return events;
}
// Hidden stronger monsters hurt and reveal themselves; known ones block without a fight.
export function step(game: Game, target: Point): GameEvent[] {
  if (game.lost) return [];
  const tile = tileAt(game, target);
  // Walking up to a find for sale offers it; buying is a separate choice.
  if (forSale(tile) && distance(game.player, target) === 1)
    return [{ type: 'offer', at: target, find: tile.find, price: tile.price }];
  if (!tile || !canStep(game, game.player, target)) return [];
  if (tile.person) return talk(game, target, tile.person);
  const events: GameEvent[] = [];
  if (tile.monster?.alive) {
    if (tile.revealed && tile.monster.level > game.hero.power)
      return [{ type: 'blocked', at: target }];
    tile.revealed = true;
    delete tile.note;
    const damage = fightDamage(game, tile.monster);
    game.hero.health = Math.max(0, game.hero.health - damage);
    events.push({ type: 'fight', from: game.player, at: target, monster: tile.monster, damage });
    if (!game.hero.health) {
      game.lost = true;
      events.push({ type: 'death' });
      return events;
    }
    if (damage) return events;
    tile.monster.alive = false;
    // Removing a monster can turn previously revealed neighboring clues into zeros.
    for (const neighbor of neighbors(game, tile)) {
      if (
        neighbor.revealed &&
        neighbor.terrain === 'floor' &&
        !neighbor.monster?.alive &&
        numberAt(game, neighbor) === 0
      )
        revealStep(game, neighbor);
    }
    if (tile.monster.goal && !game.won) {
      game.won = true;
      events.push({ type: 'win' });
    }
    if (tile.monster.drop) events.push(...collect(game, target, tile.monster.drop));
  }
  game.player = { x: target.x, y: target.y };
  revealStep(game, target);
  if (tile.find) {
    events.push(...collect(game, target, tile.find));
    delete tile.find;
  }
  if (tile.exit) events.push({ type: 'travel', to: tile.exit });
  return events;
}

// A single breadth-first search visits only known, unoccupied floor tiles.
// Unknown contents never influence the route or the stopping position.
// A hidden target or a person that borders reachable known ground is stepped into at the end
// of the walk; otherwise the walk stops on the known tile closest to a hidden target.
export function planWalk(game: Game, target: Point): Point[] | null {
  const targetTile = tileAt(game, target);
  const ware = forSale(targetTile);
  if (targetTile?.terrain !== 'floor' && !ware) return null;
  const key = (p: Point) => p.y * game.width + p.x;
  const queue: Point[] = [game.player];
  const previous = new Map<number, Point | null>([[key(game.player), null]]);
  let closest = game.player;
  let enter = false;
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (same(current, target)) {
      closest = current;
      break;
    }
    if (
      ware
        ? distance(current, target) === 1
        : (!targetTile.revealed || targetTile.person) && canStep(game, current, target)
    ) {
      closest = current;
      enter = true;
      break;
    }
    if (
      Math.hypot(current.x - target.x, current.y - target.y) <
      Math.hypot(closest.x - target.x, closest.y - target.y)
    )
      closest = current;
    for (const next of neighbors(game, current)) {
      if (
        previous.has(key(next)) ||
        !canStep(game, current, next) ||
        !next.revealed ||
        next.monster?.alive ||
        next.person ||
        // Walking over an exit would leave the map partway.
        (next.exit && !same(next, target))
      )
        continue;
      previous.set(key(next), current);
      queue.push(next);
    }
  }
  if (targetTile.revealed && !enter && !same(closest, target)) return null;
  const path: Point[] = [];
  let current: Point | null = closest;
  while (current && !same(current, game.player)) {
    path.push({ x: current.x, y: current.y });
    current = previous.get(key(current)) ?? null;
  }
  path.reverse();
  if (enter) path.push({ x: target.x, y: target.y });
  return path.length || same(target, game.player) ? path : null;
}
