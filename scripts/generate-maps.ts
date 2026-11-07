// Places monsters and finds on the hand-drawn terrain of each outdoor map, keeps the candidate
// closest to its layer targets, and writes it back over the map file.
// Usage: node scripts/generate-maps.ts [candidates] [output directory]
import { readFileSync, writeFileSync } from 'node:fs';
import { createGame, type Legend, neighbors, numberAt, type Point } from '../src/game/game.ts';
import { openLayers } from '../src/game/solver.ts';

type Spec = {
  // File name in src/maps. Walls, water, exits and chiefs are kept; everything else is redrawn.
  file: string;
  legend: Legend;
  from?: string;
  // Where the player comes in. Danger grows with the walking distance from these.
  entries: Point[];
  // Tiles this close to an entry stay empty.
  clearing: number;
  // Monster density at the entries, and how much it grows towards the far end.
  density: [number, number];
  // Share of hidden ground the clues should prove free at powers 1 and 2.
  targets: [number, number];
  // A slime in every gateway keeps the map closed until the first kill.
  guards?: Point[];
  // Rings of bats around a hidden heart piece: climbing clues around an empty spot.
  rings?: Point[];
  // Finds to place on ground that first opens at each power.
  finds: Record<number, string[]>;
};
const specs: Spec[] = [
  {
    file: 'village',
    legend: { exits: { 1: { to: '', look: 'door' }, 2: { to: '', look: 'door' }, 3: { to: '', look: 'door' }, 4: { to: '', look: 'gate' }, '>': { to: '', look: 'stairs' } } },
    entries: [{ x: 15, y: 8 }, { x: 15, y: 23 }],
    clearing: 3,
    density: [0.14, 0.26],
    targets: [0.6, 0.88],
    guards: [{ x: 15, y: 8 }, { x: 15, y: 23 }],
    rings: [{ x: 5, y: 12 }],
    finds: { 1: ['*', '*', '+'], 2: ['*'] },
  },
  {
    file: 'wood',
    legend: { exits: { '<': { to: 'village', look: 'gate' } } },
    from: 'village',
    entries: [{ x: 2, y: 11 }],
    clearing: 3,
    density: [0.14, 0.26],
    targets: [0.45, 0.85],
    finds: { 1: ['*', '*'], 2: ['*', '+'], 3: ['+'] },
  },
  {
    file: 'cave',
    legend: { floor: 'cave', exits: { '<': { to: 'village', look: 'stairs' } } },
    from: 'village',
    entries: [{ x: 7, y: 15 }],
    clearing: 2,
    density: [0.16, 0.26],
    targets: [0.4, 0.8],
    rings: [{ x: 7, y: 11 }],
    finds: { 1: ['*', '+'] },
  },
];

let seed = 12345;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const load = (file: string) =>
  readFileSync(new URL(`../src/maps/${file}.txt`, import.meta.url), 'utf8')
    .trim()
    .split('\n')
    .map((row) => row.trim().split(/\s+/).map((symbol) => ('sbg*+'.includes(symbol) ? '.' : symbol)));
// Walking distance from the nearest entry over hidden floor.
function distances(rows: string[][], entries: Point[]) {
  const distance = rows.map((row) => row.map(() => Infinity));
  for (const { x, y } of entries) distance[y][x] = 0;
  const queue = [...entries];
  for (const { x, y } of queue) {
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
      const next = { x: x + dx, y: y + dy };
      if (rows[next.y]?.[next.x] !== '.' || distance[next.y][next.x] !== Infinity) continue;
      distance[next.y][next.x] = distance[y][x] + 1;
      queue.push(next);
    }
  }
  return distance;
}
function placeMonsters(terrain: string[][], spec: Spec) {
  const rows = terrain.map((row) => [...row]);
  const distance = distances(terrain, spec.entries);
  const farthest = Math.max(...distance.flat().filter(Number.isFinite));
  rows.forEach((row, y) =>
    row.forEach((symbol, x) => {
      if (symbol !== '.' || distance[y][x] <= spec.clearing) return;
      const depth = Number.isFinite(distance[y][x]) ? distance[y][x] / farthest : 1;
      if (random() > spec.density[0] + spec.density[1] * depth) return;
      const goblin = Math.max(0, 0.75 * depth - 0.15);
      const slime = Math.max(0.05, 0.85 - 1.1 * depth);
      const roll = random();
      row[x] = roll < goblin ? 'g' : roll < goblin + slime ? 's' : 'b';
    }),
  );
  for (const { x, y } of spec.rings ?? []) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (terrain[y + dy][x + dx] === '.') rows[y + dy][x + dx] = dx || dy ? 'b' : '.';
      }
    }
  }
  for (const { x, y } of spec.guards ?? []) rows[y][x] = 's';
  return rows;
}
function measure(rows: string[][], spec: Spec) {
  const game = createGame(rows.map((row) => row.join(' ')).join('\n'), { legend: spec.legend, from: spec.from });
  const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
  const layer = openLayers(game, 3);
  const shares = [1, 2, 3].map((power) => hidden.filter((tile) => (layer.get(tile) ?? Infinity) <= power).length / hidden.length);
  const chief = game.tiles.find((tile) => tile.monster?.goal);
  const chiefInReach = !chief || neighbors(game, chief).some((tile) => (layer.get(tile) ?? Infinity) <= 2);
  return { game, hidden, layer, shares, chiefInReach };
}
// Spread finds apart, and prefer tiles beside clues over open ground.
function placeFinds(rows: string[][], spec: Spec, { game, hidden, layer }: ReturnType<typeof measure>) {
  const placed = (spec.rings ?? []).map(({ x, y }) => {
    rows[y][x] = '+';
    return { x, y };
  });
  for (const [power, symbols] of Object.entries(spec.finds)) {
    for (const symbol of symbols) {
      const open = hidden.filter((tile) => layer.get(tile) === Number(power) && rows[tile.y][tile.x] === '.' && !tile.monster);
      const score = (tile: Point) =>
        Math.min(30, ...placed.map((other) => Math.max(Math.abs(other.x - tile.x), Math.abs(other.y - tile.y)))) +
        (numberAt(game, tile) ? 4 : 0) +
        random();
      const best = open.map((tile) => ({ tile, score: score(tile) })).sort((a, b) => b.score - a.score)[0]?.tile;
      if (!best) return false;
      rows[best.y][best.x] = symbol;
      placed.push(best);
    }
  }
  return true;
}
function generate(spec: Spec, candidates: number) {
  const terrain = load(spec.file);
  let best: { rows: string[][]; shares: number[]; miss: number } | undefined;
  for (let i = 0; i < candidates; i++) {
    const rows = placeMonsters(terrain, spec);
    const result = measure(rows, spec);
    const miss = Math.abs(result.shares[0] - spec.targets[0]) + Math.abs(result.shares[1] - spec.targets[1]);
    if (!result.chiefInReach || result.shares[2] < 1 || (best && miss >= best.miss)) continue;
    if (placeFinds(rows, spec, result)) best = { rows, shares: result.shares, miss };
  }
  if (!best) throw new Error(`No candidate worked for ${spec.file}.`);
  console.log(spec.file, best.shares.map((share) => `${Math.round(share * 100)}%`).join(' '));
  return best.rows;
}
const candidates = Number(process.argv[2] ?? 300);
const output = process.argv[3] ?? new URL('../src/maps', import.meta.url).pathname;
for (const spec of specs) {
  const rows = generate(spec, candidates);
  writeFileSync(`${output}/${spec.file}.txt`, `${rows.map((row) => row.join(' ')).join('\n')}\n`);
}
