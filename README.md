# Sweeper Quest

A touch-first Minesweeper RPG prototype. The map fills the screen and a camera follows you around a 34×30 village. West of the village fence, a tall-grass meadow hides slimes (level 1), bats (level 2) and goblins (level 3). Earn XP from kills to raise your power, and defeat the visible level-4 goblin chief in the far corner before your hearts run out.

For the intended adventure and current design direction, start with [idea.md](idea.md). The village is a scratch map for trying out a full-screen world, not a designed area.

## Run locally

Use Node 24 and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up). The [Vite guide](https://vite.dev/guide/) documents the underlying dev server.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite. The server listens on the local network so a phone on the same Wi-Fi can use your computer's network address and the same port.

```sh
pnpm check                       # TypeScript, Biome, rule tests, production build
pnpm exec playwright install chromium
pnpm test:e2e                    # Mouse, keyboard, and emulated phone input
pnpm test:watch
pnpm format
pnpm preview                     # Serve the most recent dist/ build
```

GitHub Actions runs the checks and browser tests on pushes and pull requests.

## Deployment

Play at [sweeper-quest.aslak.io](https://sweeper-quest.aslak.io). The public repository is [aslakhol/sweeper-quest](https://github.com/aslakhol/sweeper-quest).

Vercel hosts the `sweeper-quest` project in the personal `aslakhols-projects` account. Pushes to `main` deploy to production; pull requests get preview deployments. Vercel detects Vite and serves the `dist` build. No environment variables are required. Vercel also manages DNS and HTTPS for the custom domain.

## Play

- Tap a neighboring tile to move or fight. Arrow keys and WASD work too. Combine directions for diagonals, or use Q/E/Z/C.
- Numbers sum the levels of living monsters in the eight neighboring tiles. Zeros are blank and open their whole connected empty area plus its bordering numbers.
- Fights always resolve and move you onto the tile. A monster at or below your power costs nothing. A stronger one first costs its level times the levels it has over you, in hearts. You have 10 hearts and they do not refill.
- Each kill earns its level in XP. Power rises to 2 at 10 XP and to 3 at 26 XP.
- Running out of hearts is game over; start the village over. Start over is also in the menu, along with the rules and monster levels.
- Tap a distant revealed tile to walk there. Tapping a distant hidden tile that borders reachable revealed floor walks beside it and steps in, fighting whatever is there. A hidden tile with no such neighbor routes only to the nearest reachable revealed floor.
- Number keys 1–5 mark the hidden tile under the mouse right away. Anywhere else they pick that note tool. Choose a note tool with its button or a number key, then tap a hidden tile to mark it. The tool then returns to movement; hold Shift while clicking to keep marking. Marking a tile with the note it already has clears it, and a different note replaces it. Long press or right-click cycles 1–5, then clear. Notes do not prevent movement.
- Escape stops auto-walk and clears the note tool. New input, fights, dialogs, and loss of focus stop auto-walk too.

## Code map

| File | Responsibility |
| --- | --- |
| `src/maps/village.txt` | The map in play, edited as whitespace-separated symbols |
| `src/maps/clearing-*.txt` | Ten generated clearings from the first playtest, kept as a balance test bank |
| `src/maps/index.ts` | Loads the village and the clearings |
| `src/game/game.ts` | Validated map loading, state, clues, combat, XP, reveal rules, notes, and route planning |
| `src/game/game.test.ts` | Rule and progression tests with small maps |
| `src/game/maps.test.ts` | Plays the village and every clearing with a solver that narrows hidden levels from visible clues |
| `src/main.ts` | HUD, touch and keyboard input, camera easing, 75 ms auto-walk, event feedback |
| `src/render.ts` | Camera layout, canvas tiles, pixel sprites, fight animation, remains, route dots, and popups |
| `src/style.css` | Full-screen canvas, HUD and dialogs |
| `tests/game.spec.ts` | Full browser interactions on desktop and phone layouts |

The game module has no DOM, timers, or rendering dependencies. Actions mutate one game state and return typed events. The controller uses those events to interrupt movement and show feedback. Keep new rules in that module until their size justifies splitting it. There is no engine or ECS to maintain.

## Map format and decisions

Rows must have equal widths and exactly one `@`. Coordinates in code start at zero; the accessible board label and note feedback start at one.

| Symbol | Meaning |
| --- | --- |
| `@` | Start, revealed on spawn |
| `.` | Hidden floor, drawn as tall grass |
| `,` | Revealed lawn |
| `=` | Revealed path |
| `#` | Stone wall |
| `T` | Tree |
| `^` | Roof |
| `H` | House wall |
| `D` | Door (closed; blocks like a wall) |
| `F` | Fence |
| `~` | Water |
| `s` | Level-1 slime |
| `b` | Level-2 bat |
| `g` | Level-3 goblin |
| `G` | Level-4 goblin chief, visible from the start; killing it completes the quest |

Everything except floor and monsters is always visible and blocks movement. Monsters sit on hidden floor.

[`docs/decisions.md`](docs/decisions.md) records why the game works this way. The village meadow is not balanced; the careful solver wins it without guessing. A slime beside each gate keeps the village's open ground from flooding into the meadow at the start. The clearings are the ten best of 300 generated candidates: a careful solver that only narrows hidden levels from visible clues wins each with a few forced guesses, spends most of the run below power 3, and levels up with weaker monsters still alive. A player who bumps tiles at random does not survive. They double as a test bank for rule changes.

Clues count living monsters only and update after kills. Monsters stay hidden until fought. Diagonal movement is blocked if either bordering cardinal tile is wall or water. The nearest revealed tile uses straight-line distance; ties keep the shortest known route. Routing does not read hidden contents.

The sprite art is drawn in Canvas; the two UI fonts load from Google Fonts with local fallbacks. The canvas supports keyboard play and exposes player position and the current clue, but does not yet provide a complete screen-reader board interface.
