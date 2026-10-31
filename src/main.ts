import './style.css';
import {
  canNote,
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
import { cameraTarget, draw, type Effect, effectDuration, layout } from './render';

const app = element<HTMLElement>('#app');
const levelNotes = [1, 2, 3, 4, 5] as const;
const noteTools = [...levelNotes, 'danger', 'erase'] as const;
app.innerHTML = `
  <canvas tabindex="0" aria-label="Game board. Move with arrow keys or WASD. Use Q, E, Z, C for diagonals." aria-describedby="status"></canvas>
  <section aria-label="Player stats" class="stats hud">
    <div class="health" id="hearts" role="img"></div>
    <div class="stat-row">
      <div class="stat" id="power" aria-label="Power"><span class="stat-icon" aria-hidden="true">⚔</span><span id="power-value">1</span></div>
      <div class="stat" id="xp" aria-label="Experience"><span class="stat-icon" aria-hidden="true">✦</span><span id="xp-value">0/10</span></div>
    </div>
  </section>
  <button class="menu-button hud" id="menu" aria-label="Menu">☰</button>
  <section class="notes hud" aria-label="Tile notes">
    ${noteTools.map((note) => `<button class="note-button" data-note="${note}" aria-label="${note === 'erase' ? 'Erase notes' : note === 'danger' ? 'Mark danger' : `Mark level ${note}`}" aria-pressed="false">${note === 'danger' ? '!' : note === 'erase' ? '⌫' : note}</button>`).join('')}
  </section>
  <p id="status" class="visually-hidden" role="status" aria-live="polite"></p>
  <dialog id="menu-dialog"><h2>How to play</h2><ul>
    <li>Tap a neighboring tile to move or fight. Numbers sum the levels of living monsters in the eight neighboring tiles.</li>
    <li>A zero opens its whole connected empty area and the numbers around it. Monsters stay hidden until you try their tile.</li>
    <li>Tap a distant tile to walk over known ground. Tap again when next to hidden ground to enter it.</li>
    <li>Choose a note, then tap a hidden tile to mark it. Number keys 1–5 mark the tile under the mouse, or pick that note. Hold Shift to keep marking. Mark a tile with the same note again to clear it. Hold or right-click a tile to cycle 1–5.</li>
    <li>You always win a fight. A monster above your power hits you first: its level times the levels it has over you. Running out of hearts ends the run.</li>
    <li>Each kill earns XP equal to the monster's level. Power rises at 10 and 26 XP. Defeat the crowned chief to win.</li>
    <li>Move with WASD or arrows. Hold two directions, or use Q / E / Z / C, for diagonals. Escape stops walking and clears the note tool.</li>
  </ul>
  <div class="bestiary" aria-label="Monster levels"><span class="slime-key">1 · Slime</span><span class="bat-key">2 · Bat</span><span class="goblin-key">3 · Goblin</span><span class="goblin-key">4 · Chief</span></div>
  <div class="dialog-actions"><button class="secondary" data-restart>Start over</button><button data-close>Resume</button></div></dialog>
  <dialog id="win-dialog"><h2>Goblin chief defeated</h2><p>Power <span id="win-power">3</span>, <span id="win-health">10</span> hearts left.</p><div class="dialog-actions"><button id="next-map">Next clearing</button></div></dialog>
  <dialog id="death-dialog"><h2>Game over</h2><div class="dialog-actions"><button data-restart>Start over</button></div></dialog>
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
let mapIndex = 0;
let game = createGame(maps[mapIndex]);
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
  }
});
element('#menu').addEventListener('click', () => openDialog('#menu-dialog'));
for (const button of document.querySelectorAll('[data-close]'))
  button.addEventListener('click', () => button.closest('dialog')?.close());
function restart(): void {
  stop();
  cancelPress();
  game = createGame(maps[mapIndex]);
  camera = settledCamera();
  effects = [];
  flash = undefined;
  selectNote(null);
  updateHud();
  status.textContent = '';
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
requestAnimationFrame(frame);
