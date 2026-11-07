import { canStep, type Game, neighbors, numberAt, step, type Tile, tileAt } from './game.ts';

// The strongest monster that can hide. Raise this when a map hides stronger ones.
const highestHiddenLevel = 3;

// Narrow each hidden tile's possible level using only visible clues, like a careful player.
export function levelBounds(game: Game) {
  const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
  const low = new Map<Tile, number>(hidden.map((tile) => [tile, 0]));
  const high = new Map<Tile, number>(hidden.map((tile) => [tile, highestHiddenLevel]));
  const clues = game.tiles.filter(
    (tile) => tile.revealed && tile.terrain === 'floor' && !tile.monster?.alive,
  );
  for (let changed = true; changed; ) {
    changed = false;
    for (const clue of clues) {
      const around = neighbors(game, clue);
      const remaining =
        numberAt(game, clue) -
        around
          .filter((tile) => tile.revealed && tile.monster?.alive)
          .reduce((sum, tile) => sum + (tile.monster?.level ?? 0), 0);
      const unknown = around.filter((tile) => low.has(tile));
      const lowSum = unknown.reduce((sum, tile) => sum + (low.get(tile) ?? 0), 0);
      const highSum = unknown.reduce((sum, tile) => sum + (high.get(tile) ?? 0), 0);
      for (const tile of unknown) {
        const lo = low.get(tile) ?? 0;
        const hi = high.get(tile) ?? highestHiddenLevel;
        const nextHigh = Math.min(hi, remaining - (lowSum - lo));
        const nextLow = Math.max(lo, remaining - (highSum - hi));
        if (nextHigh !== hi || nextLow !== lo) {
          high.set(tile, nextHigh);
          low.set(tile, nextLow);
          changed = true;
        }
      }
    }
  }
  return high;
}
export function reachableTiles(game: Game) {
  const start = tileAt(game, game.player);
  if (!start) return [];
  const seen = new Set([start]);
  for (const tile of seen) {
    for (const next of neighbors(game, tile)) {
      if (next.revealed && !next.monster?.alive && !next.exit && canStep(game, tile, next))
        seen.add(next);
    }
  }
  return [...seen];
}
// Take every move the clues prove free at each power in turn, and note the power that opened each
// tile. Walks are skipped, and power is held fixed however many finds are picked up on the way.
export function openLayers(game: Game, maxPower: number) {
  const layer = new Map<Tile, number>();
  for (let power = 1; power <= maxPower; power++) {
    for (let moved = true; moved; ) {
      moved = false;
      game.hero.power = power;
      const high = levelBounds(game);
      for (const from of reachableTiles(game)) {
        const target = neighbors(game, from).find(
          (tile) =>
            canStep(game, from, tile) && !tile.revealed && (high.get(tile) ?? Infinity) <= power,
        );
        if (!target) continue;
        game.player = { x: from.x, y: from.y };
        step(game, target);
        moved = true;
        break;
      }
    }
    for (const tile of game.tiles)
      if (tile.terrain === 'floor' && tile.revealed && !layer.has(tile)) layer.set(tile, power);
  }
  return layer;
}
