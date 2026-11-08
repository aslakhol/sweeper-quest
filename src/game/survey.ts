import {
  canStep,
  canTrade,
  type Game,
  type GameEvent,
  heal,
  neighbors,
  type Point,
  planWalk,
  same,
  step,
  type Tile,
  tileAt,
} from './game';
import {
  type Clue,
  type Deduction,
  deduce,
  explain,
  observe,
  reachableTiles,
  type SolverProfile,
} from './solver';
import { type AreaId, createWorld, travel, type World } from './world';

export type MoveOrder = 'forward' | 'reverse';
export type Access = {
  area: AreaId;
  at: Point;
  revealed?: number;
  reachable?: number;
  collected?: number;
  defeated?: number;
};
export type SurveyAction = {
  area: AreaId;
  at: Point;
  kind: 'deduction' | 'collect' | 'trade' | 'fight' | 'heal' | 'travel' | 'walk';
  power: number;
  health: number;
  revealed: number;
  events: GameEvent[];
  proof?: { upper: number; maxLevel: number; clues: Clue[]; deductions: Deduction[] };
};
export type SurveyOptions = {
  profile: SolverProfile;
  order?: MoveOrder;
  // Restrict destinations for checks such as "the village cannot supply the next upgrade alone".
  destinations?: readonly AreaId[];
};
const point = ({ x, y }: Point): Point => ({ x, y });
const accessKey = (area: AreaId, at: Point) => `${area}:${at.x},${at.y}`;
const revealedCount = (game: Game) =>
  game.tiles.filter((tile) => tile.terrain === 'floor' && tile.revealed).length;

function exitsFrom(game: Game) {
  const reached = reachableTiles(game);
  return game.tiles.filter(
    (tile) => tile.exit && reached.some((from) => canStep(game, from, tile)),
  );
}
function regionKey(area: AreaId, game: Game) {
  // An arrival on an exit may offer two sides that cannot be crossed without leaving the map.
  // A single representative tile would conflate that choice with having explored just one side.
  const reached = reachableTiles(game)
    .map((tile) => tile.y * game.width + tile.x)
    .sort((a, b) => a - b);
  return `${area}:${reached.join(',')}`;
}
// Progress includes evidence and rewards, not just hero stats: exploring a second entrance can
// make a previous frontier solvable without changing power. Walking alone does not reset surveys.
function progressKey(world: World) {
  return JSON.stringify([
    world.game.hero,
    [...world.visited].map(([area, game]) => [
      area,
      revealedCount(game),
      game.tiles.filter((tile) => tile.revealed && tile.monster && !tile.monster.alive).length,
    ]),
  ]);
}

// Find an actual route over known floor and discovered exits to an unsurveyed connected component.
// Separate components of the same map remain distinct; entering one never grants access to another.
function nextRoute(world: World, surveyed: Set<string>, options: SurveyOptions) {
  type Hop = { at: Point; to: string };
  const queue: { area: AreaId; game: Game; route: Hop[] }[] = [
    { area: world.area, game: world.game, route: [] },
  ];
  const seen = new Set<string>();
  for (const node of queue) {
    const key = regionKey(node.area, node.game);
    if (seen.has(key)) continue;
    seen.add(key);
    if (node.route.length && !surveyed.has(key)) return node.route;
    const exits = exitsFrom(node.game);
    if (options.order === 'reverse') exits.reverse();
    for (const exit of exits) {
      const to = exit.exit;
      if (!to || (options.destinations && !options.destinations.some((id) => id === to))) continue;
      const route = [...node.route, { at: point(exit), to }];
      const destination = [...world.visited].find(([id]) => id === to);
      if (!destination) return route;
      const [area, game] = destination;
      const entry = game.tiles.find((tile) => tile.exit === node.area);
      if (!entry) throw new Error(`Missing return exit from ${area} to ${node.area}.`);
      queue.push({ area, game: { ...game, player: point(entry) }, route });
    }
  }
  return undefined;
}

export function surveyWorld(options: SurveyOptions, world = createWorld()) {
  const actions: SurveyAction[] = [];
  const access = new Map<string, Access>();
  const visits: {
    area: AreaId;
    powerOnEntry: number;
    powerOnExit: number;
    revealedBefore: number;
    revealedAfter: number;
    reachableBefore: number;
    reachableAfter: number;
    collected: number;
  }[] = [];
  const ordered = <T>(items: T[]) => (options.order === 'reverse' ? items.reverse() : items);
  function getAccess(area: AreaId, at: Point) {
    const key = accessKey(area, at);
    let entry = access.get(key);
    if (!entry) {
      entry = { area, at: point(at) };
      access.set(key, entry);
    }
    return entry;
  }
  function recordAccess(power = world.game.hero.power, includeReachable = true) {
    const { area, game } = world;
    for (const tile of game.tiles)
      if (tile.terrain === 'floor' && tile.revealed) getAccess(area, tile).revealed ??= power;
    if (includeReachable)
      for (const tile of [...reachableTiles(game), ...exitsFrom(game)])
        getAccess(area, tile).reachable ??= power;
  }
  function act(at: Point, kind: SurveyAction['kind'], proof?: SurveyAction['proof']) {
    const { area, game } = world;
    const { power, health } = game.hero;
    const before = revealedCount(game);
    const target = tileAt(game, at);
    if (target && !target.revealed && (!proof || proof.upper > power))
      throw new Error(`No safe deduction for hidden tile ${accessKey(area, at)}.`);
    const events = step(game, at);
    if (events.some((event) => event.type === 'talk' && event.person.heals))
      events.push(...heal(game));
    const revealed = revealedCount(game) - before;
    if (!events.length && !revealed) return;
    if (game.lost) throw new Error(`Survey died at ${accessKey(area, at)}.`);
    if (events.some((event) => event.type === 'fight' && event.damage > 0))
      throw new Error(
        `Survey took damage at ${accessKey(area, at)}; progression is not certified.`,
      );
    let eventPower = power;
    for (const event of events) {
      if (event.type === 'find') getAccess(area, event.at).collected ??= eventPower;
      if (event.type === 'fight' && !event.monster.alive)
        getAccess(area, event.at).defeated ??= eventPower;
      if (event.type === 'powerUp') eventPower = event.power;
    }
    actions.push({
      area,
      at: point(at),
      kind,
      power,
      health,
      revealed,
      events: structuredClone(events),
      proof,
    });
    if (actions.length > 25_000)
      throw new Error('Survey action limit reached; progression is not certified.');
    // Reveals caused by this step preceded any upgrade from collecting its reward.
    // Entering an exit immediately leaves the map. Its far side is not reachable until we actually
    // return through that exit; the destination might not even offer a safe way back.
    recordAccess(power, !events.some((event) => event.type === 'travel'));
  }
  function walk(at: Point, kind: SurveyAction['kind'], proof?: SurveyAction['proof']) {
    const { game } = world;
    const tile = tileAt(game, at);
    // Auto-walk stops before visible monsters. Walk beside one, then perform the adjacent attack.
    const beside =
      tile?.revealed && tile.monster?.alive
        ? reachableTiles(game).find((from) => canStep(game, from, at))
        : undefined;
    const approach = planWalk(game, beside ?? at);
    const path = approach && beside ? [...approach, at] : approach;
    if (!path || (path.length && !same(path[path.length - 1], at)))
      throw new Error(`No known route to ${accessKey(world.area, at)}.`);
    for (const [index, next] of path.entries())
      act(
        next,
        index === path.length - 1 ? kind : 'walk',
        index === path.length - 1 ? proof : undefined,
      );
  }
  function explore() {
    for (;;) {
      const { game } = world;
      const reached = reachableTiles(game);
      const border = new Set<Tile>();
      for (const from of reached)
        for (const tile of neighbors(game, from)) if (canStep(game, from, tile)) border.add(tile);
      const candidates = ordered([...border]);
      const healer = candidates.find(
        (tile) => tile.person?.heals && game.hero.health < game.hero.maxHealth,
      );
      if (healer) {
        walk(healer, 'heal');
        continue;
      }
      const trader = candidates.find((tile) => tile.person && canTrade(game.hero, tile.person));
      if (trader) {
        walk(trader, 'trade');
        continue;
      }
      const find = candidates.find(
        (tile) => tile.revealed && tile.find && !tile.person && !tile.monster?.alive && !tile.exit,
      );
      if (find) {
        walk(find, 'collect');
        continue;
      }
      const observation = observe(game);
      const deduction = deduce(observation, options.profile);
      const target = candidates.find(
        (tile) =>
          !tile.revealed &&
          (deduction.bounds.get(tile.y * game.width + tile.x)?.high ?? Infinity) <= game.hero.power,
      );
      if (target) {
        const id = target.y * game.width + target.x;
        const proofs = explain(deduction, id);
        const usedClues = new Set(proofs.flatMap((proof) => proof.clues));
        walk(target, 'deduction', {
          upper: deduction.bounds.get(id)?.high ?? observation.maxLevel,
          maxLevel: observation.maxLevel,
          clues: observation.clues.filter((clue) => usedClues.has(clue.at)),
          deductions: proofs,
        });
        continue;
      }
      // A known stronger monster is a power gate, regardless of available hearts or healing.
      const fight = candidates.find(
        (tile) => tile.revealed && tile.monster?.alive && tile.monster.level <= game.hero.power,
      );
      if (fight) {
        walk(fight, 'fight');
        continue;
      }
      break;
    }
  }
  const surveyed = new Set<string>();
  let previousProgress = '';
  recordAccess();
  for (;;) {
    const { area, game } = world;
    const powerOnEntry = game.hero.power;
    const revealedBefore = revealedCount(game);
    const reachableBefore = reachableTiles(game).length;
    const firstAction = actions.length;
    explore();
    recordAccess();
    visits.push({
      area,
      powerOnEntry,
      powerOnExit: game.hero.power,
      revealedBefore,
      revealedAfter: revealedCount(game),
      reachableBefore,
      reachableAfter: reachableTiles(game).length,
      collected: actions
        .slice(firstAction)
        .reduce(
          (sum, action) => sum + action.events.filter((event) => event.type === 'find').length,
          0,
        ),
    });
    const progress = progressKey(world);
    if (progress !== previousProgress) surveyed.clear();
    previousProgress = progress;
    surveyed.add(regionKey(area, game));
    const route = nextRoute(world, surveyed, options);
    if (!route) break;
    for (const hop of route) {
      // Arrival places the hero on the exit. Leaving requires stepping off and onto it again.
      if (same(world.game.player, hop.at)) {
        const adjacent = reachableTiles(world.game).find(
          (tile) => !tile.exit && canStep(world.game, hop.at, tile),
        );
        if (!adjacent)
          throw new Error(`Cannot step back onto exit at ${accessKey(world.area, hop.at)}.`);
        walk(adjacent, 'walk');
      }
      walk(hop.at, 'travel');
      travel(world, hop.to);
      recordAccess();
    }
  }
  return {
    profile: options.profile,
    order: options.order ?? 'forward',
    world,
    actions,
    access: [...access.values()],
    visits,
  };
}
export type Survey = ReturnType<typeof surveyWorld>;
