import type { Legend, Point } from '../game/game';
import cave from './cave.txt?raw';
import elderHouse from './elder-house.txt?raw';
import home from './home.txt?raw';
import inn from './inn.txt?raw';
import village from './village.txt?raw';
import wood from './wood.txt?raw';

export type Area = Legend & { name: string; map: string; bedside?: Point };

const indoors = { floor: 'wood', exits: { '<': { to: 'village', look: 'mat' } } } as const;

export const areas = {
  village: {
    name: 'Village',
    map: village,
    exits: {
      1: { to: 'elder-house', look: 'door' },
      2: { to: 'home', look: 'door' },
      3: { to: 'inn', look: 'door' },
      4: { to: 'wood', look: 'path' },
      '>': { to: 'cave', look: 'stairs' },
    },
  },
  'elder-house': {
    name: "Elder's house",
    map: elderHouse,
    ...indoors,
    people: {
      e: {
        name: 'Elder Maren',
        colors: { hair: '#d8d4c8', shirt: '#5d6e8c' },
        lines: [
          'A visitor! Mind the tall grass west of the fence.',
          'The numbers out there add up the strength of the creatures around them.',
          'A slime counts one, a bat two, a goblin three.',
          'Their chief waits in the far corner, and you are no match for him yet.',
          'Whetstones lie out in the wild. Four would put a real edge on that sword.',
        ],
      },
    },
  },
  home: {
    name: 'Home',
    map: home,
    bedside: { x: 6, y: 2 },
    ...indoors,
    people: {
      m: {
        name: 'Mum',
        colors: { hair: '#8a5a3a', shirt: '#c08a9a' },
        heals: true,
        wakeLines: [
          'You are awake! They carried you back half dead.',
          'Be more careful out there. Please.',
        ],
        lines: [
          'There you are! Sit down, dinner is ready.',
          'Eat up. You need your strength out there.',
        ],
      },
    },
  },
  inn: {
    name: 'Inn',
    map: inn,
    ...indoors,
    people: {
      i: {
        name: 'Hilde',
        colors: { hair: '#b0603a', shirt: '#6a8a5a' },
        lines: [
          'Welcome to the inn.',
          'Goblins and bats crowd around whatever they are hiding.',
          'If the numbers climb around an empty spot, it is worth a look.',
        ],
      },
      p: {
        name: 'Pip',
        colors: { hair: '#e0c070', shirt: '#b05a5a' },
        lines: [
          'I went down the cave stairs once!',
          'There was a goblin with a crown. I ran straight back up.',
          'The stairs are right where you arrive. Just step on them again.',
        ],
      },
    },
  },
  cave: {
    name: 'Cave',
    map: cave,
    floor: 'cave',
    exits: { '<': { to: 'village', look: 'stairs' } },
  },
  wood: {
    name: 'Wood',
    map: wood,
    exits: { '<': { to: 'village', look: 'path' } },
  },
} satisfies Record<string, Area>;
