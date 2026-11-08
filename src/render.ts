import {
  type Find,
  type Game,
  type Monster,
  numberAt,
  type Person,
  type Point,
  same,
  type Tile,
  tileAt,
} from './game/game';

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
export type View = {
  camera: Point;
  path: Point[];
  flash?: Point;
  effects: Effect[];
  time: number;
};
type Size = Pick<Game, 'width' | 'height'>;

// Screen pixels per tile: about nine tiles across the short side of the screen.
function tileSize(width: number, height: number): number {
  return Math.round(Math.min(64, Math.max(36, Math.min(width, height) / 9)));
}
// Follow the player, but stop at the map edges. A map smaller than the screen sits centered.
export function cameraTarget(map: Size, player: Point, width: number, height: number): Point {
  const tile = tileSize(width, height);
  const axis = (position: number, mapSize: number, visible: number) =>
    mapSize <= visible
      ? mapSize / 2
      : Math.min(Math.max(position + 0.5, visible / 2), mapSize - visible / 2);
  return {
    x: axis(player.x, map.width, width / tile),
    y: axis(player.y, map.height, height / tile),
  };
}
// The camera is the map position, in tiles, shown at the center of the screen.
export function layout(camera: Point, width: number, height: number) {
  const tile = tileSize(width, height);
  return { tile, left: width / 2 - camera.x * tile, top: height / 2 - camera.y * tile };
}
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
// Arms up, showing off a find.
const heroHolding = [
  ' f       f ',
  ' b  ggg  b ',
  ' b ggggg b ',
  ' bgggggggb ',
  ' b fdfdf b ',
  ' b fffff b ',
  ' bb fff bb ',
  '  bbbgbbb  ',
  '   bgggb   ',
  '   ggggg   ',
  '   bb bb   ',
  '   b   b   ',
  '   d   d   ',
];
const heroColors = {
  g: '#adc984',
  f: '#e3c399',
  d: '#29362a',
  b: '#678879',
  s: '#e4e7c8',
  t: '#b99a65',
};
const person = [
  '   hhh   ',
  '  hhhhh  ',
  '  hfffh  ',
  '  fdfdf  ',
  '  fffff  ',
  '   fff   ',
  '  sssss  ',
  ' sssssss ',
  ' fsssssf ',
  '  ppppp  ',
  '  pp pp  ',
  '  dd dd  ',
];
const whetstone = [
  '    ss  ',
  '   slls ',
  '  slllds',
  ' slllds ',
  'slllds  ',
  'dllds   ',
  ' dds    ',
];
const heartPiece = ['rrr     ', 'rlrr    ', 'rrrrr   ', ' rrrrr  ', '  rrr   ', '   r    '];
const heart = [' rr rr ', 'rlrrrrr', 'rrrrrrr', ' rrrrr ', '  rrr  ', '   r   '];
const marble = ['  bbb  ', ' bllbb ', 'bllbbbd', 'bbbbbbd', ' bbbbd ', '  ddd  '];
const spectacles = [' ff    ff ', 'fllf  fllf', 'flllfflllf', 'fllf  fllf', ' ff    ff '];
const coin = [' yyy ', 'yllyd', 'ylyyd', 'yyyyd', ' ddd '];
const ring = ['  ll  ', ' rllr ', 'r    r', 'r    r', 'r    r', ' rrrr '];
const findSprites: Record<Find, { rows: string[]; palette: Record<string, string> }> = {
  whetstone: { rows: whetstone, palette: { s: '#8c9aa0', l: '#d5dde0', d: '#566268' } },
  greatstone: { rows: whetstone, palette: { s: '#9a86c8', l: '#e2d8f6', d: '#5c4c86' } },
  heartPiece: { rows: heartPiece, palette: { r: '#e0655f', l: '#f4b5a8' } },
  heart: { rows: heart, palette: { r: '#e0655f', l: '#f4b5a8' } },
  coin: { rows: coin, palette: { y: '#e1bf76', l: '#f6e3a8', d: '#a8843e' } },
  marble: { rows: marble, palette: { b: '#7aa0d8', l: '#d8e6f4', d: '#4a6a9a' } },
  spectacles: { rows: spectacles, palette: { f: '#c9a35a', l: '#cfe3ea' } },
  ring: { rows: ring, palette: { r: '#e1bf76', l: '#9fd4e0' } },
};
const bag = {
  rows: [
    '   dddd   ',
    '    tt    ',
    '  bbbbbb  ',
    ' bbbbbbbb ',
    'bblbbbbbbd',
    'blbbbbbbbd',
    'bbbbbbbbbd',
    'bbbbbbbbbd',
    ' bbbbbbdd ',
    '  dddddd  ',
  ],
  palette: { b: '#b99a65', l: '#e4d1a0', d: '#7a6038', t: '#d7bd7e' },
};
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
  sprite(ctx, hero, heroColors, x + 15, y + 23, 2);
}

function drawFind(ctx: CanvasRenderingContext2D, find: Find, x: number, y: number, top = 22) {
  const found = findSprites[find];
  sprite(ctx, found.rows, found.palette, x + 24 - found.rows[0].length * 1.5, y + top);
}

// A sprite centered on a square image, at one image pixel per sprite pixel.
export function icon(name: Find | 'bag'): string {
  const { rows, palette } = name === 'bag' ? bag : findSprites[name];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 10;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  sprite(
    ctx,
    rows,
    palette,
    Math.floor((10 - rows[0].length) / 2),
    Math.floor((10 - rows.length) / 2),
    1,
  );
  return canvas.toDataURL();
}

// The hero holds a find up over their head, at one image pixel per sprite pixel.
export function itemGetImage(find: Find): string {
  const { rows, palette } = findSprites[find];
  const canvas = document.createElement('canvas');
  canvas.width = heroHolding[0].length;
  canvas.height = 8 + heroHolding.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  sprite(ctx, rows, palette, Math.floor((canvas.width - rows[0].length) / 2), 7 - rows.length, 1);
  sprite(ctx, heroHolding, heroColors, 0, 8, 1);
  return canvas.toDataURL();
}

function rects(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  list: number[][],
) {
  ctx.fillStyle = color;
  for (const [dx, dy, w, h] of list) ctx.fillRect(x + dx, y + dy, w, h);
}
const lawn = (tile: Point) => ((tile.x + tile.y) % 2 ? '#31443b' : '#34473e');

// Ground keeps a one-pixel grid gap for counting; buildings fill their tile to join up.
function drawGround(ctx: CanvasRenderingContext2D, game: Game, tile: Tile, x: number, y: number) {
  const joins = (dx: number, dy: number) =>
    tileAt(game, { x: tile.x + dx, y: tile.y + dy })?.look === tile.look;
  ctx.fillStyle = '#16231f';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  switch (tile.look) {
    case 'grass':
      if (tile.revealed) {
        ctx.fillStyle = lawn(tile);
        ctx.fillRect(x + 1, y + 1, 46, 46);
        return;
      }
      // Tall grass hides whatever has not been found yet.
      rects(ctx, '#21332a', x, y, [[1, 1, 46, 46]]);
      for (const [bx, by] of [
        [8 + (tile.y % 3) * 4, 30],
        [26 - (tile.x % 3) * 3, 16],
        [30, 36 - (tile.y % 2) * 6],
      ])
        rects(ctx, '#33503a', x, y, [
          [bx, by - 7, 2, 9],
          [bx - 3, by - 4, 2, 6],
          [bx + 3, by - 5, 2, 7],
        ]);
      return;
    case 'cave':
      if (tile.revealed) {
        rects(ctx, (tile.x + tile.y) % 2 ? '#3a3d37' : '#3d403a', x, y, [[1, 1, 46, 46]]);
        return;
      }
      rects(ctx, '#232723', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#30352f', x, y, [
        [9 + (tile.y % 3) * 5, 30, 7, 4],
        [27 - (tile.x % 3) * 3, 14, 6, 4],
        [31, 34 - (tile.y % 2) * 8, 5, 3],
      ]);
      return;
    case 'stairs':
      rects(ctx, '#293b32', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#0c1210', x, y, [[6, 6, 36, 36]]);
      rects(ctx, '#56614f', x, y, [
        [8, 34, 32, 4],
        [11, 26, 26, 4],
        [14, 18, 20, 4],
        [17, 10, 14, 4],
      ]);
      return;
    case 'gate':
      // A timber arch over a dark trail, so an exit through the trees reads from a distance.
      rects(ctx, '#0c1210', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#3b3528', x, y, [
        [19, 18, 10, 30],
        [15, 34, 18, 14],
      ]);
      rects(ctx, '#6f5436', x, y, [
        [4, 8, 7, 40],
        [37, 8, 7, 40],
      ]);
      rects(ctx, '#8d6e47', x, y, [[0, 3, 48, 9]]);
      rects(ctx, '#a98a5c', x, y, [[0, 3, 48, 2]]);
      rects(ctx, '#4f7d4f', x, y, [
        [12, 12, 8, 4],
        [28, 12, 7, 6],
        [6, 1, 9, 3],
        [32, 1, 10, 3],
      ]);
      return;
    case 'path':
      rects(ctx, (tile.x + tile.y) % 2 ? '#4d4535' : '#504737', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#5f5643', x, y, [
        [10 + (tile.y % 4) * 6, 12, 4, 3],
        [30 - (tile.x % 3) * 5, 32, 5, 3],
      ]);
      return;
    case 'rock':
      rects(ctx, '#293b32', x, y, [[2, 2, 44, 44]]);
      rects(ctx, '#354b3c', x, y, [[4, 3, 40, 4]]);
      rects(ctx, '#213228', x, y, [
        [4, 25, 40, 2],
        [23, 4, 2, 21],
      ]);
      if ((tile.x * 7 + tile.y) % 3 === 0)
        rects(ctx, '#4b6140', x, y, [
          [6, 5, 10, 3],
          [6, 8, 4, 5],
        ]);
      return;
    case 'water':
      rects(ctx, '#315c68', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#568a8d', x, y, [[10, 22, 20, 2]]);
      return;
    case 'tree':
      rects(ctx, lawn(tile), x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#1d2b23', x, y, [[8, 38, 32, 6]]);
      rects(ctx, '#4a3a2a', x, y, [[20, 30, 8, 12]]);
      rects(ctx, '#22402c', x, y, [
        [12, 3, 24, 4],
        [6, 7, 36, 22],
        [12, 29, 24, 4],
      ]);
      rects(ctx, '#2d5536', x, y, [
        [12, 7, 22, 16],
        [16, 23, 14, 4],
      ]);
      rects(ctx, '#3b6a40', x, y, [[14, 9, 9, 6]]);
      return;
    case 'roof':
      rects(ctx, '#7d4536', x, y, [[0, 0, 48, 48]]);
      rects(ctx, '#673629', x, y, [
        [0, 10, 48, 2],
        [0, 22, 48, 2],
        [0, 34, 48, 2],
        [tile.x % 2 ? 12 : 36, 0, 2, 10],
        [tile.x % 2 ? 36 : 12, 12, 2, 10],
        [tile.x % 2 ? 12 : 36, 24, 2, 10],
      ]);
      if (!joins(0, -1)) rects(ctx, '#9b5a45', x, y, [[0, 0, 48, 5]]);
      if (!joins(0, 1)) rects(ctx, '#4e2a22', x, y, [[0, 42, 48, 6]]);
      if (!joins(-1, 0)) rects(ctx, '#5a3027', x, y, [[0, 0, 3, 48]]);
      if (!joins(1, 0)) rects(ctx, '#5a3027', x, y, [[45, 0, 3, 48]]);
      return;
    case 'house':
    case 'door':
      rects(ctx, '#b49e77', x, y, [[0, 0, 48, 48]]);
      rects(ctx, '#a08a64', x, y, [
        [0, 12, 48, 2],
        [0, 26, 48, 2],
      ]);
      rects(ctx, '#6c5f4f', x, y, [[0, 42, 48, 6]]);
      if (tile.look === 'house') {
        rects(ctx, '#5e4a33', x, y, [[13, 13, 22, 18]]);
        rects(ctx, '#3e5f6b', x, y, [[16, 16, 16, 12]]);
        rects(ctx, '#6f95a0', x, y, [[18, 18, 4, 4]]);
        return;
      }
      rects(ctx, '#3f2c1e', x, y, [[11, 8, 26, 40]]);
      rects(ctx, '#5b3f2a', x, y, [[14, 11, 20, 37]]);
      rects(ctx, '#4b3423', x, y, [[23, 11, 2, 37]]);
      rects(ctx, '#d8b46a', x, y, [[28, 30, 3, 3]]);
      return;
    case 'wood':
      rects(ctx, (tile.x + tile.y) % 2 ? '#5c4632' : '#604934', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#4f3c2b', x, y, [
        [1, 16, 46, 1],
        [1, 32, 46, 1],
        [tile.y % 2 ? 14 : 34, 1, 1, 15],
        [tile.y % 2 ? 30 : 10, 17, 1, 15],
      ]);
      return;
    case 'interior':
    case 'mat': {
      // Walls show their face toward the room and their dark top elsewhere.
      const below = tileAt(game, { x: tile.x, y: tile.y + 1 });
      if (tile.look === 'mat' || (below && below.look !== 'interior')) {
        rects(ctx, '#8c7458', x, y, [[0, 0, 48, 48]]);
        rects(ctx, '#7a6349', x, y, [
          [0, 15, 48, 2],
          [0, 31, 48, 2],
        ]);
        rects(ctx, '#5b4836', x, y, [[0, 44, 48, 4]]);
      } else rects(ctx, '#2a211a', x, y, [[0, 0, 48, 48]]);
      if (tile.look === 'mat') {
        rects(ctx, '#31443b', x, y, [[8, 4, 32, 44]]);
        rects(ctx, '#8a3b3b', x, y, [[6, 34, 36, 14]]);
        rects(ctx, '#a85050', x, y, [[9, 37, 30, 2]]);
      }
      return;
    }
    case 'table':
      rects(ctx, '#5c4632', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#7b5636', x, y, [[joins(-1, 0) ? 0 : 4, joins(0, -1) ? 0 : 6, 48, 48]]);
      rects(ctx, '#5c4632', x, y, [
        ...(joins(1, 0) ? [] : [[44, 0, 4, 48]]),
        ...(joins(0, 1) ? [] : [[0, 40, 48, 8]]),
      ]);
      if (!joins(0, 1))
        rects(ctx, '#4a3324', x, y, [[joins(-1, 0) ? 0 : 4, 38, joins(1, 0) ? 48 : 40, 4]]);
      return;
    case 'bed':
      rects(ctx, '#5c4632', x, y, [[1, 1, 46, 46]]);
      rects(ctx, '#6e4a2e', x, y, [[joins(-1, 0) ? 0 : 3, 6, joins(1, 0) ? 48 : 42, 38]]);
      rects(ctx, '#5a7a9a', x, y, [[joins(-1, 0) ? 0 : 6, 9, joins(1, 0) ? 48 : 36, 32]]);
      if (!joins(-1, 0)) rects(ctx, '#e3dccb', x, y, [[8, 12, 14, 26]]);
      return;
    case 'shelf':
      rects(ctx, '#3f2c1e', x, y, [[2, 0, 44, 46]]);
      for (const [index, row] of [6, 20, 34].entries())
        for (let book = 0; book < 5; book++)
          rects(
            ctx,
            ['#8a3b3b', '#4d6b8a', '#7a8a4d', '#a08050'][(book + index + tile.x) % 4],
            x,
            y,
            [[6 + book * 7, row, 5, 10]],
          );
      return;
    case 'fence':
      rects(ctx, lawn(tile), x, y, [[1, 1, 46, 46]]);
      if (joins(-1, 0))
        rects(ctx, '#7a5e3e', x, y, [
          [0, 18, 24, 4],
          [0, 30, 24, 4],
        ]);
      if (joins(1, 0))
        rects(ctx, '#7a5e3e', x, y, [
          [24, 18, 24, 4],
          [24, 30, 24, 4],
        ]);
      if (joins(0, -1)) rects(ctx, '#7a5e3e', x, y, [[22, 0, 4, 24]]);
      if (joins(0, 1)) rects(ctx, '#7a5e3e', x, y, [[22, 24, 4, 24]]);
      rects(ctx, '#9c7a50', x, y, [[19, 12, 10, 28]]);
      rects(ctx, '#b8956a', x, y, [[19, 12, 10, 3]]);
      return;
  }
}

function drawPerson(ctx: CanvasRenderingContext2D, { colors }: Person, x: number, y: number) {
  sprite(
    ctx,
    person,
    { h: colors.hair, f: '#e3c399', d: '#29362a', s: colors.shirt, p: '#4a4a5a' },
    x + 15,
    y + 12,
    2,
  );
}

export function draw(canvas: HTMLCanvasElement, game: Game, view: View): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#101a17';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const { tile: size, left, top } = layout(view.camera, width, height);
  const scale = (size / TILE_SIZE) * ratio;
  // Whole device pixels keep tile edges crisp while the camera glides.
  ctx.setTransform(scale, 0, 0, scale, Math.round(left * ratio), Math.round(top * ratio));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const visible = (point: Point) =>
    left + (point.x + 1) * size > 0 &&
    left + point.x * size < width &&
    top + (point.y + 1) * size > 0 &&
    top + point.y * size < height;
  for (const tile of game.tiles) {
    if (!visible(tile)) continue;
    const x = tile.x * TILE_SIZE;
    const y = tile.y * TILE_SIZE;
    drawGround(ctx, game, tile, x, y);
    if (tile.terrain !== 'floor') {
      // Wares sit on the tabletop, above its front edge.
      if (tile.find && tile.price !== undefined) drawFind(ctx, tile.find, x, y, 12);
      continue;
    }
    if (tile.person) {
      drawPerson(ctx, tile.person, x, y);
      continue;
    }
    if (!tile.revealed) {
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
      if (tile.monster.level > game.hero.power) {
        ctx.strokeStyle = '#e4867599';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, 42, 42);
      }
      continue;
    }
    if (tile.monster) drawMonster(ctx, tile.monster, x, y, { remains: true });
    if (tile.find) drawFind(ctx, tile.find, x, y);
    const number = numberAt(game, tile);
    if (number) {
      ctx.fillStyle = colors[Math.min(number, 5)];
      ctx.font = '600 20px monospace';
      // A clue sits above the hero or a find on its tile.
      const raised = same(tile, game.player) || tile.find;
      ctx.fillText(String(number), x + 24, raised ? y + 13 : y + 25);
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
    // Text can be queued to start later.
    if (effect.kind !== 'text' || progress < 0) continue;
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
