# Sweeper Quest

A portrait, touch-first Minesweeper RPG prototype. The 11×15 demo has open southern and eastern meadows around the denser monster groups, with 19 monsters: eight level-1 slimes, eight level-2 bats, and three level-3 goblins. Use the clues to find two shard bundles, then defeat the crowned goblin.

## Run locally

Use Node 24 and npm. The [Vite guide](https://vite.dev/guide/) documents the underlying dev server.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The server listens on the local network so a phone on the same Wi-Fi can use your computer's network address and the same port.

```sh
npm run check       # TypeScript, Biome, rule tests, production build
npx playwright install chromium
npm run test:e2e    # Mouse, keyboard, and emulated phone input
npm run test:watch
npm run format
npm run preview    # Serve the most recent dist/ build
```

GitHub Actions runs the checks and browser tests on pushes and pull requests.

## Deployment

Play at [sweeper-quest.aslak.io](https://sweeper-quest.aslak.io). The public repository is [aslakhol/sweeper-quest](https://github.com/aslakhol/sweeper-quest).

Vercel hosts the `sweeper-quest` project in the personal `aslakhols-projects` account. Pushes to `main` deploy to production; pull requests get preview deployments. Vercel detects Vite and serves the `dist` build. No environment variables are required. Vercel also manages DNS and HTTPS for the custom domain.

## Play

- Tap a neighboring tile to move or fight. Arrow keys and WASD work too. Combine directions for diagonals, or use Q/E/Z/C.
- Tap a distant revealed tile to walk there. A distant hidden tile routes only to the nearest reachable revealed floor. Tap again from beside the hidden tile to enter it.
- A zero reveals one ring of neighbors by default. The **Flood connected zeros** test toggle reveals the whole eight-connected zero area and bordering numbers instead. Turning it on also expands your current tile if it is zero. It never reveals living monsters or collects distant loot. Switching off leaves explored tiles open; use Start over for a fresh comparison. The selected mode survives Start over but resets on page reload.
- Choose a note tool, then tap hidden tiles. Choose the same tool again to return to movement. Long press or right-click cycles 1–5, then clear. Notes do not prevent movement.
- Equal or greater power kills a monster without damage. A weaker attack reveals it and hurts you. Defeated enemies keep their species sprite. Small badges on living monsters and corpses show the tile clue, not the monster level. They count living monsters in the eight neighboring tiles, excluding the tile itself, and update after kills. Monster levels are listed in the legend. Tap a corpse to inspect its number without moving; tap the number to walk there and collect its coins. The corpse returns when you leave, even after looting. Keyboard movement and auto-walk cross corpses normally.
- Escape stops auto-walk and clears the note tool. New input, pickups, combat, dialogs, and loss of focus stop auto-walk too.
- Death restores hearts at the start, preserving progress. Reloading the page starts a fresh game. Saving belongs to Phase 2.

## Code map

| File | Responsibility |
| --- | --- |
| `src/maps/training.txt` | The revised deduction demo, edited as whitespace-separated symbols |
| `src/game/game.ts` | Validated map loading, state, clues, combat, reveal rules, notes, and route planning |
| `src/game/game.test.ts` | Rule and progression tests with small maps |
| `src/game/training.test.ts` | Checks the opening clues and a route to victory using only visible clue bounds |
| `src/main.ts` | DOM controls, touch and keyboard input, 75 ms auto-walk, event feedback |
| `src/render.ts` | Canvas tiles, pixel sprites, player badge, route dots, and popups |
| `src/style.css` | Portrait layout and HTML controls |
| `tests/game.spec.ts` | Full browser interactions on desktop and phone layouts |

The game module has no DOM, timers, or rendering dependencies. Actions mutate one game state and return typed events. The controller uses those events to interrupt movement and show feedback. Keep new rules in that module until their size justifies splitting it. There is no engine or ECS to maintain.

## Map format and decisions

Rows must have equal widths and exactly one `@`. Coordinates in code start at zero; the accessible board label and note feedback start at one.

| Symbol | Meaning |
| --- | --- |
| `@` | Start, revealed on spawn |
| `#` | Always-visible wall |
| `~` | Always-visible water |
| `.` | Hidden floor |
| `s` | Level-1 slime, 1 quarter-heart damage, 1 coin |
| `b` | Level-2 bat, 2 quarter-heart damage, 2 coins |
| `g` | Level-3 goblin, 4 quarter-heart damage, 3 coins |
| `G` | Crowned level-3 goblin; killing this one completes the quest |
| `P` | Bundle of 2 sword shards, reaching power 2 |
| `Q` | Bundle of 3 sword shards, reaching power 3 after the first bundle |

The initial western clue is 1, so each unknown neighboring monster is safe at power 1. Eastern clues of 2 need more information before attacking. The map test verifies that visible numbers give enough information to reach both bundles and win without taking damage.

Clues count living monsters only and update after kills. Revealing a floor does not collect its item. Monsters remain hidden until attacked. Diagonal movement is blocked if either bordering cardinal tile is wall or water. The nearest revealed tile uses straight-line distance; ties keep the shortest known route. Routing does not read hidden contents.

Health is an integer in quarter-heart units. Power thresholds are 2 shards for power 2 and 5 for power 3. The sprite art is drawn in Canvas; the two UI fonts load from Google Fonts with local fallbacks. The canvas supports keyboard play and exposes player position and the current clue, but does not yet provide a complete screen-reader board interface.

See [the roadmap](docs/roadmap.md) for the starting-area scope and decisions to resolve before building it.
