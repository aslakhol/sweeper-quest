import { type Game, type Monster, numberAt, type Point, same } from './game/game';

export const TILE_SIZE = 48;
export type Effect =
  | { kind: 'text'; at: Point; text: string; color: string; started: number }
  | { kind: 'fight'; from: Point; at: Point; monster: Monster; started: number }
  | { kind: 'pulse'; at: Point; started: number };
export const effectDuration = { text: 1100, fight: 420, pulse: 700 } as const;
// Fight timeline: the hero lunges and the monster flashes, then it pops and the hero steps in.
const hitEnd = 200;
const popEnd = 340;
const stepStart = 260;
export type View = { path: Point[]; flash?: Point; effects: Effect[]; time: number };
const colors = ['#687b73', '#88c8b1', '#e2c477', '#ed9b78', '#ce9bdb', '#ed7382'];

function sprite(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: Record<string, string>,
  x: number,
  y: number,
  scale = 3,
) {
  rows.forEach((row, iy) => {
    [...row].forEach((pixel, ix) => {
      if (palette[pixel]) {
        ctx.fillStyle = palette[pixel];
        ctx.fillRect(Math.round(x + ix * scale), Math.round(y + iy * scale), scale, scale);
      }
    });
  });
}
const hero = [
  '   ggg   ',
  '  ggggg  ',
  ' ggggggg ',
  '  fffdf  ',
  '  fffdf  ',
  '   fff   ',
  ' bbgbb s ',
  ' bgggb s ',
  '  ggg  s ',
  '  bbbsst ',
  '  b b  t ',
  '  d d    ',
];
const slime = [
  '   ggg   ',
  ' ggggggg ',
  'ggggggggg',
  'ggdgggdgg',
  'gglggglgg',
  ' ggggggg ',
  '  hhhhh  ',
];
const goblin = [
  ' g     g ',
  ' ggggggg ',
  'ggggggggg',
  ' gdrdrdg ',
  ' ggggggg ',
  '  gddd   ',
  '  bbbbb  ',
  ' bbbbbbb ',
  '  b b    ',
];

const bat = [
  'g       g',
  'gg g g gg',
  'ggggggggg',
  ' ggdrdgg ',
  '  ggggg  ',
  '   ggg   ',
  '   d d   ',
];
const monsterSprites = { slime, bat, goblin };
const monsterColors = {
  slime: { alive: '#a5c97c', dead: '#9da793' },
  bat: { alive: '#bca3df', dead: '#aaa2b4' },
  goblin: { alive: '#d3ae79', dead: '#b0a394' },
};

const white = { g: '#fff', d: '#fff', l: '#fff', h: '#fff', r: '#fff', b: '#fff' };

function drawMonster(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  x: number,
  y: number,
  { remains = false, flash = false, scale = 1, alpha = 1 } = {},
) {
  const rows = monsterSprites[monster.kind];
  ctx.save();
  ctx.translate(x + 24, y + 23);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  if (remains) {
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.22;
  }
  const state = remains ? 'dead' : 'alive';
  sprite(
    ctx,
    rows,
    flash
      ? white
      : {
          g: monsterColors[monster.kind][state],
          d: remains ? '#303831' : '#23352c',
          l: remains ? '#c8c8bb' : '#e7e8b9',
          h: remains ? '#818879' : '#6e945d',
          r: remains ? '#b9a39d' : '#f08e75',
          b: remains ? '#8e877d' : '#86694f',
        },
    -13.5,
    -rows.length * 1.5,
  );
  if (monster.goal) {
    ctx.fillStyle = remains ? '#b3ab96' : '#e1bf76';
    ctx.fillRect(-7, -20, 15, 3);
    ctx.fillRect(-7, -23, 3, 5);
    ctx.fillRect(-1, -23, 3, 5);
    ctx.fillRect(5, -23, 3, 5);
  }
  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number) {
  sprite(
    ctx,
    hero,
    { g: '#adc984', f: '#e3c399', d: '#29362a', b: '#678879', s: '#e4e7c8', t: '#b99a65' },
    x + 15,
    y + 23,
    2,
  );
}

export function draw(canvas: HTMLCanvasElement, game: Game, view: View): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const width = game.width * TILE_SIZE;
  const height = game.height * TILE_SIZE;
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.aspectRatio = `${game.width} / ${game.height}`;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const tile of game.tiles) {
    const x = tile.x * TILE_SIZE;
    const y = tile.y * TILE_SIZE;
    ctx.fillStyle = '#16231f';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    if (tile.terrain === 'wall') {
      ctx.fillStyle = '#293b32';
      ctx.fillRect(x + 2, y + 2, 44, 44);
      ctx.fillStyle = '#354b3c';
      ctx.fillRect(x + 4, y + 3, 40, 4);
      ctx.fillStyle = '#213228';
      ctx.fillRect(x + 4, y + 25, 40, 2);
      ctx.fillRect(x + 23, y + 4, 2, 21);
      ctx.fillStyle = '#4b6140';
      if ((tile.x * 7 + tile.y) % 3 === 0) {
        ctx.fillRect(x + 6, y + 5, 10, 3);
        ctx.fillRect(x + 6, y + 8, 4, 5);
      }
      continue;
    }
    if (tile.terrain === 'water') {
      ctx.fillStyle = '#315c68';
      ctx.fillRect(x + 1, y + 1, 46, 46);
      ctx.fillStyle = '#568a8d';
      ctx.fillRect(x + 10, y + 22, 20, 2);
      continue;
    }
    ctx.fillStyle = tile.revealed ? ((tile.x + tile.y) % 2 ? '#31443b' : '#34473e') : '#202f29';
    ctx.fillRect(x + 1, y + 1, 46, 46);
    if (!tile.revealed) {
      ctx.fillStyle = '#304137';
      ctx.fillRect(x + 14 + (tile.y % 3) * 5, y + 22, 2, 5);
      ctx.fillRect(x + 17 + (tile.y % 3) * 5, y + 20, 2, 6);
      if (tile.note) {
        ctx.strokeStyle = '#bba577';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 12, y + 11, 24, 27);
        ctx.fillStyle = '#e8ce95';
        ctx.font = '600 19px monospace';
        ctx.fillText(tile.note === 'danger' ? '!' : String(tile.note), x + 24, y + 25);
      }
      continue;
    }
    if (tile.monster?.alive) {
      drawMonster(ctx, tile.monster, x, y);
      if (tile.monster.level > game.power) {
        ctx.strokeStyle = '#e4867599';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, 42, 42);
      }
      continue;
    }
    if (tile.monster) drawMonster(ctx, tile.monster, x, y, { remains: true });
    const number = numberAt(game, tile);
    if (number) {
      ctx.fillStyle = colors[Math.min(number, 5)];
      ctx.font = '600 20px monospace';
      // The player's own clue sits above the hero.
      ctx.fillText(String(number), x + 24, same(tile, game.player) ? y + 13 : y + 25);
    }
  }
  for (const point of view.path) {
    ctx.fillStyle = '#d3b97888';
    ctx.beginPath();
    ctx.arc(point.x * TILE_SIZE + 24, point.y * TILE_SIZE + 24, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const fight = view.effects.find((effect) => effect.kind === 'fight');
  const px = game.player.x * TILE_SIZE;
  const py = game.player.y * TILE_SIZE;
  if (fight) {
    const t = view.time - fight.started;
    const fx = fight.from.x * TILE_SIZE;
    const fy = fight.from.y * TILE_SIZE;
    const ax = fight.at.x * TILE_SIZE;
    const ay = fight.at.y * TILE_SIZE;
    if (t < hitEnd) {
      const shake = t > 80 ? Math.sin(t / 8) * 2 : 0;
      drawMonster(ctx, fight.monster, ax + shake, ay, { flash: t > 80 && t < 160 });
    } else if (t < popEnd) {
      const pop = (t - hitEnd) / (popEnd - hitEnd);
      drawMonster(ctx, fight.monster, ax, ay, { scale: 1 + pop * 0.6, alpha: 1 - pop });
    }
    const reach = t < hitEnd ? 0.4 * Math.sin((Math.PI * t) / hitEnd) : 0;
    const enter = Math.min(1, Math.max(0, (t - stepStart) / (effectDuration.fight - stepStart)));
    const along = Math.max(reach, enter);
    drawHero(ctx, fx + (ax - fx) * along, fy + (ay - fy) * along);
  } else {
    drawHero(ctx, px, py);
  }
  if (view.flash) {
    ctx.fillStyle = '#e4867577';
    ctx.fillRect(view.flash.x * TILE_SIZE + 1, view.flash.y * TILE_SIZE + 1, 46, 46);
  }
  for (const effect of view.effects) {
    const progress = (view.time - effect.started) / effectDuration[effect.kind];
    if (effect.kind === 'pulse') {
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.strokeStyle = '#f3d794';
      ctx.lineWidth = 2;
      const inset = 2 + progress * 6;
      ctx.strokeRect(
        effect.at.x * TILE_SIZE + inset,
        effect.at.y * TILE_SIZE + inset,
        TILE_SIZE - inset * 2,
        TILE_SIZE - inset * 2,
      );
    }
    if (effect.kind !== 'text') continue;
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.font = 'bold 15px monospace';
    ctx.strokeStyle = '#16231f';
    ctx.lineWidth = 4;
    const x = effect.at.x * TILE_SIZE + 24;
    const y = effect.at.y * TILE_SIZE + 8 - progress * 25;
    ctx.strokeText(effect.text, x, y);
    ctx.fillStyle = effect.color;
    ctx.fillText(effect.text, x, y);
  }
  ctx.globalAlpha = 1;
}
