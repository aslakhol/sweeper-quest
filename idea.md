# Sweeper Quest

## The game we are building

A touch-first exploration RPG built around Mamono-style Minesweeper deduction. Read clues to locate monsters you can safely beat, earn XP, grow stronger, and open paths into more dangerous areas. Health lets you take calculated risks when the clues do not give a safe answer. Exploration rewards include heart upgrades and tools that unlock new places.

Deduction must matter. Walking blindly into every hidden tile should not be a reliable way to win. Leveling up should open useful choices while leaving some weaker monsters alive, rather than require finding the last safe enemy.

The intended game has a connected overworld, a village, meadows, repeatable grass zones, and dungeons. The current small clearings are a test bed for the opening puzzle and combat loop. Their dimensions, monster counts, sequence, and reset between maps do not define the eventual world structure.

This document combines the original adventure plan with subsequent playtest decisions. Rules below are the current direction; values labeled as tuning or proposals remain adjustable. [README.md](README.md) describes the implemented demo. [docs/decisions.md](docs/decisions.md) records the playtest rationale, and [docs/roadmap.md](docs/roadmap.md) tracks development stages.

## Platform and maps

- Web first, portrait layout, touch first. All essential actions work on a phone; keyboard and mouse also work.
- TypeScript, Vite, and HTML Canvas, with pnpm. Keep game rules separate from rendering and input.
- Maps are editable text files. Extend the format with explicit room, zone, entrance, and spawn metadata when those systems are built.
- Larger areas will need a camera and deliberate panning controls. Fitting the current board on one screen is a demo convenience.

## Board and deduction

Each tile's clue is the sum of the levels of living monsters in its eight neighboring tiles. It excludes any monster on the tile itself. Kills remove that monster's contribution, so nearby clues change visibly.

Ordinary floor starts hidden. Walls and water remain visible and block movement. Safe settled areas, such as the village, may begin revealed. Ordinary monsters stay hidden until fought; visible gatekeepers and bosses can advertise a route or goal.

Stepping onto a tile reveals it. A zero floods its connected eight-neighbor zero area and the bordering numbered tiles, without revealing living monsters. This is the standard rule outdoors and indoors, replacing the original outdoor one-ring reveal and indoor exception. When a kill turns an already revealed clue into zero, its newly safe area opens too. Zeros are drawn blank. Room boundaries and terrain must be accounted for when larger maps are introduced.

The player's tile keeps its clue readable above the hero. A separate corner badge and "Here" HUD readout are no longer needed. Living monster tiles show the monster rather than a clue; monster levels belong in the legend. Defeated monsters leave faint, species-specific remains beneath the clue. No extra tap is needed to inspect a corpse or expose its number.

## Movement and notes

Move in eight directions by tapping an adjacent tile, using WASD or arrow keys, or using Q/E/Z/C for diagonals. Two direction keys also form a diagonal. Walls and water block diagonal corner-cutting.

Tapping a distant revealed tile walks there over known, unoccupied floor. Auto-walk advances quickly, roughly 60–80 ms per tile, and stops on combat, discoveries or pickups that need attention, new input, or a dialog. An unreachable target briefly flashes.

A distant hidden target must never cause an unconfirmed step into danger. The intended refinement is to walk to a reachable revealed neighbor of that target, then require a second tap to enter it. If no such neighbor is reachable, do not walk. The demo still routes to the geometrically closest reachable revealed tile, which may not border the target; that is a known limitation.

Notes are guesses on hidden floor, not movement barriers. Provide levels 1–5, danger, and an eraser beneath the board. Choosing a note and marking a tile returns to movement; hold Shift on desktop to keep marking. Placing the same note again clears it; another note replaces it. Long press or right-click cycles 1 through 5, then clear. Number keys mark the hidden tile under the pointer directly, or select the tool when no eligible tile is hovered. Touch usability remains a requirement as the note UI evolves.

## Combat, health, and progression

A fight is one action. At or below your power, the enemy dies without hurting you. A stronger enemy deals damage first; if you survive, it dies and you move onto its tile. Attacking stronger enemies is allowed, including taking a deliberate hit to reach the next level. Repeated attacks against a surviving blocking enemy are no longer the combat model.

Current damage tuning is `monster level × max(0, monster level − player power)` hearts. At power 1 a bat costs 2 hearts and a goblin costs 6; at power 2 a goblin costs 3. Reaching zero health is lethal: no kill, XP, or movement is awarded for that attack.

Kills grant XP immediately. Current tuning awards XP equal to monster level, starts power at 1, reaches power 2 at 10 total XP, and power 3 at 26. Sword shards and item-based power thresholds are removed. Tune each area to contain roughly 1.5 times the XP needed for its intended progression so players have choices. Higher-power thresholds are still to be designed.

Slimes are level 1, bats level 2, and goblins level 3. The demo's visible chief is level 4; the planned dungeon boss starts from the original level-5 proposal. These are distinct encounters. The original per-species damage and coin-drop table is superseded by level-gap damage and XP rewards.

The current run starts with 10 whole hearts and has no healing. Damage is a cost deduction helps avoid. Death ends the run, with a restart and no carryover. These replace the original three quarter-counted hearts and free respawn with retained progress. A many-area adventure may revisit respawning and persistence, but the original rules are not automatically reinstated.

Kills need clear feedback: reveal the enemy, show the hit and defeat, then move the hero in. Show damage, XP and level-ups, and make changed clues noticeable. Keep remains subtle enough to preserve the puzzle.

## Phase 1: prove the core loop

Build and tune the deduction, movement, notes, combat, and XP loop before expanding the world. The goal is to infer safe fights, gain power, and defeat a stronger visible goal monster with limited health.

The present bank of small clearings tests varied monster arrangements, open zero regions, forced guesses, and level-up timing. It is not a commitment to a game made only of sequential puzzle boards.

This phase succeeds when careful clue reading reliably outperforms random exploration, leveling changes which fights are safe, and spending health is a meaningful choice. A low-power player may beat a stronger goal by paying health; the original requirement to fetch a particular shard first no longer applies. Test both touch and desktop input, and use clue-based solvers to check map balance without giving them hidden information.

## Phase 2: one complete mini adventure

Aim for a roughly 10–15 minute journey from the village to a dungeon boss, with enough danger that a death is plausible. The original area sizes are starting points, not technical limits.

### Starting overworld

A hand-authored area of about 24×32 tiles:

- **Village in the south:** revealed and safe, with the start, a shop, and a house with an indoor room. The house tests interiors and room boundaries, not a different zero-reveal mode.
- **Meadow in the middle:** slimes, bats, and stronger threats arranged for deduction and XP progression. Hide heart upgrades and tools as exploration rewards. The original two heart pieces can remain a placement proposal; the three sword-shard spots become reward locations, with their contents still to choose.
- **Tall grass in the west:** a repeatable zone with fixed monster spawns. The original design restores fog and respawns monsters when you leave. Reconcile repeatable XP and any currency rewards with the progression budget before implementing it.
- **Cave entrance in the north:** leads to the dungeon. Strong, visible monsters gate routes through combat cost rather than a hidden XP requirement. Tools can separately unlock exploration gates.

### Shop and items

Keep a thumb-friendly bottom sheet for shopping. Coins were removed from the core demo because they had no use and added collection taps. A shop requires a deliberate economy design, including earnings, pickup behavior, and farm balance. Do not bring back mandatory corpse-looting taps by default.

The original shop is a proposal to revisit, not settled balance:

| Item | Original proposal | Decision needed |
| --- | --- | --- |
| Potion | 5 coins, restores 2 hearts | Whether limited healing fits the health budget |
| Bomb | 8 coins, reveals 3×3; kills enemies at or below power and exposes stronger ones | XP credit and interaction with the combat rules |
| Heart piece | 15 coins, sold once; four pieces add one max heart | Pieces versus whole containers, pricing, and whether max-health gains heal |

Exploration should reward heart containers and tools rather than direct power increases. Currency rewards, if restored, should be predictable rather than random, following the original economy intent.

### Dungeon and boss

Start with an approximately 8×8 dungeon generated on entry, containing bats, goblins, and a chest. Replace the original chest's sword shard with a health or tool reward; its exact contents remain open. The original plan resets the dungeon on exit or death. Finalize that alongside the adventure's persistence rules.

A 2×2 level-5 boss occupies four tiles but counts as one monster in neighboring clue sums. Deduplicate its contribution when several occupied tiles touch the same clue. Rules for clues within its footprint, movement after victory, and remains still need definition.

The boss follows the same combat model: power 5 would make it safe; lower power can win if the player survives the damage. Tune the XP curve and health budget together. Its planned reward remains a heart container and a Lantern. For this adventure, the Lantern opens the next-zone gate.

### Persistence and completion

Add inventory and a HUD for health, power, XP, and relevant items or currency. Save progress locally so a phone session can be resumed. Saving is separate from deciding what survives death. Define the persistent and resettable state for overworld exploration, rewards, grass, dungeon layouts, monsters, and notes first.

The adventure is complete when village exploration, deduction, XP progression, useful rewards, and the boss form one coherent journey. Keep the player's health budget meaningful across that journey. The current demo's map transitions and resets are not the final persistence design.

## Open decisions and later scope

Before Phase 2, settle the many-area run/death model, healing and heart upgrades, XP through power 5, repeatable farming, the shop economy, room/zone reset boundaries, multi-tile boss behavior, and mobile camera controls. Screen layout and HUD presentation remain open to redesign.

Later zones can introduce swamp, ice, or darkness. Traversal items such as boots or a shovel, an Infinite Minesweeper-style number display option, and a distinct hardcore mode remain outside this prototype. The current test's game-over rule alone does not settle the eventual difficulty modes.
