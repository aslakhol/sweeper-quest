import { describe, expect, it } from 'vitest';
import { maps } from '../maps';
import {
  canStep,
  createGame,
  cycleNote,
  numberAt,
  planWalk,
  same,
  setNote,
  step,
  tileAt,
} from './game';

const p = (x: number, y: number) => ({ x, y });

describe('map and clues', () => {
  it('loads the first clearing and keeps monsters hidden', () => {
    const game = createGame(maps[0]);
    expect([game.width, game.height]).toEqual([11, 15]);
    expect(game.player).toEqual(p(5, 12));
    const monsters = game.tiles.filter((tile) => tile.monster);
    expect(monsters.filter((tile) => tile.revealed).map((tile) => tile.monster?.goal)).toEqual([
      true,
    ]);
  });
  it('rejects malformed maps', () => {
    expect(() => createGame('@ .\n.')).toThrow('equal widths');
    expect(() => createGame('@ @')).toThrow('exactly one');
    expect(() => createGame('. .')).toThrow('exactly one');
    expect(() => createGame('@ ?')).toThrow('Unknown map symbol');
  });
  it('sums monster levels, including diagonals, and removes dead monsters from clues', () => {
    const game = createGame('s . b\n. @ .\n. . G');
    expect(numberAt(game, p(1, 1))).toBe(7);
    step(game, p(0, 0));
    expect(numberAt(game, p(1, 1))).toBe(6);
  });
  it('floods connected zeros and their numbered border, but stops at clues and monsters', () => {
    const game = createGame('@ . . s . . .\n. . . . . . .\n. . . s . . .');
    expect(tileAt(game, p(1, 2))?.revealed).toBe(true);
    expect(tileAt(game, p(2, 1))?.revealed).toBe(true);
    expect(numberAt(game, p(2, 1))).toBe(2);
    expect(tileAt(game, p(3, 1))?.revealed).toBe(false);
    expect(tileAt(game, p(5, 1))?.revealed).toBe(false);
    expect(game.tiles.filter((tile) => tile.monster).every((tile) => !tile.revealed)).toBe(true);
  });
  it('does not flood through walls or water into another area', () => {
    const game = createGame('@ . # .\n. . ~ .\n. . # .');
    expect(tileAt(game, p(1, 2))?.revealed).toBe(true);
    expect(tileAt(game, p(3, 2))?.revealed).toBe(false);
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
  it('kills an equal or weaker monster for free and steps onto its tile', () => {
    const game = createGame('@ s .');
    const [fight] = step(game, p(1, 0));
    expect(fight).toMatchObject({ type: 'fight', from: p(0, 0), at: p(1, 0), damage: 0 });
    expect(game.player).toEqual(p(1, 0));
    expect(game.health).toBe(10);
    expect(tileAt(game, p(1, 0))?.monster?.alive).toBe(false);
  });
  it('kills a stronger monster at the cost of its level times the gap', () => {
    const game = createGame('@ g .');
    expect(step(game, p(1, 0))).toMatchObject([{ type: 'fight', damage: 6 }]);
    expect(game.health).toBe(4);
    expect(game.player).toEqual(p(1, 0));
    expect(tileAt(game, p(1, 0))?.monster?.alive).toBe(false);
  });
  it('ends the run when a fight takes the last heart', () => {
    const game = createGame('@ g g');
    step(game, p(1, 0));
    expect(step(game, p(2, 0))).toMatchObject([{ type: 'fight', damage: 6 }, { type: 'death' }]);
    expect([game.health, game.lost]).toEqual([0, true]);
    expect(game.player).toEqual(p(1, 0));
    expect(tileAt(game, p(2, 0))?.monster?.alive).toBe(true);
    expect(step(game, p(0, 0))).toEqual([]);
  });
  it('shows the level-4 chief from the start and wins when it falls', () => {
    const game = createGame('@ g G');
    expect(tileAt(game, p(2, 0))?.revealed).toBe(true);
    game.power = 3;
    step(game, p(1, 0));
    expect(game.won).toBe(false);
    expect(step(game, p(2, 0))).toMatchObject([{ type: 'fight', damage: 4 }, { type: 'win' }]);
    expect(game.won).toBe(true);
  });
  it('earns XP equal to monster level and raises power at the thresholds', () => {
    const game = createGame(`@ ${'s '.repeat(9)}b . . . . . . . . . . . . . . .`);
    for (let x = 1; x <= 9; x++) step(game, p(x, 0));
    expect([game.xp, game.power]).toEqual([9, 1]);
    expect(step(game, p(10, 0))).toContainEqual({ type: 'levelUp', at: p(10, 0), power: 2 });
    expect([game.xp, game.power, game.health]).toEqual([11, 2, 8]);
  });
});

describe('routes and notes', () => {
  it('walks along revealed tiles and leaves the hidden destination for a separate action', () => {
    const game = createGame('@ . s . .');
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
    const empty = createGame('@ . s . . .');
    const monster = createGame('@ . s . . s');
    expect(planWalk(empty, p(5, 0))).toEqual(planWalk(monster, p(5, 0)));
  });
  it('cycles notes, allows danger and erasing, and refuses notes on revealed tiles', () => {
    const game = createGame('@ s .');
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
