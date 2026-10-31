import type { Legend } from '../game/game';
import elderHouse from './elder-house.txt?raw';
import home from './home.txt?raw';
import inn from './inn.txt?raw';
import village from './village.txt?raw';

// An area with several maps picks one at random and starts it fresh on every visit.
export type Area = Legend & { name: string } & ({ map: string } | { maps: string[] });
// Generated dungeon floors.
const files = import.meta.glob<string>('./dungeon-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
export const dungeons = Object.keys(files)
  .sort()
  .map((path) => files[path]);

const indoors = { floor: 'wood', exits: { '<': { to: 'village', look: 'mat' } } } as const;

export const areas = {
  village: {
    name: 'Village',
    map: village,
    exits: {
      1: { to: 'elder-house', look: 'door' },
      2: { to: 'home', look: 'door' },
      3: { to: 'inn', look: 'door' },
      '>': { to: 'dungeon', look: 'stairs' },
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
          'Their chief waits in the far corner. Grow strong before you face him.',
        ],
      },
    },
  },
  home: {
    name: 'Home',
    map: home,
    ...indoors,
    people: {
      m: {
        name: 'Mum',
        colors: { hair: '#8a5a3a', shirt: '#c08a9a' },
        heals: true,
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
          'The cave north of the village? It is different every time you climb down.',
          'Nobody can explain it. Most stop asking.',
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
  dungeon: {
    name: 'Dungeon',
    maps: dungeons,
    floor: 'cave',
    exits: { '<': { to: 'village', look: 'stairs' } },
  },
} satisfies Record<string, Area>;
