import { canStep, type Game, neighbors, numberAt, step, type Tile, tileAt } from './game.ts';

export const solverProfiles = ['direct', 'bounds', 'groups'] as const;
export type SolverProfile = (typeof solverProfiles)[number];

// Public roster limit, never inferred from the contents of an individual map.
// Raise this together with the player-facing monster legend when adding stronger hidden monsters.
export const highestHiddenLevel = 3;

export type Clue = {
  at: number;
  value: number;
  known: { at: number; level: number }[];
  cells: number[];
  sum: number;
};
export type Observation = { hidden: number[]; clues: Clue[]; maxLevel: number };
export type Deduction = {
  id: number;
  rule: 'direct' | 'bounds' | 'subset';
  target: number;
  low: number;
  high: number;
  clues: number[];
  parents: number[];
};
type Bounds = { low: number; high: number; lowReason?: number; highReason?: number };
type Constraint = { cells: number[]; sum: number; clues: number[]; parents: number[] };

// This is the only boundary between game state and deduction. No notes, hidden monsters or finds
// are passed to deduce(). A clue can count hidden monsters, but only its displayed sum is exposed.
export function observe(game: Game): Observation {
  const id = (tile: Tile) => tile.y * game.width + tile.x;
  const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
  const unknown = new Set(hidden);
  const clues = game.tiles
    .filter(
      (tile) => tile.revealed && tile.terrain === 'floor' && !tile.person && !tile.monster?.alive,
    )
    .map((tile) => {
      const around = neighbors(game, tile);
      const known = around.flatMap((neighbor) =>
        neighbor.revealed && neighbor.monster?.alive
          ? [{ at: id(neighbor), level: neighbor.monster.level }]
          : [],
      );
      const value = numberAt(game, tile);
      return {
        at: id(tile),
        value,
        known,
        cells: around.filter((neighbor) => unknown.has(neighbor)).map(id),
        sum: value - known.reduce((sum, monster) => sum + monster.level, 0),
      };
    });
  return { hidden: hidden.map(id), clues, maxLevel: highestHiddenLevel };
}

// Groups adds subset subtraction; it does not enumerate cases or claim expert completeness.
export function deduce(observation: Observation, profile: SolverProfile = 'bounds') {
  const { maxLevel } = observation;
  if (!Number.isInteger(maxLevel) || maxLevel < 1) throw new Error('Invalid public monster cap.');
  const bounds = new Map<number, Bounds>(
    observation.hidden.map((id) => [id, { low: 0, high: maxLevel }]),
  );
  const deductions: Deduction[] = [];
  const constraints: Constraint[] = observation.clues.map((clue) => ({
    cells: clue.cells,
    sum: clue.sum,
    clues: [clue.at],
    parents: [],
  }));
  const get = (id: number) => {
    const bound = bounds.get(id);
    if (!bound) throw new Error(`Clue refers to non-hidden tile ${id}.`);
    return bound;
  };
  const reasons = (cells: number[]) =>
    cells.flatMap((id) => {
      const { lowReason, highReason } = get(id);
      return [lowReason, highReason].filter((reason) => reason !== undefined);
    });
  function narrow(
    id: number,
    low: number,
    high: number,
    source: Constraint,
    rule: Deduction['rule'],
  ) {
    const before = get(id);
    low = Math.max(low, before.low);
    high = Math.min(high, before.high);
    if (low > high) throw new Error(`Contradictory clues at ${source.clues.join(', ')}.`);
    if (low === before.low && high === before.high) return false;
    const proof = deductions.length;
    deductions.push({
      id: proof,
      rule,
      target: id,
      low,
      high,
      clues: source.clues,
      parents: [...new Set([...source.parents, ...reasons(source.cells)])],
    });
    bounds.set(id, {
      low,
      high,
      lowReason: low !== before.low ? proof : before.lowReason,
      highReason: high !== before.high ? proof : before.highReason,
    });
    return true;
  }
  function apply(source: Constraint, rule: Deduction['rule']) {
    const lowSum = source.cells.reduce((sum, id) => sum + get(id).low, 0);
    const highSum = source.cells.reduce((sum, id) => sum + get(id).high, 0);
    if (!Number.isInteger(source.sum) || lowSum > source.sum || highSum < source.sum)
      throw new Error(`Contradictory clues at ${source.clues.join(', ')}.`);
    let changed = false;
    for (const id of source.cells) {
      const { low, high } = get(id);
      changed =
        narrow(id, source.sum - highSum + high, source.sum - lowSum + low, source, rule) || changed;
    }
    return changed;
  }
  // Direct reading neither propagates bounds nor subtracts inferred hidden monsters.
  if (profile === 'direct') {
    for (const source of constraints) {
      if (
        !Number.isInteger(source.sum) ||
        source.sum < 0 ||
        source.sum > source.cells.length * maxLevel
      )
        throw new Error(`Contradictory clues at ${source.clues.join(', ')}.`);
      for (const id of source.cells)
        narrow(id, source.cells.length === 1 ? source.sum : 0, source.sum, source, 'direct');
    }
    return { bounds, deductions };
  }
  for (;;) {
    let changed = false;
    for (const source of constraints) changed = apply(source, 'bounds') || changed;
    // Exhaust simpler reasoning before giving a move a more complex explanation.
    if (changed) continue;
    if (profile !== 'groups') break;
    const groups = constraints.map((source): Constraint => {
      const exact = source.cells.filter((id) => get(id).low === get(id).high);
      return {
        cells: source.cells.filter((id) => get(id).low !== get(id).high),
        sum: source.sum - exact.reduce((sum, id) => sum + get(id).low, 0),
        clues: source.clues,
        parents: reasons(exact),
      };
    });
    for (const smaller of groups) {
      if (!smaller.cells.length) continue;
      for (const larger of groups) {
        if (smaller === larger || smaller.cells.length > larger.cells.length) continue;
        if (!smaller.cells.every((id) => larger.cells.includes(id))) continue;
        changed =
          apply(
            {
              cells: larger.cells.filter((id) => !smaller.cells.includes(id)),
              sum: larger.sum - smaller.sum,
              clues: [...new Set([...smaller.clues, ...larger.clues])],
              parents: [...smaller.parents, ...larger.parents],
            },
            'subset',
          ) || changed;
      }
    }
    if (!changed) break;
  }
  return { bounds, deductions };
}

export function explain(result: ReturnType<typeof deduce>, target: number) {
  const root = result.bounds.get(target)?.highReason;
  const used = new Set<number>();
  function visit(id: number) {
    if (used.has(id)) return;
    used.add(id);
    for (const parent of result.deductions[id].parents) visit(parent);
  }
  if (root !== undefined) visit(root);
  return result.deductions.filter((deduction) => used.has(deduction.id));
}

// Map-file generator compatibility: ordinary callers still use the original bounds profile.
export function levelBounds(game: Game, profile: SolverProfile = 'bounds') {
  const { bounds } = deduce(observe(game), profile);
  return new Map([...bounds].map(([id, bound]) => [game.tiles[id], bound.high]));
}

export function reachableTiles(game: Game) {
  const start = tileAt(game, game.player);
  if (!start) return [];
  const seen = new Set([start]);
  for (const tile of seen) {
    for (const next of neighbors(game, tile)) {
      if (
        next.revealed &&
        !next.monster?.alive &&
        !next.person &&
        !next.exit &&
        canStep(game, tile, next)
      )
        seen.add(next);
    }
  }
  return [...seen];
}

// Conditional layers preserve kills and reveals, but grant power instead of earning it. They do
// not certify world progression. Flood-visible tiles are tracked separately from walkable tiles.
export function measureLayers(game: Game, maxPower: number, profile: SolverProfile = 'bounds') {
  const revealed = new Map<Tile, number>();
  const reachable = new Map<Tile, number>();
  for (let power = 1; power <= maxPower; power++) {
    for (;;) {
      game.hero.power = power;
      const high = levelBounds(game, profile);
      let move: { from: Tile; target: Tile } | undefined;
      for (const from of reachableTiles(game)) {
        const target = neighbors(game, from).find(
          (tile) =>
            canStep(game, from, tile) && !tile.revealed && (high.get(tile) ?? Infinity) <= power,
        );
        if (target) {
          move = { from, target };
          break;
        }
      }
      if (!move) break;
      game.player = { x: move.from.x, y: move.from.y };
      step(game, move.target);
    }
    for (const tile of game.tiles)
      if (tile.terrain === 'floor' && tile.revealed && !revealed.has(tile))
        revealed.set(tile, power);
    for (const tile of reachableTiles(game)) if (!reachable.has(tile)) reachable.set(tile, power);
  }
  return { revealed, reachable };
}

export function openLayers(game: Game, maxPower: number) {
  return measureLayers(game, maxPower).revealed;
}
