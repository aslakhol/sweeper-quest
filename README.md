# Sweeper Quest

A touch-first Minesweeper RPG prototype. The map fills the screen and a camera follows you around a small connected world: a 34×30 village, a tall-grass meadow behind its west fence, a cave to the north and a wood to the east. Slimes (level 1), bats (level 2) and goblins (level 3) hide on tiles and sum into the clues. Kills give nothing. You grow by finding hidden whetstones and heart pieces, which open more of the world. The houses, the shop and the dojo can be entered and have people to talk to.

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
pnpm maps                        # Regenerate the outdoor maps
pnpm maps:check                  # Check world objectives, deduction profiles and return visits
pnpm format
pnpm preview                     # Serve the most recent dist/ build
```

GitHub Actions runs the checks and browser tests on pushes and pull requests.

## Deployment

Play at [sweeper-quest.aslak.io](https://sweeper-quest.aslak.io). The public repository is [aslakhol/sweeper-quest](https://github.com/aslakhol/sweeper-quest).

Vercel hosts the `sweeper-quest` project in the personal `aslakhols-projects` account. Pushes to `main` deploy to production; pull requests get preview deployments. Vercel detects Vite and serves the `dist` build. No environment variables are required. Vercel also manages DNS and HTTPS for the custom domain.

## Play

- A new game starts at home without a sword, at power 0, where even a slime hurts. Mum sends you to the dojo in the south-east of the village. Doctor Madeleine asks whether you will help, hands over a sword when you say yes, and teaches the rules in four short lessons. Each lesson is won by defeating every monster you are strong enough for, and puts you back beside her for the next.
- Tap a neighboring tile to move or fight. Arrow keys and WASD work too. Combine directions for diagonals, or use Q/E/Z/C.
- Numbers sum the levels of living monsters in the eight neighboring tiles. Zeros are blank and open their whole connected empty area plus its bordering numbers.
- A monster at or below your power dies for free and you enter its tile. A stronger one is revealed but survives and blocks the way. Its clue stays hidden, and you lose its level times the levels it has over you in hearts. Return with enough power to defeat it. You start with 3 hearts. Finishing a conversation with Mum at home (the north-east house) restores them all.
- Required progression must be possible through deduction without guesses or damage. Getting stuck in one region is a reason to explore elsewhere and return stronger.
- Four whetstones raise your power by one, and four heart pieces add a filled heart. They lie hidden on tiles and are picked up by walking onto them. Three goblin chiefs are visible: the meadow chief drops a whole heart, the cave chief a greatstone worth four whetstones, and the wood chief nothing yet.
- Step onto a door to go inside, and onto the doormat to come back out. The stairs north of the village lead to the cave, and the timber gate at the east edge leads to the wood. Every map keeps its state while you are away, and your hearts and power come with you.
- Walk into a person, or tap them from across the room, to talk. Tap anywhere to show the next line.
- Agreeing to train starts the main quest, shown in the quest menu with how many chiefs you have defeated. Defeating all three and returning to Doctor Madeleine earns a Bachelor of Fighting, which stays in your items. A screen then says the game is completed and offers Start over or Continue.
- Running out of hearts is game over. Continue wakes you beside your bed at home with every heart, and the world stays as you left it. Start over begins a new game.
- The bag in the corner opens the menu. Its pages show the items you carry, the quests people have given you and the ones you have finished, the rules and monster levels with Start over, and a debug page for playtesting. Skip training on the debug page hands over the sword and puts you outside the dojo.
- Every find except a coin shows the hero holding it up, with how far it goes toward the next upgrade.
- The game autosaves to one of three browser-local slots. Open **Menu → Saves** to switch; the game you leave is saved first. A reload resumes the last selected slot. The original single save moves into Save 1, with its original data retained as a backup.
- Saves made incompatible by a map or format change stay stored. Choose another slot, or confirm replacing the old save with a new game. Each slot has Download and Import buttons for keeping a JSON backup or restoring a repaired save. Importing an incompatible file leaves the slot unchanged.
- Tap a distant revealed tile to walk there. Tapping a distant hidden tile that borders reachable revealed floor walks beside it and steps in, fighting whatever is there. A hidden tile with no such neighbor routes only to the nearest reachable revealed floor.
- Number keys 1–5 mark the hidden tile under the mouse right away. Anywhere else they pick that note tool. Choose a note tool with its button or a number key, then tap a hidden tile to mark it. The tool then returns to movement; hold Shift while clicking to keep marking. Marking a tile with the note it already has clears it, and a different note replaces it. Long press or right-click cycles 1–5, then clear. Notes do not prevent movement.
- Escape stops auto-walk and clears the note tool. New input, fights, dialogs, and loss of focus stop auto-walk too.

## Code map

| File | Responsibility |
| --- | --- |
| `src/maps/*.txt` | The village, its interiors, the dojo lessons, the cave and the wood, edited as whitespace-separated symbols |
| `src/maps/index.ts` | Areas: each one's map or maps, exits, people and their lines |
| `src/game/world.ts` | Which area you are in, travel between areas, dojo lessons, and the visited maps that keep their state |
| `src/game/game.ts` | Validated map loading, state, clues, combat, finds, reveal rules, notes, and route planning |
| `src/game/save.ts` | Saves and restores the world as JSON in `localStorage` |
| `src/game/save-slots.ts` | Three independent save slots, selection and migration of the original save |
| `src/game/game.test.ts` | Rule and progression tests with small maps |
| `src/game/world.test.ts` | Exits link up both ways, and travel keeps or refreshes maps |
| `src/game/solver.ts` | Direct, bounds and shared-group deductions with clue proofs; conditional visibility and reachability layers |
| `src/game/survey.ts` | Walks the connected world, trains at the dojo, earns upgrades and revisits persistent areas |
| `src/game/puzzle-fixtures.ts` | Small authored examples of weighted deduction and unresolved frontiers |
| `src/maps/puzzle-checks.ts` | Agreed world objectives; optional reasoning requirements and protected access powers |
| `src/game/map-check.ts` | Validates objectives and reports routes, proofs, partial layers and return visits |
| `src/game/maps.test.ts` | Preserves the current prototype's full exploration and layer expectations |
| `scripts/generate-maps.ts` | Places monsters and finds on hand-drawn terrain |
| `scripts/check-maps.ts` | Runs authoring checks and writes reports under `output/map-checks` |
| `src/main.ts` | HUD, touch and keyboard input, camera easing, 75 ms auto-walk, event feedback |
| `src/render.ts` | Camera layout, canvas tiles, pixel sprites, fight animation, remains, route dots, and popups |
| `src/style.css` | Full-screen canvas, HUD and dialogs |
| `tests/game.spec.ts` | Full browser interactions on desktop and phone layouts |

The game module has no DOM, timers, or rendering dependencies. Actions mutate one game state and return typed events. The controller uses those events to interrupt movement and show feedback. Keep new rules in that module until their size justifies splitting it. There is no engine or ECS to maintain.

## Map format and decisions

Rows must have equal widths. A new game wakes up beside the bed at home, where Mum speaks first. A map you reach through an exit starts on the exit back to where you came from; a map without exits starts on its single `@`. Coordinates in code start at zero; the accessible board label and note feedback start at one.

| Symbol | Meaning |
| --- | --- |
| `@` | Start on a map without exits, revealed on spawn |
| `.` | Hidden floor, drawn as tall grass |
| `,` | Revealed lawn |
| `=` | Revealed path |
| `#` | Stone wall |
| `T` | Tree |
| `^` | Roof |
| `H` | House wall |
| `D` | Door that does not open; blocks like a wall |
| `F` | Fence |
| `~` | Water |
| `_` | Wooden floor, revealed |
| `W` | Interior wall |
| `O` | Table |
| `B` | Bed |
| `S` | Shelf |
| `s` | Level-1 slime |
| `b` | Level-2 bat |
| `g` | Level-3 goblin |
| `G` | Level-3 goblin chief, visible from the start; drops a heart |
| `C` | Level-3 goblin chief, visible from the start; drops a greatstone |
| `K` | Level-3 goblin chief, visible from the start; drops nothing |
| `*` | Hidden whetstone |
| `+` | Hidden heart piece |

Everything except floor and monsters is always visible and blocks movement. Monsters sit on hidden floor.

Each area in `src/maps/index.ts` adds its own symbols on top of these. Exits (digits in the village, `>` for the cave, `<` for the way back) are revealed floor that move you to another area when stepped on; auto-walk never crosses one on the way somewhere else. People are revealed floor you talk to instead of entering. An area can also change how hidden floor is drawn, such as stone in the dungeon.

[`docs/decisions.md`](docs/decisions.md) records why the game works this way. [`docs/map-design.md`](docs/map-design.md) has the exact puzzle rules, how maps open in layers, and how to generate them. Finds are far denser than the final game should be.

Clues count living monsters only and update after kills. Monsters stay hidden until fought. A diagonal step is blocked only when both bordering cardinal tiles block movement. The nearest revealed tile uses straight-line distance; ties keep the shortest known route. Routing does not read hidden contents.

The sprite art is drawn in Canvas; the two UI fonts load from Google Fonts with local fallbacks. The canvas supports keyboard play and exposes player position and the current clue, but does not yet provide a complete screen-reader board interface.
