import {
  type Building,
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
  | { kind: 'shake'; at: Point; started: number }
  | { kind: 'pulse'; at: Point; started: number };
export const effectDuration = { text: 1100, fight: 420, shake: 280, pulse: 700 } as const;
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
const heroColors = { g: '#adc984', f: '#e3c399', d: '#29362a', b: '#678879' };
const swordColors = { s: '#e4e7c8', t: '#b99a65' };
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
const sword = ['  s  ', '  s  ', '  s  ', '  s  ', 'ttttt', '  h  ', '  h  '];
// A rolled certificate tied with a ribbon.
const diploma = [
  ' pppppp ',
  'pllllllp',
  ' ldddll ',
  ' llllll ',
  ' lddlrl ',
  'pllllrrp',
  ' pppprp ',
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
  sword: { rows: sword, palette: { ...swordColors, h: '#7a6038' } },
  diploma: {
    rows: diploma,
    palette: { p: '#c9a86a', l: '#f2e6c4', d: '#9a8a6a', r: '#c0504a' },
  },
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

// The hero only carries a sword once Doctor Madeleine has handed one over.
function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, armed: boolean) {
  sprite(ctx, hero, armed ? { ...heroColors, ...swordColors } : heroColors, x + 15, y + 23, 2);
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

// Each building has its own roof, walls, floor and furnishings, inside and out.
type Palette = { base: string; line: string; top: string; foot: string };
const roofs: Record<Building, Palette & { side: string }> = {
  cottage: { base: '#a3834b', line: '#86683a', top: '#c1a165', foot: '#5f4a28', side: '#7a5f33' },
  hall: { base: '#55606c', line: '#434c57', top: '#7c8896', foot: '#333a43', side: '#3d454f' },
  inn: { base: '#7d4536', line: '#673629', top: '#9b5a45', foot: '#4e2a22', side: '#5a3027' },
  shop: { base: '#4d6b4c', line: '#3d573c', top: '#6b8a64', foot: '#2f432f', side: '#364b35' },
  dojo: { base: '#3b3d44', line: '#2c2e34', top: '#5a5d66', foot: '#8a3a2c', side: '#2a2c31' },
};
// Outside walls, and the face of inside walls seen from the room.
const walls: Record<Building, Palette> = {
  cottage: { base: '#d9cfb6', line: '#c4b99d', top: '#e8e0ca', foot: '#7d7260' },
  hall: { base: '#8f8b80', line: '#76726a', top: '#a29e93', foot: '#5c5952' },
  inn: { base: '#d3c094', line: '#4a3424', top: '#e0d0a8', foot: '#5b4a38' },
  shop: { base: '#9c7c52', line: '#866843', top: '#b08e62', foot: '#5e4a33' },
  dojo: { base: '#e6dfcb', line: '#3e2c22', top: '#f2ecdc', foot: '#3e2c22' },
};
const rooms: Record<Building, Palette> = {
  cottage: { base: '#b9a07a', line: '#a48b66', top: '#8a6e4c', foot: '#6e5a42' },
  hall: { base: '#5e4634', line: '#4b3727', top: '#6e5440', foot: '#3a2a1e' },
  inn: { base: '#c8b48a', line: '#4a3424', top: '#b39f76', foot: '#4a3424' },
  shop: { base: '#9a7d58', line: '#856a48', top: '#a88a62', foot: '#5e4a33' },
  dojo: { base: '#e6dfcb', line: '#7a5a3e', top: '#f2ecdc', foot: '#4a3626' },
};
const floors: Record<Building, Palette> = {
  cottage: { base: '#5c4632', line: '#4f3c2b', top: '#604934', foot: '#4f3c2b' },
  hall: { base: '#4f4c45', line: '#3e3c36', top: '#54514a', foot: '#3e3c36' },
  inn: { base: '#6a5034', line: '#55402a', top: '#6e5437', foot: '#55402a' },
  shop: { base: '#7d6a4c', line: '#6a583e', top: '#806d4f', foot: '#6a583e' },
  dojo: { base: '#a39b66', line: '#545b3a', top: '#b0a873', foot: '#8e8758' },
};

function drawFloor(
  ctx: CanvasRenderingContext2D,
  building: Building,
  tile: Tile,
  x: number,
  y: number,
) {
  const { base, line, top, foot } = floors[building];
  const odd = (tile.x + tile.y) % 2 === 1;
  switch (building) {
    case 'hall':
      // Flagstones.
      rects(ctx, odd ? top : base, x, y, [[1, 1, 46, 46]]);
      rects(ctx, line, x, y, [
        [1, 23, 46, 2],
        [odd ? 16 : 30, 1, 2, 22],
        [odd ? 34 : 12, 25, 2, 22],
      ]);
      return;
    case 'dojo': {
      // Mats two tiles long, laid in a brick pattern, edged with dark cloth.
      rects(ctx, base, x, y, [[1, 1, 46, 46]]);
      for (let stripe = 6; stripe < 46; stripe += 6) rects(ctx, top, x, y, [[stripe, 3, 1, 42]]);
      rects(ctx, foot, x, y, [[1, 23, 46, 1]]);
      rects(ctx, line, x, y, [[1, 1, 46, 3], [1, 44, 46, 3], odd ? [44, 1, 3, 46] : [1, 1, 3, 46]]);
      return;
    }
    default: {
      // Boards; the inn's are wide and the shop's narrow.
      const rows = building === 'inn' ? [24] : building === 'shop' ? [12, 24, 36] : [16, 32];
      rects(ctx, odd ? top : base, x, y, [[1, 1, 46, 46]]);
      rects(
        ctx,
        line,
        x,
        y,
        rows.map((row) => [1, row, 46, 1]),
      );
      [1, ...rows].forEach((row, index, all) => {
        const end = all[index + 1] ?? 47;
        const joint = (tile.y + index) % 2 ? 14 : 34;
        rects(ctx, foot, x, y, [[joint, row, 1, end - row]]);
      });
    }
  }
}

function drawRoof(
  ctx: CanvasRenderingContext2D,
  building: Building,
  x: number,
  y: number,
  joins: (dx: number, dy: number) => boolean,
  odd: boolean,
) {
  const { base, line, top, foot, side } = roofs[building];
  rects(ctx, base, x, y, [[0, 0, 48, 48]]);
  switch (building) {
    case 'cottage':
      // Thatch, in staggered tufts.
      for (let row = 0; row < 48; row += 8)
        for (let column = row % 16 ? 4 : 0; column < 48; column += 8)
          rects(ctx, line, x, y, [[column, row + 2, 2, 6]]);
      break;
    case 'hall':
      // Small slates.
      for (let row = 0; row < 48; row += 8) {
        rects(ctx, line, x, y, [[0, row + 6, 48, 2]]);
        for (let column = row % 16 ? 4 : 10; column < 48; column += 12)
          rects(ctx, line, x, y, [[column, row, 1, 6]]);
      }
      break;
    case 'inn':
      rects(ctx, line, x, y, [
        [0, 10, 48, 2],
        [0, 22, 48, 2],
        [0, 34, 48, 2],
        [odd ? 12 : 36, 0, 2, 10],
        [odd ? 36 : 12, 12, 2, 10],
        [odd ? 12 : 36, 24, 2, 10],
      ]);
      break;
    case 'shop':
      // Standing seams.
      rects(
        ctx,
        line,
        x,
        y,
        [0, 1, 2, 3, 4, 5].map((seam) => [seam * 8 + 3, 0, 2, 48]),
      );
      rects(
        ctx,
        top,
        x,
        y,
        [0, 1, 2, 3, 4, 5].map((seam) => [seam * 8 + 3, 0, 1, 48]),
      );
      break;
    case 'dojo':
      // Rows of round tiles.
      for (let row = 0; row < 48; row += 6) {
        rects(ctx, line, x, y, [[0, row + 4, 48, 2]]);
        for (let column = 2; column < 48; column += 6) rects(ctx, top, x, y, [[column, row, 2, 4]]);
      }
      break;
  }
  if (!joins(0, -1)) rects(ctx, top, x, y, [[0, 0, 48, 5]]);
  if (!joins(-1, 0)) rects(ctx, side, x, y, [[0, 0, 3, 48]]);
  if (!joins(1, 0)) rects(ctx, side, x, y, [[45, 0, 3, 48]]);
  if (!joins(0, 1)) rects(ctx, foot, x, y, [[0, 42, 48, 6]]);
  if (building === 'dojo' && !joins(0, 1)) {
    // Eaves that sweep up at the corners.
    rects(ctx, '#b0503c', x, y, [[0, 42, 48, 1]]);
    if (!joins(-1, 0))
      rects(ctx, foot, x, y, [
        [0, 34, 4, 8],
        [4, 38, 4, 4],
      ]);
    if (!joins(1, 0))
      rects(ctx, foot, x, y, [
        [44, 34, 4, 8],
        [40, 38, 4, 4],
      ]);
  }
  if (building === 'cottage' && !joins(0, -1) && joins(1, 0) && !joins(2, 0))
    // A chimney near the right-hand end.
    rects(ctx, '#7a7068', x, y, [
      [16, 4, 14, 20],
      [14, 2, 18, 4],
    ]);
}

// The windows, doors and signs on a building's front wall.
function drawWall(
  ctx: CanvasRenderingContext2D,
  building: Building,
  tile: Tile,
  x: number,
  y: number,
  sign: boolean,
) {
  const { base, line, top, foot } = walls[building];
  rects(ctx, base, x, y, [[0, 0, 48, 48]]);
  switch (building) {
    case 'cottage':
      rects(ctx, top, x, y, [[0, 0, 48, 3]]);
      rects(ctx, foot, x, y, [[0, 40, 48, 8]]);
      rects(ctx, line, x, y, [
        [8, 40, 1, 8],
        [24, 40, 1, 8],
        [40, 40, 1, 8],
      ]);
      break;
    case 'hall':
      // Dressed stone.
      for (const [row, offset] of [
        [0, 0],
        [10, 12],
        [20, 0],
        [30, 12],
      ])
        rects(ctx, line, x, y, [
          [0, row + 9, 48, 1],
          [offset + 6, row, 1, 9],
          [offset + 30, row, 1, 9],
        ]);
      rects(ctx, foot, x, y, [[0, 40, 48, 8]]);
      break;
    case 'inn':
      // Timber framing.
      rects(ctx, line, x, y, [
        [0, 0, 48, 4],
        [0, 0, 4, 42],
        [44, 0, 4, 42],
        [0, 36, 48, 3],
      ]);
      rects(ctx, foot, x, y, [[0, 39, 48, 9]]);
      break;
    case 'shop':
      rects(
        ctx,
        line,
        x,
        y,
        [0, 1, 2, 3, 4, 5].map((board) => [board * 8 + 7, 0, 1, 42]),
      );
      rects(ctx, foot, x, y, [[0, 42, 48, 6]]);
      break;
    case 'dojo':
      rects(ctx, line, x, y, [
        [0, 0, 4, 48],
        [44, 0, 4, 48],
        [0, 0, 48, 4],
      ]);
      rects(ctx, foot, x, y, [[0, 38, 48, 10]]);
      break;
  }
  if (tile.look === 'door') return drawDoor(ctx, building, x, y);
  if (sign) return drawSign(ctx, building, x, y);
  drawWindow(ctx, building, x, y);
}

function drawWindow(ctx: CanvasRenderingContext2D, building: Building, x: number, y: number) {
  switch (building) {
    case 'cottage':
      rects(ctx, '#5e4a33', x, y, [[13, 9, 22, 20]]);
      rects(ctx, '#3e5f6b', x, y, [[16, 12, 16, 14]]);
      rects(ctx, '#5e4a33', x, y, [[23, 12, 2, 14]]);
      // A flower box.
      rects(ctx, '#4f7d4f', x, y, [[12, 27, 24, 3]]);
      rects(ctx, '#d96a6a', x, y, [
        [14, 25, 3, 3],
        [22, 24, 3, 3],
        [30, 25, 3, 3],
      ]);
      rects(ctx, '#7a5236', x, y, [[11, 30, 26, 5]]);
      return;
    case 'hall':
      // Tall arched windows.
      rects(ctx, '#4d4a44', x, y, [
        [16, 8, 16, 30],
        [18, 5, 12, 3],
      ]);
      rects(ctx, '#3e5f6b', x, y, [
        [19, 10, 10, 26],
        [21, 8, 6, 2],
      ]);
      rects(ctx, '#4d4a44', x, y, [[19, 22, 10, 2]]);
      return;
    case 'inn':
      // Warm light from inside.
      rects(ctx, '#4a3424', x, y, [[12, 9, 24, 22]]);
      rects(ctx, '#e3b862', x, y, [[15, 12, 18, 16]]);
      rects(ctx, '#4a3424', x, y, [
        [23, 12, 2, 16],
        [15, 19, 18, 2],
      ]);
      return;
    case 'shop':
      // A striped awning over a wide display window.
      rects(ctx, '#3f2c1e', x, y, [[8, 14, 32, 22]]);
      rects(ctx, '#6f95a0', x, y, [[10, 16, 28, 18]]);
      rects(ctx, '#e1bf76', x, y, [
        [14, 28, 4, 4],
        [22, 26, 6, 6],
        [31, 29, 4, 3],
      ]);
      for (let stripe = 0; stripe < 48; stripe += 8) {
        rects(ctx, '#b8483e', x, y, [[stripe, 4, 4, 9]]);
        rects(ctx, '#e8dcc0', x, y, [[stripe + 4, 4, 4, 9]]);
      }
      rects(ctx, '#7a2f28', x, y, [[0, 13, 48, 2]]);
      return;
    case 'dojo':
      // Paper screens.
      rects(ctx, '#f6f0e0', x, y, [[8, 8, 32, 28]]);
      rects(ctx, '#7a5a3e', x, y, [
        [8, 8, 32, 2],
        [8, 34, 32, 2],
        [8, 8, 2, 28],
        [38, 8, 2, 28],
        [18, 10, 1, 24],
        [29, 10, 1, 24],
        [10, 17, 28, 1],
        [10, 26, 28, 1],
      ]);
      return;
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, building: Building, x: number, y: number) {
  switch (building) {
    case 'cottage':
      rects(ctx, '#3f2c1e', x, y, [[12, 10, 24, 38]]);
      rects(ctx, '#557447', x, y, [[15, 13, 18, 35]]);
      rects(ctx, '#466139', x, y, [[15, 28, 18, 2]]);
      rects(ctx, '#d8b46a', x, y, [[28, 32, 3, 3]]);
      return;
    case 'hall':
      // Heavy double doors under an arch.
      rects(ctx, '#5c5952', x, y, [
        [9, 8, 30, 40],
        [12, 5, 24, 3],
      ]);
      rects(ctx, '#3a2a1c', x, y, [
        [12, 11, 24, 37],
        [15, 8, 18, 3],
      ]);
      rects(ctx, '#2a1e14', x, y, [[23, 8, 2, 40]]);
      rects(ctx, '#9a9890', x, y, [
        [15, 18, 2, 2],
        [31, 18, 2, 2],
        [15, 36, 2, 2],
        [31, 36, 2, 2],
        [20, 28, 2, 3],
        [26, 28, 2, 3],
      ]);
      return;
    case 'inn':
      rects(ctx, '#4a3424', x, y, [[8, 8, 32, 40]]);
      rects(ctx, '#7a5434', x, y, [[11, 11, 26, 37]]);
      rects(ctx, '#5e4028', x, y, [
        [23, 11, 2, 37],
        [11, 24, 26, 2],
      ]);
      rects(ctx, '#d8b46a', x, y, [
        [19, 30, 3, 3],
        [26, 30, 3, 3],
      ]);
      return;
    case 'shop':
      rects(ctx, '#3f2c1e', x, y, [[11, 8, 26, 40]]);
      rects(ctx, '#6a4a2e', x, y, [[14, 11, 20, 37]]);
      rects(ctx, '#6f95a0', x, y, [[17, 14, 14, 12]]);
      rects(ctx, '#d8b46a', x, y, [[29, 32, 3, 3]]);
      return;
    case 'dojo':
      // Sliding screens behind a short indigo curtain.
      rects(ctx, '#3e2c22', x, y, [[8, 4, 32, 44]]);
      rects(ctx, '#d8d0b8', x, y, [[10, 6, 28, 42]]);
      rects(ctx, '#3e2c22', x, y, [
        [23, 6, 2, 42],
        [10, 30, 28, 1],
        [10, 40, 28, 1],
      ]);
      rects(ctx, '#2f3e66', x, y, [
        [8, 4, 10, 18],
        [19, 4, 10, 18],
        [30, 4, 10, 18],
      ]);
      rects(ctx, '#e6dfcb', x, y, [[21, 10, 6, 6]]);
      return;
  }
}

// A board hanging beside the door says what is inside.
function drawSign(ctx: CanvasRenderingContext2D, building: Building, x: number, y: number) {
  if (building !== 'inn' && building !== 'shop') return drawWindow(ctx, building, x, y);
  rects(ctx, '#3f2c1e', x, y, [
    [4, 6, 30, 3],
    [12, 9, 2, 4],
    [28, 9, 2, 4],
  ]);
  rects(ctx, '#5e4028', x, y, [[6, 13, 30, 22]]);
  rects(ctx, '#8a6a44', x, y, [[8, 15, 26, 18]]);
  if (building === 'inn') {
    // A foaming mug.
    rects(ctx, '#f2ead0', x, y, [[15, 17, 10, 4]]);
    rects(ctx, '#d39a3e', x, y, [[15, 21, 10, 10]]);
    rects(ctx, '#d39a3e', x, y, [
      [25, 23, 4, 2],
      [27, 25, 2, 4],
      [25, 28, 4, 2],
    ]);
  } else {
    rects(ctx, '#e1bf76', x, y, [[15, 18, 12, 12]]);
    rects(ctx, '#a8843e', x, y, [[20, 20, 2, 8]]);
  }
}

// Inside walls show their face toward the room and their dark top elsewhere.
function drawRoomWall(ctx: CanvasRenderingContext2D, building: Building, x: number, y: number) {
  const { base, line, top, foot } = rooms[building];
  rects(ctx, base, x, y, [[0, 0, 48, 48]]);
  switch (building) {
    case 'cottage':
      // Plaster above wood panelling.
      rects(ctx, top, x, y, [[0, 26, 48, 18]]);
      rects(ctx, line, x, y, [
        [0, 25, 48, 2],
        [12, 27, 1, 17],
        [36, 27, 1, 17],
      ]);
      break;
    case 'hall':
      // Dark panelling.
      rects(ctx, top, x, y, [
        [4, 6, 16, 34],
        [28, 6, 16, 34],
      ]);
      rects(ctx, line, x, y, [
        [6, 8, 12, 30],
        [30, 8, 12, 30],
      ]);
      break;
    case 'inn':
      // Plaster between posts and beams.
      rects(ctx, line, x, y, [
        [0, 0, 48, 4],
        [0, 0, 3, 44],
        [45, 0, 3, 44],
        [0, 22, 48, 3],
      ]);
      break;
    case 'shop':
      rects(
        ctx,
        line,
        x,
        y,
        [0, 1, 2, 3, 4, 5].map((board) => [board * 8 + 7, 0, 1, 44]),
      );
      break;
    case 'dojo':
      rects(ctx, line, x, y, [
        [0, 0, 48, 3],
        [0, 0, 3, 44],
        [45, 0, 3, 44],
        [16, 3, 1, 41],
        [31, 3, 1, 41],
        [3, 15, 42, 1],
        [3, 29, 42, 1],
      ]);
      break;
  }
  rects(ctx, foot, x, y, [[0, 44, 48, 4]]);
}

function drawShelf(
  ctx: CanvasRenderingContext2D,
  building: Building,
  tile: Tile,
  x: number,
  y: number,
) {
  const rows = [6, 20, 34];
  rects(ctx, '#3f2c1e', x, y, [[2, 0, 44, 46]]);
  switch (building) {
    case 'cottage':
      // A dresser of plates over a cupboard.
      for (const row of rows.slice(0, 2))
        for (let plate = 0; plate < 3; plate++) {
          rects(ctx, '#d8d4c8', x, y, [[8 + plate * 12, row, 9, 10]]);
          rects(ctx, '#5a7a9a', x, y, [[10 + plate * 12, row + 2, 5, 6]]);
        }
      rects(ctx, '#6e4a2e', x, y, [
        [6, 33, 17, 11],
        [25, 33, 17, 11],
      ]);
      rects(ctx, '#d8b46a', x, y, [
        [20, 38, 2, 2],
        [26, 38, 2, 2],
      ]);
      return;
    case 'inn':
      // Bottles over a pair of kegs.
      for (const row of rows.slice(0, 2))
        for (let bottle = 0; bottle < 5; bottle++) {
          const color = ['#4f7d4f', '#7a4a2a', '#5a6a8a'][(bottle + row + tile.x) % 3];
          rects(ctx, color, x, y, [
            [7 + bottle * 7, row + 3, 5, 7],
            [8 + bottle * 7, row, 3, 3],
          ]);
        }
      for (const keg of [6, 25]) {
        rects(ctx, '#8a6238', x, y, [[keg, 33, 17, 12]]);
        rects(ctx, '#4a4440', x, y, [
          [keg, 35, 17, 2],
          [keg, 41, 17, 2],
        ]);
      }
      return;
    case 'shop':
      // Jars, crates and sacks.
      for (let jar = 0; jar < 4; jar++)
        rects(ctx, jar % 2 ? '#b06a44' : '#c8a060', x, y, [
          [6 + jar * 9, rows[0] + 2, 7, 8],
          [7 + jar * 9, rows[0], 5, 2],
        ]);
      rects(ctx, '#9a7a4a', x, y, [
        [6, rows[1], 16, 11],
        [25, rows[1], 16, 11],
      ]);
      rects(ctx, '#6e5434', x, y, [
        [6, rows[1] + 5, 16, 1],
        [25, rows[1] + 5, 16, 1],
      ]);
      rects(ctx, '#c8b48a', x, y, [
        [6, rows[2] + 1, 16, 10],
        [25, rows[2] + 1, 16, 10],
      ]);
      rects(ctx, '#a08a64', x, y, [
        [11, rows[2], 6, 2],
        [30, rows[2], 6, 2],
      ]);
      return;
    case 'dojo':
      // A rack of wooden practice swords and staffs.
      rects(ctx, floors.dojo.base, x, y, [[2, 0, 44, 46]]);
      rects(ctx, '#6e4a2e', x, y, [
        [4, 2, 4, 44],
        [40, 2, 4, 44],
        [4, 12, 40, 3],
        [4, 34, 40, 3],
      ]);
      for (const [index, column] of [12, 19, 26, 33].entries())
        rects(ctx, index % 2 ? '#8a6a44' : '#c9a978', x, y, [[column, 4, 3, 40]]);
      rects(ctx, '#3e2c22', x, y, [
        [12, 26, 3, 3],
        [26, 26, 3, 3],
      ]);
      return;
    default:
      for (const [index, row] of rows.entries())
        for (let book = 0; book < 5; book++)
          rects(
            ctx,
            ['#8a3b3b', '#4d6b8a', '#7a8a4d', '#a08050'][(book + index + tile.x) % 4],
            x,
            y,
            [[6 + book * 7, row, 5, 10]],
          );
  }
}

// Ground keeps a one-pixel grid gap for counting; buildings fill their tile to join up.
function drawGround(ctx: CanvasRenderingContext2D, game: Game, tile: Tile, x: number, y: number) {
  const joins = (dx: number, dy: number) =>
    tileAt(game, { x: tile.x + dx, y: tile.y + dy })?.look === tile.look;
  const building = tile.building ?? 'cottage';
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
      drawRoof(ctx, building, x, y, joins, tile.x % 2 === 1);
      return;
    case 'house':
    case 'door':
      drawWall(
        ctx,
        building,
        tile,
        x,
        y,
        tileAt(game, { x: tile.x - 1, y: tile.y })?.look === 'door',
      );
      return;
    case 'wood':
      drawFloor(ctx, building, tile, x, y);
      return;
    case 'interior':
    case 'mat': {
      const below = tileAt(game, { x: tile.x, y: tile.y + 1 });
      if (tile.look === 'mat' || (below && below.look !== 'interior'))
        drawRoomWall(ctx, building, x, y);
      else rects(ctx, '#2a211a', x, y, [[0, 0, 48, 48]]);
      if (tile.look === 'mat') {
        rects(ctx, '#31443b', x, y, [[8, 4, 32, 44]]);
        rects(ctx, '#8a3b3b', x, y, [[6, 34, 36, 14]]);
        rects(ctx, '#a85050', x, y, [[9, 37, 30, 2]]);
      }
      return;
    }
    case 'table': {
      drawFloor(ctx, building, tile, x, y);
      rects(ctx, '#7b5636', x, y, [[joins(-1, 0) ? 0 : 4, joins(0, -1) ? 0 : 6, 48, 48]]);
      const { base } = floors[building];
      rects(ctx, base, x, y, [
        ...(joins(1, 0) ? [] : [[44, 0, 4, 48]]),
        ...(joins(0, 1) ? [] : [[0, 40, 48, 8]]),
      ]);
      if (!joins(0, 1))
        rects(ctx, '#4a3324', x, y, [[joins(-1, 0) ? 0 : 4, 38, joins(1, 0) ? 48 : 40, 4]]);
      if (building === 'inn')
        // Mugs left out on the tables.
        rects(ctx, '#d39a3e', x, y, [[(tile.x + tile.y) % 2 ? 26 : 14, 16, 8, 10]]);
      if (building === 'hall' && !joins(-1, 0) && !joins(0, -1)) {
        // Papers and a candle on the elder's desk.
        rects(ctx, '#e8e0ca', x, y, [
          [12, 14, 14, 10],
          [20, 18, 14, 10],
        ]);
        rects(ctx, '#e6dfcb', x, y, [[38, 10, 4, 10]]);
        rects(ctx, '#f3d794', x, y, [[39, 6, 2, 4]]);
      }
      return;
    }
    case 'bed':
      drawFloor(ctx, building, tile, x, y);
      rects(ctx, '#6e4a2e', x, y, [[joins(-1, 0) ? 0 : 3, 6, joins(1, 0) ? 48 : 42, 38]]);
      rects(ctx, building === 'inn' ? '#5f7f55' : '#5a7a9a', x, y, [
        [joins(-1, 0) ? 0 : 6, 9, joins(1, 0) ? 48 : 36, 32],
      ]);
      if (!joins(-1, 0)) rects(ctx, '#e3dccb', x, y, [[8, 12, 14, 26]]);
      return;
    case 'shelf':
      drawShelf(ctx, building, tile, x, y);
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
    drawHero(ctx, fx + (ax - fx) * along, fy + (ay - fy) * along, game.hero.sword);
  } else {
    const shake = view.effects.find(
      (effect) => effect.kind === 'shake' && same(effect.at, game.player),
    );
    const progress = shake ? (view.time - shake.started) / effectDuration.shake : 0;
    const offset = Math.sin(progress * Math.PI * 6) * 4 * (1 - progress);
    drawHero(ctx, px + offset, py, game.hero.sword);
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
