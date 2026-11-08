import { areas } from '../maps';
import { arrive, createGame, type Game, type GameEvent, step } from './game';

export type AreaId = keyof typeof areas;
export type World = { area: AreaId; game: Game; visited: Map<AreaId, Game> };

function isArea(id: string): id is AreaId {
  return Object.hasOwn(areas, id);
}

// A new game starts with waking up beside your bed at home.
export function createWorld(): World {
  const game = createGame(areas.home.map, { legend: areas.home, from: 'village' });
  game.player = { ...areas.home.bedside };
  return { area: 'home', game, visited: new Map([['home', game]]) };
}

// Maps keep their state between visits, and the hero comes along.
export function travel(world: World, to: string, from: string = world.area): void {
  if (!isArea(to)) throw new Error(`Unknown area "${to}".`);
  const area = areas[to];
  let game = world.visited.get(to);
  if (game) arrive(game, from);
  else {
    game = createGame(area.map, { legend: area, hero: world.game.hero, from });
    world.visited.set(to, game);
  }
  world.area = to;
  world.game = game;
}

// A defeat costs the walk back: you wake beside your bed with every heart, and the map stays as it was.
export function wakeAtHome(world: World): void {
  world.game.lost = false;
  world.game.hero.health = world.game.hero.maxHealth;
  travel(world, 'home', 'village');
  world.game.player = { ...areas.home.bedside };
}

const isLesson = (id: string): id is AreaId => isArea(id) && 'lesson' in areas[id];

// Each lesson starts afresh on its own map, which has no way out.
export function startLesson(world: World, to: string): void {
  if (!isLesson(to)) throw new Error(`Unknown lesson "${to}".`);
  const area = areas[to];
  const game = createGame(area.map, { legend: area, hero: world.game.hero });
  world.visited.set(to, game);
  world.area = to;
  world.game = game;
}

// A lesson is won once every monster you are strong enough to defeat is gone.
export function lessonWon({ area, game }: World): boolean {
  return (
    isLesson(area) &&
    !game.tiles.some((tile) => tile.monster?.alive && tile.monster.level <= game.hero.power)
  );
}

// Winning puts you back beside Doctor Madeleine, who goes on to the next lesson.
export function finishLesson(world: World): GameEvent[] {
  if (!lessonWon(world)) return [];
  const teacher = areas.dojo.people.d;
  const { hero } = world.game;
  if (teacher.training.lessons[hero.lessons]?.area === world.area) hero.lessons++;
  world.visited.delete(world.area);
  travel(world, 'dojo', 'village');
  const at = world.game.tiles.find((tile) => tile.person === teacher);
  if (!at) throw new Error('Doctor Madeleine is missing from the dojo.');
  world.game.player = { x: at.x, y: at.y + 1 };
  return step(world.game, at);
}
