import { describe, expect, it } from 'vitest';
import training from '../maps/training.txt?raw';
import {
  canStep,
  createGame,
  cycleNote,
  inspectCorpse,
  numberAt,
  planWalk,
  same,
  setFloodZeros,
  setNote,
  step,
  tileAt,
} from './game';

const p = (x: number, y: number) => ({ x, y });

describe('map and clues', () => {
  it('loads the hand-authored map and keeps monsters hidden', () => {
    const game = createGame(training);
    expect([game.width, game.height]).toEqual([11, 15]);
    expect(game.player).toEqual(p(4, 9));
    expect(game.tiles.filter((tile) => tile.monster).every((tile) => !tile.revealed)).toBe(true);
  });
  it('rejects malformed maps', () => {
    expect(() => createGame('@ .\n.')).toThrow('equal widths');
    expect(() => createGame('@ @')).toThrow('exactly one');
    expect(() => createGame('. .')).toThrow('exactly one');
    expect(() => createGame('@ ?')).toThrow('Unknown map symbol');
  });
  it('sums monster levels, including diagonals, and removes dead monsters from clues', () => {
    const game = createGame('s . b\n. @ .\n. . G');
    expect(numberAt(game, game.player)).toBe(6);
    step(game, p(0, 0));
    expect(numberAt(game, game.player)).toBe(5);
  });
  it('reveals only one ring around a zero and does not chain through neighboring zeros', () => {
    const game = createGame('@ . . .\n. . . .\n. . . s');
    expect(tileAt(game, p(1, 1))?.revealed).toBe(true);
    expect(tileAt(game, p(2, 0))?.revealed).toBe(false);
    step(game, p(1, 0));
    expect(tileAt(game, p(2, 0))?.revealed).toBe(true);
    expect(tileAt(game, p(3, 0))?.revealed).toBe(false);
    expect(tileAt(game, p(3, 2))?.revealed).toBe(false);
  });
  it('floods connected zeros and their numbered border, but stops at clues and monsters', () => {
    const game = createGame('@ . . s . . .\n. . . . . . .\n. . . s . . .', true);
    expect(tileAt(game, p(1, 2))?.revealed).toBe(true);
    expect(tileAt(game, p(2, 1))?.revealed).toBe(true);
    expect(numberAt(game, p(2, 1))).toBe(2);
    expect(tileAt(game, p(3, 1))?.revealed).toBe(false);
    expect(tileAt(game, p(5, 1))?.revealed).toBe(false);
    expect(game.tiles.filter((tile) => tile.monster).every((tile) => !tile.revealed)).toBe(true);
  });
  it('does not flood through walls or water into another area', () => {
    const game = createGame('@ . # .\n. . ~ .\n. . # P', true);
    expect(tileAt(game, p(1, 2))?.revealed).toBe(true);
    expect(tileAt(game, p(3, 2))?.revealed).toBe(false);
  });
  it('can expand existing revealed zeros without moving or collecting a distant shard', () => {
    const game = createGame('@ . . . P');
    setNote(game, p(3, 0), 5);
    setFloodZeros(game, true);
    expect(game.tiles.every((tile) => tile.revealed)).toBe(true);
    expect(tileAt(game, p(3, 0))?.note).toBeUndefined();
    expect(tileAt(game, p(4, 0))?.shards).toBe(2);
    expect(game.player).toEqual(game.start);
    expect(game.shards).toBe(0);
    setFloodZeros(game, false);
    expect(game.tiles.every((tile) => tile.revealed)).toBe(true);
  });
  it('uses one-ring revealing on later steps after flood mode is disabled', () => {
    const game = createGame('@ s . . .', true);
    step(game, p(1, 0));
    setFloodZeros(game, false);
    step(game, p(1, 0));
    expect(tileAt(game, p(2, 0))?.revealed).toBe(true);
    expect(tileAt(game, p(3, 0))?.revealed).toBe(false);
  });
  it('shows walls and water from the start and blocks their corners', () => {
    const game = createGame('@ # .\n~ . .\n. . .');
    expect(tileAt(game, p(1, 0))?.revealed).toBe(true);
    expect(tileAt(game, p(0, 1))?.revealed).toBe(true);
    expect(canStep(game, game.player, p(1, 1))).toBe(false);
    expect(canStep(game, game.player, p(0, 1))).toBe(false);
  });
});

describe('combat and progression', () => {
  it('kills a slime without moving or paying loot, then collects loot exactly once', () => {
    const game = createGame('@ s .');
    expect(step(game, p(1, 0))).toEqual([{ type: 'hit', at: p(1, 0), loot: 1 }]);
    expect(game.player).toEqual(p(0, 0));
    expect(game.health).toBe(12);
    expect(game.coins).toBe(0);
    expect(tileAt(game, p(1, 0))?.monster).toMatchObject({ alive: false, looted: false });
    expect(step(game, p(1, 0))).toEqual([{ type: 'coins', at: p(1, 0), amount: 1 }]);
    step(game, p(0, 0));
    step(game, p(1, 0));
    expect(game.coins).toBe(1);
    expect(tileAt(game, p(1, 0))?.monster?.looted).toBe(true);
  });
  it('needs both shard bundles to defeat the level-3 chief', () => {
    const game = createGame('@ G\nP Q');
    expect(step(game, p(1, 0))).toContainEqual({ type: 'damage', at: p(0, 0), amount: 4 });
    step(game, p(0, 1));
    expect(game.power).toBe(2);
    expect(step(game, p(1, 0))).toContainEqual({ type: 'damage', at: p(0, 1), amount: 4 });
    expect(game.won).toBe(false);
    step(game, p(1, 1));
    expect([game.shards, game.power]).toEqual([5, 3]);
    expect(step(game, p(1, 0))).toContainEqual({ type: 'win' });
    expect(game.won).toBe(true);
    expect(game.health).toBe(4);
    expect(game.player).toEqual(p(1, 1));
  });
  it('ordinary goblins do not end the quest', () => {
    const game = createGame('@ g\nP Q');
    step(game, p(0, 1));
    step(game, p(1, 1));
    expect(step(game, p(1, 0))).toEqual([{ type: 'hit', at: p(1, 0), loot: 3 }]);
    expect(game.won).toBe(false);
  });
  it('inspects a corpse without moving or collecting and restores its sprite after leaving', () => {
    const game = createGame('@ s b');
    expect(inspectCorpse(game, p(1, 0))).toBe(false);
    step(game, p(1, 0));
    const corpse = tileAt(game, p(1, 0));
    expect(inspectCorpse(game, p(1, 0))).toBe(true);
    expect(corpse?.showCorpseClue).toBe(true);
    expect(numberAt(game, p(1, 0))).toBe(2);
    expect(game.player).toEqual(game.start);
    expect(game.coins).toBe(0);
    expect(inspectCorpse(game, p(1, 0))).toBe(false);
    step(game, p(1, 0));
    step(game, p(0, 0));
    expect(corpse?.showCorpseClue).toBeUndefined();
    expect(corpse?.monster).toMatchObject({ kind: 'slime', alive: false, looted: true });
    expect(game.coins).toBe(1);
    expect(inspectCorpse(game, p(1, 0))).toBe(true);
  });
  it('respawns with full hearts, retaining loot, shards, dead monsters, and revealed tiles', () => {
    const game = createGame('@ s P G');
    step(game, p(1, 0));
    step(game, p(1, 0));
    step(game, p(2, 0));
    const goblin = tileAt(game, p(3, 0))?.monster;
    if (!goblin) throw new Error('Missing test goblin');
    goblin.level = 5;
    step(game, p(3, 0));
    step(game, p(3, 0));
    expect(step(game, p(3, 0))).toContainEqual({ type: 'respawn' });
    expect(game.player).toEqual(game.start);
    expect(game.health).toBe(12);
    expect([game.coins, game.shards, game.power]).toEqual([1, 2, 2]);
    expect(tileAt(game, p(1, 0))?.monster?.alive).toBe(false);
    expect(tileAt(game, p(3, 0))?.revealed).toBe(true);
  });
  it('tracks damage in quarter hearts', () => {
    const game = createGame('@ s');
    game.power = 0;
    step(game, p(1, 0));
    expect(game.health).toBe(11);
  });
});

describe('routes and notes', () => {
  it('walks along revealed tiles and leaves the hidden destination for a separate action', () => {
    const game = createGame('@ . . . .');
    expect(planWalk(game, p(4, 0))).toEqual([p(1, 0)]);
    const route = planWalk(game, p(4, 0)) ?? [];
    for (const tile of route) step(game, tile);
    expect(game.player).toEqual(p(1, 0));
    expect(tileAt(game, p(4, 0))?.revealed).toBe(false);
  });
  it('finds a route around walls on revealed ground', () => {
    const game = createGame('@ # .\n. # .\n. . .');
    for (const tile of game.tiles) tile.revealed = true;
    const route = planWalk(game, p(2, 0));
    expect(route).toEqual([p(0, 1), p(0, 2), p(1, 2), p(2, 2), p(2, 1), p(2, 0)]);
  });
  it('does not route through a visible living monster', () => {
    const game = createGame('@ s .');
    for (const tile of game.tiles) tile.revealed = true;
    expect(planWalk(game, p(2, 0))).toBeNull();
  });
  it('returns no route when known ground cannot get closer', () => {
    const game = createGame('@ # .');
    expect(planWalk(game, p(2, 0))).toBeNull();
    expect(planWalk(game, p(1, 0))).toBeNull();
  });
  it('does not use hidden monster locations to choose a route', () => {
    const empty = createGame('@ . . .');
    const monster = createGame('@ . . s');
    expect(planWalk(empty, p(3, 0))).toEqual(planWalk(monster, p(3, 0)));
  });
  it('cycles notes, allows danger and erasing, and refuses notes on revealed tiles', () => {
    const game = createGame('@ . .');
    const target = p(2, 0);
    for (const value of [1, 2, 3, 4, 5, undefined]) {
      cycleNote(game, target);
      expect(tileAt(game, target)?.note).toBe(value);
    }
    setNote(game, target, 'danger');
    expect(tileAt(game, target)?.note).toBe('danger');
    setNote(game, target, undefined);
    setNote(game, game.start, 5);
    expect(tileAt(game, game.start)?.note).toBeUndefined();
  });
  it('notes never block movement and disappear when revealed', () => {
    const game = createGame('@ . . s');
    setNote(game, p(2, 0), 5);
    step(game, p(1, 0));
    step(game, p(2, 0));
    expect(same(game.player, p(2, 0))).toBe(true);
    expect(tileAt(game, p(2, 0))?.note).toBeUndefined();
  });
});
