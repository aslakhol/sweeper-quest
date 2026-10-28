import './style.css';
import {
  createGame,
  cycleNote,
  distance,
  type GameEvent,
  inspectCorpse,
  type Note,
  numberAt,
  type Point,
  planWalk,
  same,
  setNote,
  step,
  tileAt,
} from './game/game';
import map from './maps/training.txt?raw';
import { draw, type Effect } from './render';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing app element.');
const noteTools = [1, 2, 3, 4, 5, 'danger', 'erase'] as const;
app.innerHTML = `
  <header><div><div class="eyebrow">Field test · 02</div><h1>Sweeper Quest</h1></div><button class="help-button" id="help" aria-label="How to play">?</button></header>
  <section aria-label="Player stats" class="stats">
    <div class="health" id="hearts" role="img"></div>
    <div class="stat" id="power" aria-label="Power"><span class="stat-icon" aria-hidden="true">⚔</span><span id="power-value">1</span></div>
  </section>
  <div class="board-top"><span>The old clearing <span id="slain"></span></span><span class="here" id="here">Here: 0</span></div>
  <div class="board-wrap"><canvas tabindex="0" aria-label="Game board. Move with arrow keys or WASD. Use Q, E, Z, C for diagonals." aria-describedby="status"></canvas></div>
  <section class="notes" aria-label="Tile notes">
    <div class="notes-heading"><span>Mark a tile</span><span id="note-mode">Tap to move</span></div>
    <div class="note-buttons">
      ${noteTools.map((note) => `<button class="note-button" data-note="${note}" aria-label="${note === 'erase' ? 'Erase notes' : note === 'danger' ? 'Mark danger' : `Mark level ${note}`}" aria-pressed="false">${note === 'danger' ? '!' : note === 'erase' ? '⌫' : note}</button>`).join('')}
    </div>
  </section>
  <div class="bestiary" aria-label="Monster levels"><span class="slime-key">1 · Slime</span><span class="bat-key">2 · Bat</span><span class="goblin-key">3 · Goblin</span></div>
  <div class="objective"><span class="objective-icon" aria-hidden="true">◇</span><div><div class="objective-label">Your quest</div><div id="objective">Find the first shard bundle</div></div></div>
  <p id="status" role="status" aria-live="polite">Numbers sum nearby levels. Notes mark suspected monsters.</p>
  <footer><span>02 / THE CLEARING</span><button class="reset" id="restart">Start over ↻</button></footer>
  <dialog id="help-dialog"><h2>How to play</h2><ul>
    <li>Tap a neighboring tile to move or fight. Tile numbers, including the small badges on monsters and corpses, sum living monster levels in the eight neighboring tiles. They exclude the monster on the tile itself.</li>
    <li>A zero opens its whole connected empty area and the numbers around it. Monsters stay hidden until you try their tile.</li>
    <li>Tap a distant tile to walk over known ground. Tap again when next to hidden ground to enter it.</li>
    <li>Choose a note, then tap hidden tiles. Choose it again to move. Hold or right-click a tile to cycle 1–5.</li>
    <li>Power beats equal or weaker monsters. Corpses stay visible. Tap one to see its clue, then tap the clue to walk there.</li>
    <li>Slimes are level 1, bats level 2, and goblins level 3. Find both shard bundles to reach power 3, then defeat the crowned goblin.</li>
    <li>Move with WASD or arrows. Hold two directions, or use Q / E / Z / C, for diagonals. Escape stops walking and clears the note tool.</li>
  </ul><button data-close>Back to the clearing</button></dialog>
  <dialog id="win-dialog"><div class="eyebrow">Quest complete</div><h2>Goblin chief defeated</h2><p>Power <span id="win-power">2</span>.</p><button data-close>Keep exploring</button></dialog>
  <dialog id="restart-dialog"><h2>Start a new quest?</h2><p>This clears your power and explored tiles.</p><div class="dialog-actions"><button class="secondary" data-close>Keep playing</button><button id="confirm-restart">Start over</button></div></dialog>
`;
function element<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing element: ${selector}`);
  return value;
}
const canvas = element<HTMLCanvasElement>('canvas');
const board = element<HTMLDivElement>('.board-wrap');
const status = element<HTMLParagraphElement>('#status');
const hearts = element<HTMLDivElement>('#hearts');
const power = element<HTMLSpanElement>('#power-value');
const here = element<HTMLSpanElement>('#here');
const objective = element<HTMLDivElement>('#objective');
const noteMode = element<HTMLSpanElement>('#note-mode');
const noteButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-note]')];
let game = createGame(map);
let selectedNote: Note | 'erase' | null = null;
let path: Point[] = [];
let effects: Effect[] = [];
let flash: Point | undefined;
let flashUntil = 0;
let lastWalk = 0;
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
    `Clearing. Player column ${game.player.x + 1}, row ${game.player.y + 1}. Here: ${numberAt(game, game.player)}. Use arrows or WASD to move.`,
  );
  hearts.innerHTML = Array.from(
    { length: game.maxHealth / 4 },
    (_, i) =>
      `<span class="heart" aria-hidden="true">♥<span class="heart-fill" style="width:${Math.max(0, Math.min(4, game.health - i * 4)) * 25}%">♥</span></span>`,
  ).join('');
  hearts.setAttribute('aria-label', `${game.health / 4} of ${game.maxHealth / 4} hearts`);
  power.textContent = String(game.power);
  element('#power').setAttribute('aria-label', `Power ${game.power}`);
  here.textContent = `Here: ${numberAt(game, game.player)}`;
  objective.textContent = game.won
    ? 'Goblin chief defeated'
    : game.power >= 3
      ? 'Defeat the crowned goblin'
      : game.power === 2
        ? `Find the second bundle · ${game.shards}/5 shards`
        : 'Find the first shard bundle';
  const monsters = game.tiles.flatMap((tile) => (tile.monster ? [tile.monster] : []));
  element('#slain').textContent =
    `· ${monsters.filter((monster) => !monster.alive).length}/${monsters.length}`;
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
  board.classList.remove('hit', 'hurt');
  void board.offsetWidth;
  board.classList.add(className);
}
board.addEventListener('animationend', () => board.classList.remove('hit', 'hurt'));
function handleEvents(events: GameEvent[]): void {
  for (const event of events) {
    if ('at' in event) {
      effects.push({
        kind: event.type,
        at: event.at,
        started: performance.now(),
        color: event.type === 'damage' ? '#f0a18c' : '#f3d794',
        text:
          event.type === 'hit'
            ? 'Defeated'
            : event.type === 'damage'
              ? `−${event.amount / 4} ♥`
              : `Power ${game.power}!`,
      });
    }
    switch (event.type) {
      case 'hit':
        animate('hit');
        status.textContent = 'Monster defeated. Tap its corpse to inspect the clue.';
        break;
      case 'damage':
        animate('hurt');
        status.textContent = `Lost ${event.amount / 4} heart. You need more power.`;
        break;
      case 'shard':
        status.textContent = `Sword shard found. Power ${game.power}!`;
        break;
      case 'respawn':
        status.textContent = 'Back at the start. Your power and explored tiles are kept.';
        break;
      case 'win':
        element('#win-power').textContent = String(game.power);
        openDialog('#win-dialog');
        break;
    }
  }
  if (events.length) stop();
}
function move(target: Point): boolean {
  const before = game.player;
  const events = step(game, target);
  if (same(before, game.player) && !events.length) feedback(target);
  handleEvents(events);
  updateHud();
  return events.length === 0 && !same(before, game.player);
}
function activate(target: Point): void {
  stop();
  if (selectedNote) {
    setNote(game, target, selectedNote === 'erase' ? undefined : selectedNote);
    reportNote(target);
    return;
  }
  if (inspectCorpse(game, target)) {
    status.textContent = `Corpse clue: ${numberAt(game, target)}. Tap again to walk here.`;
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
  status.textContent = tileAt(game, target)?.revealed
    ? 'Walking…'
    : 'Walking to the edge. Tap again beside the hidden tile to enter.';
}
function pointFromPointer(event: PointerEvent | MouseEvent): Point | undefined {
  const bounds = canvas.getBoundingClientRect();
  const point = {
    x: Math.floor(((event.clientX - bounds.left) / bounds.width) * game.width),
    y: Math.floor(((event.clientY - bounds.top) / bounds.height) * game.height),
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
  if (current && !current.consumed) activate(current.point);
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
  noteMode.textContent =
    selectedNote === null
      ? 'Tap to move'
      : selectedNote === 'erase'
        ? 'Tap to erase'
        : selectedNote === 'danger'
          ? 'Mark danger'
          : `Mark level ${selectedNote}`;
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
  }
});
element('#help').addEventListener('click', () => openDialog('#help-dialog'));
element('#restart').addEventListener('click', () => openDialog('#restart-dialog'));
for (const button of document.querySelectorAll('[data-close]'))
  button.addEventListener('click', () => button.closest('dialog')?.close());
element('#confirm-restart').addEventListener('click', () => {
  stop();
  cancelPress();
  game = createGame(map);
  effects = [];
  flash = undefined;
  selectNote(null);
  updateHud();
  status.textContent = 'Numbers sum nearby levels. Notes mark suspected monsters.';
  element<HTMLDialogElement>('#restart-dialog').close();
});
function frame(time: number): void {
  if (path.length && time - lastWalk >= 75) {
    const next = path.shift();
    if (next && !move(next)) path = [];
    lastWalk = time;
  }
  effects = effects.filter((effect) => time - effect.started < 1100);
  if (time > flashUntil) flash = undefined;
  draw(canvas, game, { path, flash, effects, time });
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
