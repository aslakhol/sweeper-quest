import type { Legend, Point } from './game';
import type { SolverProfile } from './solver';

type PuzzleFixture = {
  name: string;
  lesson: string;
  map: string;
  legend?: Legend;
  target: Point;
  high: Record<SolverProfile, number>;
};

// Small playable examples for authors and soundness tests, not templates for separate world stages.
export const puzzleFixtures: PuzzleFixture[] = [
  {
    name: 'A small clue',
    lesson: 'A neighbour of 1 is free at power 1, including a slime.',
    map: '# # # #\n# @ s #\n# # # #',
    target: { x: 2, y: 1 },
    high: { direct: 1, bounds: 1, groups: 1 },
  },
  {
    name: 'Subtract a visible chief',
    lesson: 'The visible chief contributes 3 to the 4. Only 1 remains for the hidden group.',
    map: '# # # #\n# @ G #\n# s . #\n# # # #',
    target: { x: 1, y: 2 },
    high: { direct: 1, bounds: 1, groups: 1 },
  },
  {
    name: 'Shared group and a free kill',
    lesson: 'a+b=3 and a+b+c=4 prove c=1. Killing c exposes b=2, which then proves a=1.',
    map: '# # # # #\n# s b s #\n# , @ # #\n# # # # #',
    target: { x: 3, y: 1 },
    high: { direct: 3, bounds: 3, groups: 1 },
  },
  {
    name: 'Safe without exact identities',
    lesson: 'Subtracting the shared group leaves c+d=1. Either extra tile is free at power 1.',
    map: '# # # # #\n# s b s #\n# , @ . #\n# # # # #',
    target: { x: 3, y: 2 },
    high: { direct: 3, bounds: 3, groups: 1 },
  },
  {
    name: 'An unresolved frontier',
    lesson: 'A total of 2 across two hidden tiles does not identify a free move at power 1.',
    map: '# # # #\n# b . #\n# @ # #\n# # # #',
    target: { x: 2, y: 1 },
    high: { direct: 2, bounds: 2, groups: 2 },
  },
  {
    name: 'Classic saturation is invalid here',
    lesson: 'Three hidden neighbours beside 3 need not be three slimes. One can be a goblin.',
    map: '# # # # #\n# g . . #\n# # @ # #\n# # # # #',
    target: { x: 1, y: 1 },
    high: { direct: 3, bounds: 3, groups: 3 },
  },
  {
    name: 'Return stronger',
    lesson:
      'The bat is known but costs health at power 1. Power 2 opens the corridor and its find.',
    map: '@ b . +',
    target: { x: 1, y: 0 },
    high: { direct: 2, bounds: 2, groups: 2 },
  },
];
