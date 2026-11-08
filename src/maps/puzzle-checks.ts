import type { MapObjective } from '../game/map-check';

// Facts about the current prototype, not reward quotas for future regions. Update this list with
// Aslak's agreed world changes. Quests/shops must be earned through their real rules when added.
// Coordinates are zero-based. Optional finds deliberately need no entry here.
export const mapObjectives = [
  { name: 'Earn power 3 to challenge the chiefs', kind: 'power', power: 3 },
  { name: 'Defeat the meadow chief', kind: 'defeated', area: 'village', at: { x: 3, y: 4 } },
  { name: 'Defeat the cave chief', kind: 'defeated', area: 'cave', at: { x: 7, y: 1 } },
] satisfies MapObjective[];
