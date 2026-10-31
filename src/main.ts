import './style.css';
import {
  createGame,
  cycleNote,
  distance,
  type GameEvent,
  type Note,
  neighbors,
  numberAt,
  type Point,
  planWalk,
  powerThresholds,
  same,
  setNote,
  step,
  tileAt,
  toggleNote,
} from './game/game';
import { maps } from './maps';
import { draw, type Effect, effectDuration } from './render';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing app element.');
const noteTools = [1, 2, 3, 4, 5, 'danger', 'erase'] as const;
app.innerHTML = `
  <header><div><div class="eyebrow">Field test · 02</div><h1>Sweeper Quest</h1></div><button class="help-button" id="help" aria-label="How to play">?</button></header>
  <section aria-label="Player stats" class="stats">
    <div class="health" id="hearts" role="img"></div>
    <div class="stat" id="power" aria-label="Power"><span class="stat-icon" aria-hidden="true">⚔</span><span id="power-value">1</span></div>
    <div class="stat" id="xp" aria-label="Experience"><span class="stat-icon" aria-hidden="true">✦</span><span id="xp-value">0/10</span></div>
  </section>
  <div class="board-top"><span id="map-name">Clearing 1</span></div>
  <div class="board-wrap"><canvas tabindex="0" aria-label="Game board. Move with arrow keys or WASD. Use Q, E, Z, C for diagonals." aria-describedby="status"></canvas></div>
  <section class="notes" aria-label="Tile notes">
    <div class="notes-heading"><span>Mark a tile</span><span id="note-mode">Tap to move</span></div>
    <div class="note-buttons">
      ${noteTools.map((note) => `<button class="note-button" data-note="${note}" aria-label="${note === 'erase' ? 'Erase notes' : note === 'danger' ? 'Mark danger' : `Mark level ${note}`}" aria-pressed="false">${note === 'danger' ? '!' : note === 'erase' ? '⌫' : note}</button>`).join('')}
    </div>
  </section>
  <div class="bestiary" aria-label="Monster levels"><span class="slime-key">1 · Slime</span><span class="bat-key">2 · Bat</span><span class="goblin-key">3 · Goblin</span><span class="goblin-key">4 · Chief</span></div>
  <div class="objective"><span class="objective-icon" aria-hidden="true">◇</span><div><div class="objective-label">Your quest</div><div id="objective">Defeat the goblin chief</div></div></div>
  <p id="status" role="status" aria-live="polite">Numbers sum nearby levels. Notes mark suspected monsters.</p>
  <footer><span>02 / THE CLEARING</span><button class="reset" id="restart">Start over ↻</button></footer>
  <dialog id="help-dialog"><h2>How to play</h2><ul>
    <li>Tap a neighboring tile to move or fight. Numbers sum the levels of living monsters in the eight neighboring tiles.</li>
    <li>A zero opens its whole connected empty area and the numbers around it. Monsters stay hidden until you try their tile.</li>
    <li>Tap a distant tile to walk over known ground. Tap again when next to hidden ground to enter it.</li>
    <li>Choose a note, then tap a hidden tile to mark it. Hold Shift to keep marking. Mark a tile with the same note again to clear it. Hold or right-click a tile to cycle 1–5.</li>
    <li>You always win a fight. A monster above your power hits you first: its level times the levels it has over you. Running out of hearts ends the run.</li>
    <li>Each kill earns XP equal to the monster's level. Power rises at 10 and 26 XP. The crowned chief is level 4.</li>
    <li>Move with WASD or arrows. Hold two directions, or use Q / E / Z / C, for diagonals. Escape stops walking and clears the note tool.</li>
  </ul><button data-close>Back to the clearing</button></dialog>
  <dialog id="win-dialog"><div class="eyebrow">Quest complete</div><h2>Goblin chief defeated</h2><p>Power <span id="win-power">3</span>, <span id="win-health">10</span> hearts left.</p><div class="dialog-actions"><button id="next-map">Next clearing</button></div></dialog>
  <dialog id="death-dialog"><div class="eyebrow">Game over</div><h2>You fell in the clearing</h2><div class="dialog-actions"><button data-restart>Start over</button></div></dialog>
  <dialog id="restart-dialog"><h2>Start a new quest?</h2><p>This clears your power and explored tiles.</p><div class="dialog-actions"><button class="secondary" data-close>Keep playing</button><button data-restart>Start over</button></div></dialog>
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
const objective = element<HTMLDivElement>('#objective');
const noteMode = element<HTMLSpanElement>('#note-mode');
const noteButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-note]')];
let mapIndex = 0;
let game = createGame(maps[mapIndex]);
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
    { length: game.maxHealth },
    (_, i) => `<span class="heart${i < game.health ? ' full' : ''}" aria-hidden="true">♥</span>`,
  ).join('');
  hearts.setAttribute('aria-label', `${game.health} of ${game.maxHealth} hearts`);
  power.textContent = String(game.power);
  element('#power').setAttribute('aria-label', `Power ${game.power}`);
  const next = powerThresholds[game.power];
  element('#xp-value').textContent = next === undefined ? String(game.xp) : `${game.xp}/${next}`;
  element('#xp').setAttribute(
    'aria-label',
    next === undefined ? `${game.xp} XP` : `${game.xp} of ${next} XP to the next power`,
  );
  element('#map-name').textContent = `Clearing ${mapIndex + 1} / ${maps.length}`;
  objective.textContent = game.won ? 'Goblin chief defeated' : 'Defeat the goblin chief';
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
    switch (event.type) {
      case 'fight':
        animate(event.damage ? 'hurt' : 'hit');
        if (!game.lost)
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
      case 'levelUp':
        effects.push({
          kind: 'text',
          at: event.at,
          text: `Power ${event.power}!`,
          color: '#f3d794',
          started: performance.now(),
        });
        status.textContent = `Power ${event.power}. Level ${event.power} monsters are now free to fight.`;
        break;
      case 'death':
        openDialog('#death-dialog');
        break;
      case 'win':
        element('#win-power').textContent = String(game.power);
        element('#win-health').textContent = String(game.health);
        element('#next-map').textContent =
          mapIndex === maps.length - 1 ? 'Back to clearing 1' : 'Next clearing';
        openDialog('#win-dialog');
        break;
    }
  }
  if (events.length) stop();
}
function move(target: Point): boolean {
  const before = game.player;
  // Clues already on screen around a kill drop; point them out.
  const clues = neighbors(game, target).filter((tile) => tile.revealed && tile.terrain === 'floor');
  const events = step(game, target);
  if (events.some((event) => event.type === 'fight') && !game.lost)
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
  if (current && !current.consumed) activate(current.point, event.shiftKey);
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
function restart(): void {
  stop();
  cancelPress();
  game = createGame(maps[mapIndex]);
  effects = [];
  flash = undefined;
  selectNote(null);
  updateHud();
  status.textContent = 'Numbers sum nearby levels. Notes mark suspected monsters.';
  for (const dialog of document.querySelectorAll('dialog')) dialog.close();
}
// A finished run can only start over or move on.
for (const id of ['#death-dialog', '#win-dialog'])
  element(id).addEventListener('cancel', (event) => event.preventDefault());
element('#next-map').addEventListener('click', () => {
  mapIndex = (mapIndex + 1) % maps.length;
  restart();
});
for (const button of document.querySelectorAll('[data-restart]'))
  button.addEventListener('click', restart);
function frame(time: number): void {
  if (path.length && time - lastWalk >= 75) {
    const next = path.shift();
    if (next && !move(next)) path = [];
    lastWalk = time;
  }
  effects = effects.filter((effect) => time - effect.started < effectDuration[effect.kind]);
  if (time > flashUntil) flash = undefined;
  draw(canvas, game, { path, flash, effects, time });
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
