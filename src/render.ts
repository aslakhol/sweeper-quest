import { type Game, type Monster, numberAt, type Point, same } from './game/game';

export const TILE_SIZE = 48;
export type Effect = {
  kind: 'hit' | 'damage' | 'coins' | 'shard';
  at: Point;
  text: string;
  color: string;
  started: number;
};
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

function drawMonster(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  clue: number,
  x: number,
  y: number,
) {
  const rows = monsterSprites[monster.kind];
  ctx.save();
  ctx.translate(x + 24, y + 23);
  if (!monster.alive) {
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.8;
  }
  sprite(
    ctx,
    rows,
    {
      g: monsterColors[monster.kind][monster.alive ? 'alive' : 'dead'],
      d: monster.alive ? '#23352c' : '#303831',
      l: monster.alive ? '#e7e8b9' : '#c8c8bb',
      h: monster.alive ? '#6e945d' : '#818879',
      r: monster.alive ? '#f08e75' : '#b9a39d',
      b: monster.alive ? '#86694f' : '#8e877d',
    },
    -13.5,
    -rows.length * 1.5,
  );
  ctx.restore();
  ctx.fillStyle = '#efd4a0';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(String(clue), x + 40, y + 39);
  if (monster.goal) {
    ctx.fillStyle = monster.alive ? '#e1bf76' : '#b3ab96';
    ctx.fillRect(x + 17, y + 3, 15, 3);
    ctx.fillRect(x + 17, y, 3, 5);
    ctx.fillRect(x + 23, y, 3, 5);
    ctx.fillRect(x + 29, y, 3, 5);
  }
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
    if (same(tile, game.start)) {
      ctx.strokeStyle = '#76896a';
      ctx.beginPath();
      ctx.arc(x + 24, y + 25, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#667a59';
      ctx.fillRect(x + 22, y + 12, 4, 5);
    }
    if (tile.monster) {
      if (tile.monster.alive || !tile.showCorpseClue) {
        drawMonster(ctx, tile.monster, numberAt(game, tile), x, y);
      }
      if (!tile.monster.alive && !tile.monster.looted) {
        ctx.fillStyle = '#eac777';
        ctx.fillRect(x + 6, y + 34, 7, 9);
        ctx.fillStyle = '#fff0b8';
        ctx.fillRect(x + 7, y + 35, 2, 5);
      }
      if (tile.monster.alive || !tile.showCorpseClue) continue;
    }
    if (tile.shards) {
      sprite(
        ctx,
        ['    s ', '   ss ', '  sss ', ' sss  ', 'bss   ', 'bb    ', ' b    '],
        { s: '#d4ece2', b: '#d3b572' },
        x + 14,
        y + 9,
        4,
      );
      ctx.fillStyle = '#efd4a0';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`+${tile.shards}`, x + 37, y + 39);
    } else if (!same(tile, game.player)) {
      const number = numberAt(game, tile);
      ctx.fillStyle = colors[Math.min(number, 5)];
      ctx.font = `${number ? '600' : '400'} ${number ? 20 : 14}px monospace`;
      ctx.fillText(String(number), x + 24, y + 25);
    }
  }
  for (const point of view.path) {
    ctx.fillStyle = '#d3b97888';
    ctx.beginPath();
    ctx.arc(point.x * TILE_SIZE + 24, point.y * TILE_SIZE + 24, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const px = game.player.x * TILE_SIZE;
  const py = game.player.y * TILE_SIZE;
  ctx.strokeStyle = '#d6c28a';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, 44, 44);
  sprite(
    ctx,
    hero,
    { g: '#adc984', f: '#e3c399', d: '#29362a', b: '#678879', s: '#e4e7c8', t: '#b99a65' },
    px + 10,
    py + 4,
  );
  ctx.fillStyle = '#e7d6a5';
  ctx.fillRect(px + 32, py + 31, 15, 16);
  ctx.fillStyle = '#26372d';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(String(numberAt(game, game.player)), px + 39.5, py + 39.5);
  if (view.flash) {
    ctx.fillStyle = '#e4867577';
    ctx.fillRect(view.flash.x * TILE_SIZE + 1, view.flash.y * TILE_SIZE + 1, 46, 46);
  }
  for (const effect of view.effects) {
    const progress = (view.time - effect.started) / 1100;
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
