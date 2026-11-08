import { describe, expect, it } from 'vitest';
import { createGame, step, tileAt } from './game';
import { puzzleFixtures } from './puzzle-fixtures';
import {
  deduce,
  explain,
  measureLayers,
  type Observation,
  observe,
  reachableTiles,
  solverProfiles,
} from './solver';

const person = { name: 'Guide', lines: [], colors: { hair: '', shirt: '' } };

describe('deduction profiles', () => {
  it.each(puzzleFixtures)('$name', (fixture) => {
    const game = createGame(fixture.map, { legend: fixture.legend });
    const id = fixture.target.y * game.width + fixture.target.x;
    for (const profile of solverProfiles) {
      const result = deduce(observe(game), profile);
      expect(result.bounds.get(id)?.high).toBe(fixture.high[profile]);
      for (const proof of result.deductions)
        expect(proof.parents.every((parent) => parent < proof.id)).toBe(true);
    }
  });

  it('explains the shared group and recomputes clues after the free kill', () => {
    const game = createGame(puzzleFixtures[2].map);
    const result = deduce(observe(game), 'groups');
    expect(explain(result, 8)).toContainEqual(
      expect.objectContaining({ rule: 'subset', target: 8, low: 1, high: 1, clues: [11, 12] }),
    );
    step(game, { x: 3, y: 1 });
    expect(game.hero.health).toBe(3);
    expect(observe(game).clues.find((clue) => clue.at === 12)?.value).toBe(3);
    const after = deduce(observe(game), 'bounds');
    expect(after.bounds.get(6)).toMatchObject({ low: 1, high: 1 });
    expect(after.bounds.get(7)).toMatchObject({ low: 2, high: 2 });
  });

  it('cannot distinguish hidden arrangements, finds or notes with identical visible evidence', () => {
    const first = createGame(puzzleFixtures[2].map);
    const second = createGame(puzzleFixtures[2].map.replace('s b s', 'b s s'));
    const hidden = tileAt(second, { x: 1, y: 1 });
    if (!hidden) throw new Error('Missing fixture tile.');
    hidden.find = 'whetstone';
    hidden.note = 3;
    expect(observe(first)).toEqual(observe(second));
    expect(deduce(observe(first), 'groups')).toEqual(deduce(observe(second), 'groups'));
  });

  it('neither reads clues underneath people nor walks through them', () => {
    const game = createGame('@ p , s', { legend: { people: { p: person } } });
    expect(observe(game).clues.map((clue) => clue.at)).not.toContain(1);
    expect(reachableTiles(game).map((tile) => tile.x)).toEqual([0]);
    // The only number adjacent to this monster is hidden underneath the person.
    const hiddenClue = createGame('@ p s', { legend: { people: { p: person } } });
    expect(deduce(observe(hiddenClue), 'groups').bounds.get(2)?.high).toBe(3);
  });

  it('uses an exposed monster level but never its covered clue', () => {
    const game = createGame('@ b s');
    step(game, { x: 1, y: 0 });
    const observation = observe(game);
    expect(observation.clues.map((clue) => clue.at)).toEqual([0]);
    expect(observation.clues[0]).toMatchObject({ value: 2, sum: 0, cells: [] });
    expect(deduce(observation, 'groups').bounds.get(2)?.high).toBe(3);
    expect(reachableTiles(game).map((tile) => tile.x)).toEqual([0]);
    const layers = measureLayers(game, 2, 'groups');
    expect(layers.reachable.get(game.tiles[2])).toBe(2);
  });

  it('separates visibility from movement when a flood crosses a blocked diagonal', () => {
    const game = createGame('@ #\n# +');
    const find = game.tiles[3];
    const layers = measureLayers(game, 2, 'groups');
    expect(layers.revealed.get(find)).toBe(1);
    expect(layers.reachable.has(find)).toBe(false);
    expect(find.find).toBe('heartPiece');
  });

  it('preserves a partly blocked region until a conditional power increase', () => {
    const game = createGame(puzzleFixtures[6].map);
    const layers = measureLayers(game, 2, 'groups');
    expect(layers.reachable.get(game.tiles[0])).toBe(1);
    expect(layers.reachable.get(game.tiles[3])).toBe(2);
    expect(game.tiles[1].monster?.alive).toBe(false);
  });

  it('distinguishes a remote first reveal from stepping onto a hidden tile at the same power', () => {
    const flooded = createGame('@ s .');
    const floodLayers = measureLayers(flooded, 1);
    expect(floodLayers.revealedFromElsewhere.get(flooded.tiles[2])).toBe(1);
    expect(floodLayers.revealedFromElsewhere.has(flooded.tiles[1])).toBe(false);

    const direct = createGame('@ .\ns #');
    const directLayers = measureLayers(direct, 1);
    expect(directLayers.revealed.get(direct.tiles[1])).toBe(1);
    expect(directLayers.reachable.get(direct.tiles[1])).toBe(1);
    // A later kill floods this area, but cannot change how this tile was first revealed.
    expect(directLayers.revealedFromElsewhere.has(direct.tiles[1])).toBe(false);
  });

  it('rejects contradictory evidence instead of treating an impossible bound as safe', () => {
    const observation: Observation = {
      hidden: [0, 1],
      maxLevel: 3,
      clues: [
        { at: 2, value: 3, known: [], cells: [0, 1], sum: 3 },
        { at: 3, value: 2, known: [], cells: [0, 1], sum: 2 },
      ],
    };
    expect(() => deduce(observation, 'groups')).toThrow('Contradictory');
    expect(() => deduce({ ...observation, maxLevel: 0 })).toThrow('monster cap');
  });

  it('keeps every possible assignment inside its bounds on exhaustive small constraint systems', () => {
    const models: number[][] = [];
    for (let a = 0; a <= 3; a++)
      for (let b = 0; b <= 3; b++)
        for (let c = 0; c <= 3; c++) for (let d = 0; d <= 3; d++) models.push([a, b, c, d]);
    for (const neighborhoods of [
      [
        [0, 1],
        [0, 1, 2, 3],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 2],
        [0, 2],
      ],
      [[0], [0, 1, 2], [1, 2, 3]],
    ]) {
      const groups = new Map<string, number[][]>();
      for (const values of models) {
        const key = neighborhoods
          .map((cells) => cells.reduce((sum, id) => sum + values[id], 0))
          .join(',');
        const group = groups.get(key) ?? [];
        group.push(values);
        groups.set(key, group);
      }
      for (const [key, possible] of groups) {
        const sums = key.split(',').map(Number);
        const observation: Observation = {
          hidden: [0, 1, 2, 3],
          maxLevel: 3,
          clues: neighborhoods.map((cells, index) => ({
            at: 4 + index,
            value: sums[index],
            known: [],
            cells,
            sum: sums[index],
          })),
        };
        for (const profile of solverProfiles) {
          const result = deduce(observation, profile);
          for (const values of possible)
            for (const [id, bound] of result.bounds) {
              expect(bound.low).toBeLessThanOrEqual(values[id]);
              expect(bound.high).toBeGreaterThanOrEqual(values[id]);
            }
        }
      }
    }
  });
});
