import type { Legend } from '../game/game';
import elderHouse from './elder-house.txt?raw';
import inn from './inn.txt?raw';
import smithy from './smithy.txt?raw';
import village from './village.txt?raw';

export type Area = Legend & { name: string; map: string };
const backToVillage = { '<': { to: 'village', look: 'mat' } } as const;

export const areas = {
  village: {
    name: 'Village',
    map: village,
    exits: {
      1: { to: 'elder-house', look: 'door' },
      2: { to: 'smithy', look: 'door' },
      3: { to: 'inn', look: 'door' },
    },
  },
  'elder-house': { name: "Elder's house", map: elderHouse, exits: backToVillage },
  smithy: { name: 'Smithy', map: smithy, exits: backToVillage },
  inn: { name: 'Inn', map: inn, exits: backToVillage },
} satisfies Record<string, Area>;

// Generated dungeon floors; each trip down picks one.
const files = import.meta.glob<string>('./dungeon-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
export const dungeons = Object.keys(files)
  .sort()
  .map((path) => files[path]);
