import './style.css';
import {
  answer,
  buy,
  canNote,
  collect,
  cycleNote,
  distance,
  type Find,
  type GameEvent,
  heal,
  type Note,
  neighbors,
  numberAt,
  type Person,
  type Point,
  piecesPerUpgrade,
  planWalk,
  same,
  setNote,
  step,
  tileAt,
  toggleNote,
} from './game/game';
import { deserialize } from './game/save';
import { type SaveSlot, SaveSlots, saveSlots } from './game/save-slots';
import { createWorld, travel, type World, wakeAtHome } from './game/world';
import { areas } from './maps';
import {
  cameraTarget,
  draw,
  type Effect,
  effectDuration,
  icon,
  itemGetImage,
  layout,
} from './render';

const app = element<HTMLElement>('#app');
const levelNotes = [1, 2, 3, 4, 5] as const;
const noteTools = [...levelNotes, 'danger', 'erase'] as const;
app.innerHTML = `
  <canvas tabindex="0" aria-label="Game board. Move with arrow keys or WASD. Use Q, E, Z, C for diagonals." aria-describedby="status"></canvas>
  <section aria-label="Player stats" class="stats hud">
    <div class="health" id="hearts" role="img"></div>
    <div class="stat-row">
      <div class="stat" id="power" aria-label="Power"><span class="stat-icon" aria-hidden="true">⚔</span><span id="power-value">1</span></div>
      <div class="stat" id="whetstones"><span class="stat-icon" aria-hidden="true">◆</span><span id="whetstones-value">0/4</span></div>
      <div class="stat" id="heart-pieces"><span class="stat-icon" aria-hidden="true">♥</span><span id="heart-pieces-value">0/4</span></div>
      <div class="stat" id="coins"><span class="stat-icon" aria-hidden="true">●</span><span id="coins-value">0</span></div>
    </div>
  </section>
  <button class="menu-button hud" id="menu" aria-label="Menu"><img src="${icon('bag')}" alt="" /></button>
  <section class="notes hud" aria-label="Tile notes">
    ${noteTools.map((note) => `<button class="note-button" data-note="${note}" aria-label="${note === 'erase' ? 'Erase notes' : note === 'danger' ? 'Mark danger' : `Mark level ${note}`}" aria-pressed="false">${note === 'danger' ? '!' : note === 'erase' ? '⌫' : note}</button>`).join('')}
  </section>
  <p id="status" class="visually-hidden" role="status" aria-live="polite"></p>
  <dialog id="menu-dialog" class="menu">
  <header class="menu-header"><button class="page-turn" data-turn="-1" aria-label="Previous page">‹</button><h2 id="menu-title"></h2><button class="page-turn" data-turn="1" aria-label="Next page">›</button></header>
  <section data-page="Items"><div class="slots" id="items"></div></section>
  <section data-page="Quests"><div id="quests"></div></section>
  <section data-page="Guide"><ul>
    <li>Tap a neighboring tile to move or fight. Numbers sum the levels of living monsters in the eight neighboring tiles.</li>
    <li>A zero opens its whole connected empty area and the numbers around it. Monsters stay hidden until you try their tile.</li>
    <li>Tap a distant tile to walk over known ground. A hidden tile next to known ground is entered at the end of the walk.</li>
    <li>Choose a note, then tap a hidden tile to mark it. Number keys 1–5 mark the tile under the mouse, or pick that note. Hold Shift to keep marking. Mark a tile with the same note again to clear it. Hold or right-click a tile to cycle 1–5.</li>
    <li>Monsters at or below your power fall without hurting you. A hidden stronger monster is revealed and survives: you lose its level times the levels it has over you in hearts, and stay where you are. Once visible, it blocks you without further damage until your power is high enough. Its clue stays hidden. Running out of hearts ends the run.</li>
    <li>Four whetstones raise your power. Four heart pieces add a heart. Chiefs drop a whole one.</li>
    <li>Move with WASD or arrows. Hold two directions, or use Q / E / Z / C, for diagonals. Escape stops walking and clears the note tool.</li>
  </ul>
  <div class="bestiary" aria-label="Monster levels"><span class="slime-key">1 · Slime</span><span class="bat-key">2 · Bat</span><span class="goblin-key">3 · Goblin and chief</span></div>
  <button class="secondary" data-restart>Start over</button></section>
  <section data-page="Debug"><div class="debug" id="debug"></div><button class="secondary" data-restart>Start over</button></section>
  <button class="secondary" data-saves>Saves</button>
  <button data-close autofocus>Resume</button></dialog>
  <dialog id="saves-dialog" aria-labelledby="saves-title"><h2 id="saves-title">Saves</h2><div id="save-slots"></div><p id="save-error" role="alert"></p><button id="saves-close" data-close>Back</button></dialog>
  <dialog id="talk" class="talk"><div class="talk-name" id="talk-name"></div><p id="talk-line"></p><button class="talk-next" aria-label="Continue">▸</button></dialog>
  <dialog id="ask" class="talk"><div class="talk-name" id="ask-name"></div><p id="ask-line"></p><div class="dialog-actions"><button class="secondary" id="no">No</button><button id="yes">Yes</button></div><button class="talk-next" aria-label="Continue">▸</button></dialog>
  <dialog id="found" class="found"><img id="found-image" alt="" /><p>You found</p><h2 id="found-name"></h2><p id="found-detail"></p></dialog>
  <dialog id="death-dialog"><h2>Game over</h2><div class="dialog-actions"><button class="secondary" data-restart>Start over</button><button id="continue">Continue</button></div><button class="secondary" data-saves>Saves</button></dialog>
`;
function element<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing element: ${selector}`);
  return value;
}
const canvas = element<HTMLCanvasElement>('canvas');
const status = element<HTMLParagraphElement>('#status');
const hearts = element<HTMLDivElement>('#hearts');
const power = element<HTMLSpanElement>('#power-value');
const noteButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-note]')];
const saves = new SaveSlots(localStorage);
const freshStart = saves.read(saves.selected).status === 'empty';
let world = saves.open(saves.selected) ?? createWorld();
let game = world.game;
let selectedNote: Note | 'erase' | null = null;
let hovered: Point | undefined;
let path: Point[] = [];
let effects: Effect[] = [];
let flash: Point | undefined;
let flashUntil = 0;
let lastWalk = 0;
let lastFrame = 0;
const settledCamera = () =>
  cameraTarget(game, game.player, canvas.clientWidth, canvas.clientHeight);
let camera = settledCamera();
let keyboardTimer: ReturnType<typeof setTimeout> | undefined;
let pendingChord = false;
const held = new Set<string>();
const directions: Record<string, Point> = {
  w: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  q: { x: -1, y: -1 },
  e: { x: 1, y: -1 },
  z: { x: -1, y: 1 },
  c: { x: 1, y: 1 },
};
function updateHud(): void {
  canvas.setAttribute(
    'aria-label',
    `${areas[world.area].name}. Player column ${game.player.x + 1}, row ${game.player.y + 1}. Here: ${numberAt(game, game.player)}. Use arrows or WASD to move.`,
  );
  hearts.innerHTML = Array.from(
    { length: game.hero.maxHealth },
    (_, i) =>
      `<span class="heart${i < game.hero.health ? ' full' : ''}" aria-hidden="true">♥</span>`,
  ).join('');
  hearts.setAttribute('aria-label', `${game.hero.health} of ${game.hero.maxHealth} hearts`);
  power.textContent = String(game.hero.power);
  element('#power').setAttribute('aria-label', `Power ${game.hero.power}`);
  const whetstones = `${game.hero.whetstones % piecesPerUpgrade}/${piecesPerUpgrade}`;
  element('#whetstones-value').textContent = whetstones;
  element('#whetstones').setAttribute('aria-label', `${whetstones} whetstones`);
  const heartPieces = `${game.hero.heartPieces % piecesPerUpgrade}/${piecesPerUpgrade}`;
  element('#heart-pieces-value').textContent = heartPieces;
  element('#heart-pieces').setAttribute('aria-label', `${heartPieces} heart pieces`);
  element('#coins-value').textContent = String(game.hero.coins);
  element('#coins').setAttribute('aria-label', `${game.hero.coins} coins`);
}
function stop(): void {
  pendingChord = false;
  path = [];
  held.clear();
  clearTimeout(keyboardTimer);
  keyboardTimer = undefined;
}
function openDialog(id: string): void {
  stop();
  element<HTMLDialogElement>(id).showModal();
}
function feedback(point: Point): void {
  flash = point;
  flashUntil = performance.now() + 280;
}
function animate(className: string): void {
  app.classList.remove('hit', 'hurt');
  void app.offsetWidth;
  app.classList.add(className);
}
app.addEventListener('animationend', () => app.classList.remove('hit', 'hurt'));
// Announcements rise one after another once the fight is over, clear of damage numbers.
let nextAnnouncement = 0;
function announce(at: Point, text: string, color = '#f3d794'): void {
  const started = Math.max(performance.now() + effectDuration.fight, nextAnnouncement);
  nextAnnouncement = started + 600;
  effects.push({ kind: 'text', at, text, color, started });
}
const findNames: Record<Find, string> = {
  sword: 'Sword',
  whetstone: 'Whetstone',
  greatstone: 'Greatstone',
  heartPiece: 'Heart piece',
  heart: 'Heart',
  coin: 'Coin',
  marble: 'Lucky marble',
  spectacles: 'Spectacles',
  ring: 'Ring',
};
function changeMap(): void {
  game = world.game;
  camera = settledCamera();
  effects = [];
  status.textContent = areas[world.area].name;
}
function progress(find: Find): string | undefined {
  const { hero } = game;
  if (find === 'whetstone') return `${hero.whetstones % piecesPerUpgrade}/${piecesPerUpgrade}`;
  if (find === 'heartPiece') return `${hero.heartPieces % piecesPerUpgrade}/${piecesPerUpgrade}`;
}
// An upgrade follows the find that earned it.
function upgrade(event: GameEvent | undefined): string | undefined {
  if (event?.type === 'powerUp') return `Power ${event.power}!`;
  if (event?.type === 'heartUp') return `${event.maxHealth} hearts!`;
}
function handleEvents(events: GameEvent[]): void {
  for (const [index, event] of events.entries()) {
    switch (event.type) {
      case 'blocked':
        effects = effects.filter((effect) => effect.kind !== 'shake');
        effects.push({ kind: 'shake', at: game.player, started: performance.now() });
        status.textContent = 'Too strong.';
        break;
      case 'fight':
        animate(event.damage ? 'hurt' : 'hit');
        if (!event.monster.alive)
          effects.push({
            kind: 'fight',
            from: event.from,
            at: event.at,
            monster: event.monster,
            started: performance.now(),
          });
        if (event.damage)
          effects.push({
            kind: 'text',
            at: event.at,
            text: `−${event.damage} ♥`,
            color: '#f0a18c',
            started: performance.now(),
          });
        status.textContent = event.damage
          ? `Level ${event.monster.level} ${event.monster.kind}: −${event.damage} ♥`
          : `Level ${event.monster.level} ${event.monster.kind} defeated.`;
        break;
      case 'death':
        openDialog('#death-dialog');
        break;
      case 'travel':
        travel(world, event.to);
        changeMap();
        break;
      case 'offer': {
        const { at, find, price } = event;
        ask(`Buy ${findNames[find].toLowerCase()} for ${price} coins?`, {
          yes: () => {
            const events = buy(game, at);
            // Keep the dialog open to explain; the next tap closes it.
            if (!events.length)
              return decline('Not enough coins. Folk drop them all over out there.');
            askDialog.close();
            handleEvents(events);
            updateHud();
          },
        });
        break;
      }
      case 'ask': {
        const { at, person } = event;
        const respond = (yes: boolean) => {
          askDialog.close();
          handleEvents(answer(game, at, person, yes));
          updateHud();
        };
        ask(event.question, { yes: () => respond(true), no: () => respond(false) }, person.name);
        break;
      }
      case 'talk':
        // A reward is handed over once they have finished speaking.
        talk(event.person, event.lines, events.slice(index + 1));
        return;
      case 'heal':
        announce(event.at, 'Healed!', '#a5c97c');
        status.textContent = `Hearts restored: +${event.amount}.`;
        break;
      case 'find':
        status.textContent = `Found: ${findNames[event.find]}.`;
        if (event.find === 'coin') {
          announce(event.at, findNames.coin, '#e8ce95');
          break;
        }
        // Each find is shown on its own, and whatever follows waits until it is put away.
        showFound(
          event.find,
          upgrade(events[index + 1]) ?? progress(event.find),
          events.slice(index + 1),
        );
        return;
      case 'powerUp':
        status.textContent = `Power ${event.power}. Level ${event.power} monsters are now free to fight.`;
        break;
      case 'heartUp':
        status.textContent = `${event.maxHealth} hearts.`;
        break;
      case 'win':
        announce(game.player, 'Chief defeated!');
        status.textContent = 'Goblin chief defeated.';
        break;
    }
  }
  if (events.length) stop();
}
const foundDialog = element<HTMLDialogElement>('#found');
let afterFound: GameEvent[] = [];
function showFound(find: Find, detail: string | undefined, after: GameEvent[]): void {
  afterFound = after;
  element('#found-name').textContent = findNames[find];
  element('#found-detail').textContent = detail ?? '';
  element<HTMLImageElement>('#found-image').src = itemGetImage(find);
  openDialog('#found');
}
// A tap anywhere puts the find away.
foundDialog.addEventListener('click', () => foundDialog.close());
foundDialog.addEventListener('close', () => {
  const after = afterFound;
  afterFound = [];
  handleEvents(after);
  updateHud();
});
const askDialog = element<HTMLDialogElement>('#ask');
let answers: { yes: () => void; no?: () => void } | undefined;
function ask(question: string, next: NonNullable<typeof answers>, name = ''): void {
  answers = next;
  askDialog.classList.remove('declined');
  element('#ask-name').textContent = name;
  element('#ask-line').textContent = question;
  openDialog('#ask');
}
function decline(line: string): void {
  askDialog.classList.add('declined');
  element('#ask-line').textContent = line;
}
element('#yes').addEventListener('click', (event) => {
  event.stopPropagation();
  answers?.yes();
});
element('#no').addEventListener('click', (event) => {
  event.stopPropagation();
  if (answers?.no) answers.no();
  else askDialog.close();
});
askDialog.addEventListener('click', () => {
  if (askDialog.classList.contains('declined')) askDialog.close();
});
const talkDialog = element<HTMLDialogElement>('#talk');
let conversation:
  | { person: Person; lines: readonly string[]; line: number; after: GameEvent[] }
  | undefined;
function showLine(): void {
  if (!conversation) return;
  element('#talk-name').textContent = conversation.person.name;
  element('#talk-line').textContent = conversation.lines[conversation.line];
}
function talk(person: Person, lines: readonly string[], after: GameEvent[] = []): void {
  conversation = { person, lines, line: 0, after };
  showLine();
  openDialog('#talk');
}
// A tap anywhere moves the conversation on; the last line closes it.
talkDialog.addEventListener('click', () => {
  if (!conversation) return;
  conversation.line++;
  if (conversation.line < conversation.lines.length) showLine();
  else talkDialog.close();
});
talkDialog.addEventListener('close', () => {
  // Clear the finished conversation first, since what follows may start another.
  const finished = conversation;
  conversation = undefined;
  if (finished) handleEvents(finished.after);
  if (finished?.person.heals) handleEvents(heal(game));
  updateHud();
});
function move(target: Point): boolean {
  const before = game.player;
  // Clues already on screen around a kill drop; point them out.
  const clues = neighbors(game, target).filter((tile) => tile.revealed && tile.terrain === 'floor');
  const events = step(game, target);
  if (events.some((event) => event.type === 'fight' && !event.monster.alive))
    for (const at of clues) effects.push({ kind: 'pulse', at, started: performance.now() });
  if (same(before, game.player) && !events.length) feedback(target);
  handleEvents(events);
  updateHud();
  return events.length === 0 && !same(before, game.player);
}
// Shift keeps the note tool out for marking several tiles in a row.
function activate(target: Point, keepTool = false): void {
  stop();
  if (selectedNote) {
    if (selectedNote === 'erase') setNote(game, target, undefined);
    else toggleNote(game, target, selectedNote);
    if (!keepTool) selectNote(null);
    reportNote(target);
    return;
  }
  if (same(game.player, target)) return;
  if (distance(game.player, target) === 1) {
    move(target);
    return;
  }
  const route = planWalk(game, target);
  if (!route?.length) {
    feedback(target);
    status.textContent = 'No revealed path to that tile.';
    return;
  }
  path = route;
  lastWalk = performance.now();
  status.textContent = same(route[route.length - 1], target)
    ? 'Walking…'
    : 'Walking to the edge. Tap again beside the hidden tile to enter.';
}
function pointFromPointer(event: PointerEvent | MouseEvent): Point | undefined {
  const bounds = canvas.getBoundingClientRect();
  const { tile, left, top } = layout(camera, bounds.width, bounds.height);
  const point = {
    x: Math.floor((event.clientX - bounds.left - left) / tile),
    y: Math.floor((event.clientY - bounds.top - top) / tile),
  };
  return tileAt(game, point) ? point : undefined;
}
let press:
  | {
      id: number;
      point: Point;
      x: number;
      y: number;
      timer: ReturnType<typeof setTimeout>;
      consumed: boolean;
    }
  | undefined;
function cancelPress(): void {
  if (press) clearTimeout(press.timer);
  press = undefined;
}
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || press) return;
  const point = pointFromPointer(event);
  if (!point) return;
  stop();
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  press = {
    id: event.pointerId,
    point,
    x: event.clientX,
    y: event.clientY,
    consumed: false,
    timer: setTimeout(() => {
      if (!press) return;
      cycleNote(game, press.point);
      reportNote(press.point);
      press.consumed = true;
    }, 450),
  };
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'mouse') hovered = pointFromPointer(event);
  if (
    press?.id === event.pointerId &&
    Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10
  )
    cancelPress();
});
canvas.addEventListener('pointerup', (event) => {
  if (press?.id !== event.pointerId) return;
  const current = press;
  cancelPress();
  if (current && !current.consumed) activate(current.point, event.shiftKey);
});
canvas.addEventListener('pointerleave', () => {
  hovered = undefined;
});
canvas.addEventListener('pointercancel', cancelPress);
canvas.addEventListener('lostpointercapture', cancelPress);
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  // Touch context menus can follow our own long press; avoid cycling twice.
  if (event.button !== 2 || (event instanceof PointerEvent && event.pointerType === 'touch'))
    return;
  cancelPress();
  stop();
  const point = pointFromPointer(event);
  if (point) {
    cycleNote(game, point);
    reportNote(point);
  }
});
function reportNote(point: Point): void {
  const tile = tileAt(game, point);
  if (!tile || tile.revealed) return;
  status.textContent = `Column ${point.x + 1}, row ${point.y + 1}: ${tile.note ? `marked ${tile.note}` : 'note cleared'}.`;
}
function selectNote(note: typeof selectedNote): void {
  stop();
  selectedNote = selectedNote === note ? null : note;
  for (const button of noteButtons)
    button.setAttribute('aria-pressed', String(button.dataset.note === String(selectedNote)));
}
for (const button of noteButtons) {
  button.addEventListener('click', () => {
    const note = noteTools.find((tool) => String(tool) === button.dataset.note);
    if (note !== undefined) selectNote(note);
  });
}
function keyboardStep(): void {
  pendingChord = false;
  keyboardTimer = undefined;
  let dx = 0;
  let dy = 0;
  for (const key of held) {
    dx += directions[key].x;
    dy += directions[key].y;
  }
  if (dx || dy) move({ x: game.player.x + Math.sign(dx), y: game.player.y + Math.sign(dy) });
  if (held.size) keyboardTimer = setTimeout(keyboardStep, 140);
}
window.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey)
    return;
  if (event.key === 'Escape') {
    stop();
    selectNote(null);
    return;
  }
  // Physical keys, so Shift+3 still means 3 on layouts where it types a symbol.
  const digit = /^(?:Digit|Numpad)([1-5])$/.exec(event.code)?.[1];
  const note = levelNotes.find((level) => String(level) === digit);
  if (note !== undefined) {
    if (event.repeat) return;
    // Mark the hovered tile directly; otherwise pick the tool for the next click.
    if (hovered && canNote(game, hovered)) {
      toggleNote(game, hovered, note);
      reportNote(hovered);
    } else selectNote(note);
    return;
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!directions[key]) return;
  event.preventDefault();
  if (event.repeat) return;
  path = [];
  held.add(key);
  // A short chord window lets two cardinal keys form one diagonal step.
  if (!keyboardTimer) {
    pendingChord = true;
    keyboardTimer = setTimeout(keyboardStep, 40);
  }
});
window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!held.has(key)) return;
  if (pendingChord) {
    clearTimeout(keyboardTimer);
    keyboardStep();
  }
  held.delete(key);
  if (!held.size) {
    clearTimeout(keyboardTimer);
    keyboardTimer = undefined;
  }
});
window.addEventListener('blur', () => {
  stop();
  cancelPress();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stop();
    cancelPress();
    save();
  }
});
const save = () => saves.save(world);
setInterval(save, 1000);
window.addEventListener('pagehide', save);
const menuDialog = element<HTMLDialogElement>('#menu-dialog');
const pages = [...menuDialog.querySelectorAll<HTMLElement>('[data-page]')];
let page = 0;
function turnPage(by: number): void {
  showItems();
  showQuests();
  page = (page + by + pages.length) % pages.length;
  pages.forEach((section, index) => {
    section.hidden = index !== page;
  });
  element('#menu-title').textContent = pages[page].dataset.page ?? '';
}
function slot(find: Find, label: string): string {
  return `<div class="slot"><img src="${icon(find)}" alt="" /><span>${label}</span></div>`;
}
// Pieces show how far they go toward the next upgrade; spent ones are gone.
function showItems(): void {
  const { hero } = game;
  const whetstones = hero.whetstones % piecesPerUpgrade;
  const heartPieces = hero.heartPieces % piecesPerUpgrade;
  const slots = [
    hero.sword ? slot('sword', findNames.sword) : '',
    whetstones ? slot('whetstone', `${whetstones}/${piecesPerUpgrade}`) : '',
    heartPieces ? slot('heartPiece', `${heartPieces}/${piecesPerUpgrade}`) : '',
    hero.coins ? slot('coin', String(hero.coins)) : '',
    ...hero.carrying.map((keepsake) => slot(keepsake, findNames[keepsake])),
  ].filter(Boolean);
  element('#items').innerHTML = Array.from(
    { length: Math.max(8, slots.length) },
    (_, index) => slots[index] ?? '<div class="slot"></div>',
  ).join('');
}
const quests = Object.values(areas)
  .flatMap((area): Person[] => ('people' in area ? Object.values(area.people) : []))
  .flatMap(({ name, quest }) => (quest ? [{ name, wants: quest.wants }] : []));
function showQuests(): void {
  const { hero } = game;
  const row = ({ name, wants }: (typeof quests)[number], state: string) =>
    `<li><img src="${icon(wants)}" alt="" /><div><strong>${findNames[wants]}</strong><span>${name}</span></div><em>${state}</em></li>`;
  const active = quests
    .filter(({ wants }) => hero.asked.includes(wants) && !hero.returned.includes(wants))
    .map((quest) => row(quest, hero.carrying.includes(quest.wants) ? 'Found' : ''));
  const done = quests
    .filter(({ wants }) => hero.returned.includes(wants))
    .map((quest) => row(quest, '✓'));
  element('#quests').innerHTML = `
    <h3>Active</h3><ul class="quests">${active.join('') || '<li class="none">None</li>'}</ul>
    <h3>Completed</h3><ul class="quests done">${done.join('') || '<li class="none">None</li>'}</ul>`;
}
element('#menu').addEventListener('click', () => {
  turnPage(-page);
  openDialog('#menu-dialog');
});
for (const button of menuDialog.querySelectorAll<HTMLButtonElement>('[data-turn]'))
  button.addEventListener('click', () => turnPage(Number(button.dataset.turn)));
// Playtesting shortcuts, to be removed before release. Solvers and map checks must not use them.
const cheats = {
  'Add coin': () => collect(game, game.player, 'coin'),
  'Add whetstone': () => collect(game, game.player, 'whetstone'),
  'Add heart': () => collect(game, game.player, 'heart'),
  Heal: () => heal(game),
};
for (const [label, cheat] of Object.entries(cheats)) {
  const button = document.createElement('button');
  button.className = 'secondary';
  button.textContent = label;
  button.addEventListener('click', () => {
    handleEvents(cheat());
    updateHud();
  });
  element('#debug').append(button);
}
menuDialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') turnPage(-1);
  if (event.key === 'ArrowRight') turnPage(1);
});
for (const button of document.querySelectorAll('[data-close]'))
  button.addEventListener('click', () => button.closest('dialog')?.close());
function loadWorld(next: World): void {
  stop();
  cancelPress();
  conversation = undefined;
  afterFound = [];
  answers = undefined;
  nextAnnouncement = 0;
  hovered = undefined;
  world = next;
  changeMap();
  flash = undefined;
  selectNote(null);
  updateHud();
  for (const dialog of document.querySelectorAll('dialog')) dialog.close();
  if (game.lost) openDialog('#death-dialog');
}
function newGame(slot: SaveSlot): void {
  save();
  const saved = saves.read(slot);
  const warning = saved.status === 'incompatible' ? `Save ${slot} is no longer compatible. ` : '';
  if (
    saved.status !== 'empty' &&
    !window.confirm(`${warning}Replace Save ${slot} with a new game? Its progress will be erased.`)
  )
    return;
  const next = createWorld();
  saves.replace(slot, next);
  loadWorld(next);
  wakeUp(areas.home.people.m.introLines);
}
// Mum is there whenever you wake up beside your bed.
function wakeUp(lines: readonly string[]): void {
  talk(areas.home.people.m, lines);
}
element('#continue').addEventListener('click', () => {
  element<HTMLDialogElement>('#death-dialog').close();
  wakeAtHome(world);
  changeMap();
  updateHud();
  wakeUp(areas.home.people.m.wakeLines);
});
// Game over needs an answer.
element('#death-dialog').addEventListener('cancel', (event) => event.preventDefault());
for (const button of document.querySelectorAll('[data-restart]'))
  button.addEventListener('click', () => {
    if (saves.active !== undefined) newGame(saves.active);
  });

const savesDialog = element<HTMLDialogElement>('#saves-dialog');
function showSaves(): void {
  save();
  element('#save-error').textContent = '';
  const rows = saveSlots.map((slot) => {
    const saved = saves.read(slot);
    const current = saves.active === slot;
    const detail =
      saved.status === 'ready'
        ? `${areas[saved.world.area].name} · Power ${saved.world.game.hero.power}${saved.world.game.lost ? ' · Game over' : ''}`
        : saved.status === 'empty'
          ? 'Empty'
          : 'No longer compatible';
    const row = document.createElement('div');
    row.className = 'save-slot';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', `Save ${slot}`);
    row.innerHTML = `
      <div class="save-heading"><strong>Save ${slot}${current ? ' · Playing' : ''}</strong><span>${detail}</span></div>
      <button data-play ${current ? 'disabled' : ''}>${current ? 'Playing' : saved.status === 'ready' ? 'Continue' : 'New game'}</button>
      <div class="save-actions"><button class="secondary" data-download ${saved.status === 'empty' ? 'disabled' : ''}>Download</button><button class="secondary" data-import>Import</button></div>
      <input type="file" accept=".json,application/json" hidden />`;
    row.querySelector('[data-play]')?.addEventListener('click', () => {
      if (saved.status !== 'ready') newGame(slot);
      else {
        save();
        const next = saves.open(slot);
        if (next) loadWorld(next);
        else showSaves();
      }
    });
    row.querySelector('[data-download]')?.addEventListener('click', () => {
      save();
      const latest = saves.read(slot);
      if (latest.status === 'empty') return;
      const url = URL.createObjectURL(new Blob([latest.text], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sweeper-quest-save-${slot}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const input = row.querySelector('input');
    row.querySelector('[data-import]')?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const next = deserialize(await file.text());
        if (!next) {
          element('#save-error').textContent =
            'This file is damaged or no longer compatible. Your saves have not changed.';
          return;
        }
        save();
        if (
          saves.read(slot).status !== 'empty' &&
          !window.confirm(`Replace Save ${slot} with this file? Its progress will be erased.`)
        )
          return;
        saves.replace(slot, next);
        loadWorld(next);
      } catch {
        element('#save-error').textContent =
          'Could not read this file. Your saves have not changed.';
      } finally {
        input.value = '';
      }
    });
    return row;
  });
  element('#save-slots').replaceChildren(...rows);
  element<HTMLButtonElement>('#saves-close').hidden = saves.active === undefined;
  openDialog('#saves-dialog');
}
for (const button of document.querySelectorAll('[data-saves]'))
  button.addEventListener('click', showSaves);
savesDialog.addEventListener('cancel', (event) => {
  if (saves.active === undefined) event.preventDefault();
});
function frame(time: number): void {
  if (path.length && time - lastWalk >= 75) {
    const next = path.shift();
    if (next && !move(next)) path = [];
    lastWalk = time;
  }
  effects = effects.filter((effect) => time - effect.started < effectDuration[effect.kind]);
  if (time > flashUntil) flash = undefined;
  // Ease toward the player rather than jumping a whole tile with every step.
  const target = settledCamera();
  const ease = 1 - Math.exp(-(time - lastFrame) / 50);
  camera = {
    x: camera.x + (target.x - camera.x) * ease,
    y: camera.y + (target.y - camera.y) * ease,
  };
  lastFrame = time;
  draw(canvas, game, { camera, path, flash, effects, time });
  requestAnimationFrame(frame);
}
updateHud();
if (saves.active === undefined) showSaves();
else if (game.lost) openDialog('#death-dialog');
else if (freshStart) wakeUp(areas.home.people.m.introLines);
requestAnimationFrame(frame);
