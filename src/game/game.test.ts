import { describe, expect, it } from 'vitest';
import { areas } from '../maps';
import {
  answer,
  buy,
  canStep,
  collect,
  createGame,
  createHero,
  cycleNote,
  heal,
  numberAt,
  planWalk,
  same,
  setNote,
  step,
  tileAt,
  toggleNote,
} from './game';

const p = (x: number, y: number) => ({ x, y });
const armed = () => ({ ...createHero(), sword: true, power: 1 });
const sturdy = () => ({ ...armed(), health: 10, maxHealth: 10 });

describe('map and clues', () => {
  it('loads a map and keeps its monsters hidden', () => {
    const game = createGame(areas.cave.map, { legend: areas.cave, from: 'village' });
    expect([game.width, game.height]).toEqual([15, 17]);
    expect(game.player).toEqual(p(7, 16));
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
    const game = createGame('s . b\n. @ .\n. . G', { hero: armed() });
    expect(numberAt(game, p(1, 1))).toBe(6);
    step(game, p(0, 0));
    expect(numberAt(game, p(1, 1))).toBe(5);
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
  it('expands a revealed clue that becomes zero after a kill, even if the fought tile is nonzero', () => {
    const game = createGame(
      `
      # # # # # #
      # . . s . #
      # @ s . . #
      # . . . . #
      # # # # # #
    `,
      { hero: armed() },
    );
    expect(numberAt(game, game.start)).toBe(1);
    expect(tileAt(game, p(1, 1))?.revealed).toBe(false);
    setNote(game, p(1, 1), 'danger');

    step(game, p(2, 2));

    expect(numberAt(game, game.player)).toBe(1);
    expect(numberAt(game, game.start)).toBe(0);
    expect(tileAt(game, p(1, 1))?.revealed).toBe(true);
    expect(tileAt(game, p(1, 1))?.note).toBeUndefined();
    expect(tileAt(game, p(3, 1))).toMatchObject({ revealed: false, monster: { alive: true } });
  });
  it('does not expand from a visible living monster after a neighboring kill', () => {
    const game = createGame('@ s G . .', { hero: armed() });
    step(game, p(1, 0));
    expect(numberAt(game, p(2, 0))).toBe(0);
    expect(tileAt(game, p(3, 0))?.revealed).toBe(false);
  });
  it('steps diagonally past one obstacle but not between two', () => {
    expect(canStep(createGame('@ T\n, ,'), p(0, 0), p(1, 1))).toBe(true);
    expect(canStep(createGame('@ T\nT ,'), p(0, 0), p(1, 1))).toBe(false);
  });
  it('shows walls and water from the start and blocks squeezing between them', () => {
    const game = createGame('@ # .\n~ . .\n. . .');
    expect(tileAt(game, p(1, 0))?.revealed).toBe(true);
    expect(tileAt(game, p(0, 1))?.revealed).toBe(true);
    expect(canStep(game, game.player, p(1, 1))).toBe(false);
    expect(canStep(game, game.player, p(0, 1))).toBe(false);
  });
  it('starts village ground revealed and blocks buildings, trees and fences', () => {
    const game = createGame(', = . s\nT ^ H D\n@ F . .');
    expect(game.tiles.filter((tile) => !tile.revealed).map((tile) => [tile.x, tile.y])).toEqual([
      [2, 0],
      [3, 0],
      [2, 2],
      [3, 2],
    ]);
    expect(game.tiles.filter((tile) => tile.terrain === 'wall')).toHaveLength(5);
  });
});

describe('combat and progression', () => {
  it('kills an equal or weaker monster for free and steps onto its tile', () => {
    const game = createGame('@ s .', { hero: armed() });
    const [fight] = step(game, p(1, 0));
    expect(fight).toMatchObject({ type: 'fight', from: p(0, 0), at: p(1, 0), damage: 0 });
    expect(game.player).toEqual(p(1, 0));
    expect(game.hero.health).toBe(3);
    expect(tileAt(game, p(1, 0))?.monster?.alive).toBe(false);
  });
  it('reveals a stronger monster without killing, entering, flooding or changing clues', () => {
    const game = createGame('@ g . +', { hero: sturdy() });
    setNote(game, p(1, 0), 2);
    expect(step(game, p(1, 0))).toMatchObject([{ type: 'fight', damage: 6 }]);
    expect(game.hero.health).toBe(4);
    expect(game.player).toEqual(p(0, 0));
    expect(tileAt(game, p(1, 0))).toMatchObject({ revealed: true, monster: { alive: true } });
    expect(tileAt(game, p(1, 0))?.note).toBeUndefined();
    expect(numberAt(game, game.start)).toBe(3);
    expect(tileAt(game, p(2, 0))?.revealed).toBe(false);
    expect(tileAt(game, p(3, 0))?.find).toBe('heartPiece');

    const revealed = structuredClone(game);
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(step(game, p(1, 0))).toEqual([{ type: 'blocked', at: p(1, 0) }]);
      expect(game).toEqual(revealed);
    }

    game.hero.power = 3;
    expect(step(game, p(1, 0))).toMatchObject([{ type: 'fight', damage: 0 }]);
    expect(game.player).toEqual(p(1, 0));
    expect(tileAt(game, p(1, 0))?.monster?.alive).toBe(false);
    expect(tileAt(game, p(3, 0))?.revealed).toBe(true);
  });
  it('ends the run when a fight takes the last heart', () => {
    const game = createGame('@ g\ng .', { hero: sturdy() });
    step(game, p(1, 0));
    expect(step(game, p(0, 1))).toMatchObject([{ type: 'fight', damage: 6 }, { type: 'death' }]);
    expect([game.hero.health, game.lost]).toEqual([0, true]);
    expect(game.player).toEqual(p(0, 0));
    expect(tileAt(game, p(0, 1))?.monster?.alive).toBe(true);
    expect(step(game, p(0, 0))).toEqual([]);
  });
  it('shows the chief from the start and wins when it falls', () => {
    const game = createGame('@ g G', { hero: sturdy() });
    expect(tileAt(game, p(2, 0))?.revealed).toBe(true);
    game.hero.power = 3;
    step(game, p(1, 0));
    expect(game.won).toBe(false);
    expect(step(game, p(2, 0))).toMatchObject([
      { type: 'fight', damage: 0 },
      { type: 'win' },
      { type: 'find', find: 'heart' },
    ]);
    expect(game.won).toBe(true);
  });
  it('gives nothing for a kill', () => {
    const game = createGame('@ s .', { hero: armed() });
    step(game, p(1, 0));
    expect(game.hero).toEqual(armed());
  });
  it('starts at power 0 without a sword, so even a slime hurts', () => {
    const game = createGame('@ s');
    expect(game.hero.power).toBe(0);
    expect(step(game, p(1, 0))).toMatchObject([{ type: 'fight', damage: 1 }]);
  });
  it('adds the sword to the power from whetstones', () => {
    const hero = { ...createHero(), whetstones: 5, power: 1 };
    const game = createGame('@', { hero });
    expect(collect(game, p(0, 0), 'sword')).toContainEqual({
      type: 'powerUp',
      at: p(0, 0),
      power: 2,
    });
    expect(hero.sword).toBe(true);
  });
  it('raises power on the fourth whetstone, wherever you are', () => {
    const game = createGame('@ * * * * s', { hero: armed() });
    for (let x = 1; x <= 3; x++) step(game, p(x, 0));
    expect([game.hero.whetstones, game.hero.power]).toEqual([3, 1]);
    expect(step(game, p(4, 0))).toEqual([
      { type: 'find', at: p(4, 0), find: 'whetstone' },
      { type: 'powerUp', at: p(4, 0), power: 2 },
    ]);
    expect(tileAt(game, p(4, 0))?.find).toBeUndefined();
    expect(step(game, p(3, 0))).toEqual([]);
  });
  it('adds a filled heart on the fourth heart piece', () => {
    const game = createGame('@ + + + +');
    game.hero.health = 1;
    for (let x = 1; x <= 3; x++) step(game, p(x, 0));
    expect(game.hero.health).toBe(1);
    expect(step(game, p(4, 0))).toContainEqual({ type: 'heartUp', at: p(4, 0), maxHealth: 4 });
    expect([game.hero.health, game.hero.maxHealth]).toEqual([4, 4]);
  });
  it('keeps pieces towards the next upgrade when a chief drops a whole one', () => {
    const hero = { ...sturdy(), power: 3, whetstones: 11 };
    const game = createGame('@ C', { hero });
    expect(step(game, p(1, 0))).toContainEqual({ type: 'powerUp', at: p(1, 0), power: 4 });
    expect([hero.power, hero.whetstones % 4]).toEqual([4, 3]);
  });
  it('blocks a visible chief without damage or rewards until the hero is strong enough', () => {
    const game = createGame('@ C', { hero: { ...sturdy(), power: 2, whetstones: 7 } });
    const before = structuredClone(game);
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(step(game, p(1, 0))).toEqual([{ type: 'blocked', at: p(1, 0) }]);
      expect(game).toEqual(before);
    }
    game.hero.power = 3;
    expect(step(game, p(1, 0))).toContainEqual({ type: 'win' });
    expect(game.hero.whetstones).toBe(11);
  });
  it('hides a find until it is revealed and leaves clues alone', () => {
    const game = createGame('@ . *');
    expect(tileAt(game, p(2, 0))?.revealed).toBe(true);
    expect(numberAt(game, p(1, 0))).toBe(0);
    const hidden = createGame('@ s *');
    expect(tileAt(hidden, p(2, 0))?.revealed).toBe(false);
  });
});

describe('training', () => {
  const legend = {
    people: {
      d: {
        name: 'Teacher',
        colors: { hair: '', shirt: '' },
        lines: ['Will you help?'],
        training: {
          question: 'Yes?',
          accepted: ['Good.'],
          declined: ['Pity.'],
          lessons: [{ area: 'yard', lines: ['In you go.'] }],
          after: ['Go.'],
          graduation: { quest: 'Win.', chiefs: 2, lines: ['Well done.'], after: ['Bachelor.'] },
        },
      },
    },
  };
  it('asks for help, hands over a sword on a yes, and teaches each lesson in turn', () => {
    const game = createGame('@ d', { legend });
    const [, ask] = step(game, p(1, 0));
    expect(ask).toMatchObject({ type: 'ask', at: p(1, 0), question: 'Yes?' });
    if (ask.type !== 'ask') throw new Error('Expected a question.');
    expect(answer(game, ask.at, ask.person, false)).toMatchObject([{ lines: ['Pity.'] }]);
    expect(game.hero.sword).toBe(false);
    expect(answer(game, ask.at, ask.person, true)).toMatchObject([
      { type: 'talk', lines: ['Good.'] },
      { type: 'find', find: 'sword' },
      { type: 'powerUp', power: 1 },
      { type: 'talk', lines: ['In you go.'] },
      { type: 'lesson', area: 'yard' },
    ]);
    expect(answer(game, ask.at, ask.person, true)).toEqual([]);
    game.hero.lessons = 1;
    expect(step(game, p(1, 0))).toMatchObject([{ type: 'talk', lines: ['Go.'] }]);
  });
  it('awards a Bachelor of Fighting once, after every chief is defeated', () => {
    const hero = { ...createHero(), sword: true, power: 3, lessons: 1, chiefs: 1 };
    const game = createGame('@ d\nG ,', { legend, hero });
    step(game, p(0, 1));
    expect(hero.chiefs).toBe(2);
    game.player = p(1, 1);
    expect(step(game, p(1, 0))).toMatchObject([
      { type: 'talk', lines: ['Well done.'] },
      { type: 'find', find: 'diploma' },
      { type: 'complete' },
    ]);
    expect(hero.diploma).toBe(true);
    expect(step(game, p(1, 0))).toMatchObject([{ type: 'talk', lines: ['Bachelor.'] }]);
  });
});

describe('routes and notes', () => {
  it('walks to a hidden target that borders known ground and steps into it', () => {
    const game = createGame('@ . s .', { hero: armed() });
    expect(tileAt(game, p(2, 0))?.revealed).toBe(false);
    const route = planWalk(game, p(2, 0));
    expect(route).toEqual([p(1, 0), p(2, 0)]);
    for (const tile of route ?? []) step(game, tile);
    expect(game.player).toEqual(p(2, 0));
  });
  it('stops on known ground short of a hidden target that borders no known ground', () => {
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
    expect(route).toEqual([p(0, 1), p(1, 2), p(2, 1), p(2, 0)]);
  });
  it('travels when stepping onto an exit, but never walks across one', () => {
    const legend = { exits: { '>': { to: 'cave', look: 'mat' } } } as const;
    const game = createGame('@ > ,\n, , ,', { legend });
    expect(planWalk(game, p(2, 0))).toEqual([p(1, 1), p(2, 0)]);
    expect(step(game, p(1, 0))).toEqual([{ type: 'travel', to: 'cave' }]);
    expect(game.player).toEqual(p(1, 0));
  });
  it('talks to a person instead of stepping onto them, walking up to them first', () => {
    const person = { name: 'Ada', lines: ['Hi'], colors: { hair: '#000', shirt: '#fff' } };
    const game = createGame('@ , , a', { legend: { people: { a: person } } });
    expect(planWalk(game, p(3, 0))).toEqual([p(1, 0), p(2, 0), p(3, 0)]);
    game.player = p(2, 0);
    expect(step(game, p(3, 0))).toEqual([{ type: 'talk', person, lines: ['Hi'] }]);
    expect(game.player).toEqual(p(2, 0));
  });
  it('rewards bringing a person what they lost, once', () => {
    const pip = {
      name: 'Pip',
      lines: ['Find my marble?'],
      colors: { hair: '#000', shirt: '#fff' },
      quest: { wants: 'marble', reward: 'whetstone', thanks: ['Thanks!'], after: ['Hi again'] },
    } as const;
    const game = createGame('p @ ?', { legend: { people: { p: pip }, finds: { '?': 'marble' } } });
    expect(step(game, p(0, 0))).toEqual([{ type: 'talk', person: pip, lines: pip.lines }]);
    expect(game.hero.asked).toEqual(['marble']);
    expect(step(game, p(2, 0))).toEqual([{ type: 'find', at: p(2, 0), find: 'marble' }]);
    expect(game.hero.carrying).toEqual(['marble']);
    game.player = p(1, 0);
    expect(step(game, p(0, 0))).toEqual([
      { type: 'talk', person: pip, lines: ['Thanks!'] },
      { type: 'find', at: p(0, 0), find: 'whetstone' },
    ]);
    expect(game.hero).toMatchObject({ whetstones: 1, carrying: [], returned: ['marble'] });
    expect(step(game, p(0, 0))).toEqual([{ type: 'talk', person: pip, lines: ['Hi again'] }]);
    expect(game.hero.whetstones).toBe(1);
  });
  it('offers a find for sale when walking up to it, and sells it once for coins', () => {
    const wares = { w: { find: 'whetstone', price: 5 } } as const;
    const game = createGame('w @ , $', { legend: { wares } });
    game.hero.coins = 4;
    expect(planWalk(game, p(0, 0))).toEqual([p(0, 0)]);
    const offer = { type: 'offer', at: p(0, 0), find: 'whetstone', price: 5 };
    expect(step(game, p(0, 0))).toEqual([offer]);
    expect(buy(game, p(0, 0))).toEqual([]);
    step(game, p(2, 0));
    step(game, p(3, 0));
    game.player = p(1, 0);
    expect(buy(game, p(0, 0))).toEqual([{ type: 'find', at: p(0, 0), find: 'whetstone' }]);
    expect(game.hero).toMatchObject({ coins: 0, whetstones: 1 });
    expect(step(game, p(0, 0))).toEqual([]);
  });
  it('restores every heart only once the conversation is over, then has nothing to heal', () => {
    const mum = {
      name: 'Mum',
      lines: ['Eat up'],
      colors: { hair: '#000', shirt: '#fff' },
      heals: true,
      fullHealthLines: ['Not a scratch'],
    };
    const game = createGame('@ m', { legend: { people: { m: mum } } });
    game.hero.health = 1;
    expect(step(game, p(1, 0))).toEqual([{ type: 'talk', person: mum, lines: ['Eat up'] }]);
    expect(game.hero.health).toBe(1);
    expect(heal(game)).toEqual([{ type: 'heal', at: p(0, 0), amount: 2 }]);
    expect(game.hero.health).toBe(3);
    expect(heal(game)).toEqual([]);
    expect(step(game, p(1, 0))).toEqual([{ type: 'talk', person: mum, lines: ['Not a scratch'] }]);
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
  it('removes a note placed twice and replaces it with a different one', () => {
    const game = createGame('@ s .');
    const target = p(2, 0);
    toggleNote(game, target, 2);
    toggleNote(game, target, 3);
    expect(tileAt(game, target)?.note).toBe(3);
    toggleNote(game, target, 3);
    expect(tileAt(game, target)?.note).toBeUndefined();
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
