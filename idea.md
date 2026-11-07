# Sweeper Quest

## The game we are building

A touch-first exploration RPG built around Mamono-style Minesweeper deduction. Read clues to find a safe way through, explore a connected world, and discover what lies hidden in it. Kills only clear the way; the reward is exploring. Strength comes from rare finds, and hearts decide how many mistakes you can afford.

Deduction must matter. Walking blindly into every hidden tile should not be a reliable way to win. Leveling up should open useful choices while leaving some weaker monsters alive, rather than require finding the last safe enemy.

The intended game is one connected world with a village, meadows, caves and many regions, not a series of stages. Getting stuck in one place, leaving, and returning stronger is part of the design. The current world is a small test of that structure, and its size and number of finds do not define the final game.

This document combines the original adventure plan with subsequent playtest decisions. Rules below are the current direction; values labeled as tuning or proposals remain adjustable. [README.md](README.md) describes the implemented demo. [docs/decisions.md](docs/decisions.md) records the playtest rationale, and [docs/roadmap.md](docs/roadmap.md) tracks development stages.

## Platform and maps

- Web first, touch first. All essential actions work on a phone; keyboard and mouse also work.
- TypeScript, Vite, and HTML Canvas, with pnpm. Keep game rules separate from rendering and input.
- Maps are editable text files. Extend the format with explicit room, zone, entrance, and spawn metadata when those systems are built.
- The map fills the screen and the camera follows the player, with health, power, pieces, a menu and note tools floating on top. Deliberate panning without accidental moves or notes is still open.

## Board and deduction

Each tile's clue is the sum of the levels of living monsters in its eight neighboring tiles. It excludes any monster on the tile itself. Kills remove that monster's contribution, so nearby clues change visibly.

Ordinary floor starts hidden. Walls and water remain visible and block movement. Safe settled areas, such as the village, may begin revealed. Ordinary monsters stay hidden until fought; visible gatekeepers and bosses can advertise a route or goal.

Stepping onto a tile reveals it. A zero floods its connected eight-neighbor zero area and the bordering numbered tiles, without revealing living monsters. This is the standard rule outdoors and indoors, replacing the original outdoor one-ring reveal and indoor exception. When a kill turns an already revealed clue into zero, its newly safe area opens too. Zeros are drawn blank. Room boundaries and terrain must be accounted for when larger maps are introduced.

The player's tile keeps its clue readable above the hero. A separate corner badge and "Here" HUD readout are no longer needed. Living monster tiles show the monster rather than a clue; monster levels belong in the legend. Defeated monsters leave faint, species-specific remains beneath the clue. No extra tap is needed to inspect a corpse or expose its number.

## Movement and notes

Move in eight directions by tapping an adjacent tile, using WASD or arrow keys, or using Q/E/Z/C for diagonals. Two direction keys also form a diagonal. A diagonal step is blocked only when both tiles beside it block movement, so the hero cannot squeeze between two obstacles.

Tapping a distant revealed tile walks there over known, unoccupied floor. Auto-walk advances quickly, roughly 60–80 ms per tile, and stops on combat, discoveries or pickups that need attention, new input, or a dialog. An unreachable target briefly flashes.

Tapping a distant hidden target that borders reachable revealed floor walks to the nearest such neighbor and steps in, the same as tapping it from next door. Requiring a second tap felt clumsy after a long walk. A hidden target with no reachable revealed neighbor still routes to the geometrically closest reachable revealed tile; whether it should walk at all is open.

Notes are guesses on hidden floor, not movement barriers. Provide levels 1–5, danger, and an eraser along the bottom of the screen. Choosing a note and marking a tile returns to movement; hold Shift on desktop to keep marking. Placing the same note again clears it; another note replaces it. Long press or right-click cycles 1 through 5, then clear. Number keys mark the hidden tile under the pointer directly, or select the tool when no eligible tile is hovered. Touch usability remains a requirement as the note UI evolves.

## Combat, health, and progression

A fight is one action. At or below your power, the enemy dies without hurting you. A stronger enemy deals damage first; if you survive, it dies and you move onto its tile. Attacking stronger enemies is allowed, including taking a deliberate hit to reach the next level. Repeated attacks against a surviving blocking enemy are no longer the combat model.

Current damage tuning is `monster level × max(0, monster level − player power)` hearts. At power 1 a bat costs 2 hearts and a goblin costs 6; at power 2 a goblin costs 3. Reaching zero health is lethal: no kill, XP, or movement is awarded for that attack.

Power stays with the character and never resets. Four whetstones raise it by one, and a chief can drop a greatstone worth all four. Four heart pieces add a heart, and a chief can drop a whole heart. A new heart also refills your health. Kills give nothing.

Level-ups are rare, with a lot of game between them. Keep the ladder short, around power 5 or 6, so each one is an event and clues stay small. Heart pieces, tools and secrets set the everyday rhythm of rewards. Each power needs a large part of the world designed for it.

The world holds more pieces than you need, so you can move on without finding everything. Most finds are hidden. Maps hint at them with terrain, with rumours from people, and with clues: a ring of monsters around an empty spot makes the numbers climb and invites a look.

Maps open in layers. At each power, part of the map can be proven free from the clues; the rest waits until you are stronger. A clue at or below your power proves all its neighbours safe, so a new level reopens places you left behind without any extra mechanic. Weaker monsters still add to clues, and killing them cleans up the sums. Check this across the whole world: being stuck in one region is fine, being stuck everywhere is not.

Slimes are level 1, bats level 2, and goblins level 3. Chiefs are visible and currently level 3, because the test world only reaches power 3. The planned dungeon boss starts from the original level-5 proposal.

The hero starts with 3 hearts so early damage is scary. Hearts are a failsafe: at power P, about 2P + 1 hearts survives one mistake against a monster one level above you, and hearts beyond that are breathing room. Each level-up eats some of it, because stronger monsters hit harder. A monster two levels above you is lethal early on, so early maps must not force guesses you cannot survive. Mum's home-cooked meal in the village restores all hearts, as often as you walk back; a shop or a smaller meal may change that. Death shows a game over screen. Continue wakes you beside your bed at home, Mum says something, and the world stays as it was, so the cost is the walk back. It still counts as a failure: maps must be solvable without dying, and the solver never does.

Kills need clear feedback: reveal the enemy, show the hit and defeat, then move the hero in. Show damage, finds and level-ups, and make changed clues noticeable. Keep remains subtle enough to preserve the puzzle.

## Phase 1: prove the core loop

Build and tune the deduction, movement, notes, combat, and find-driven progression before expanding the world. The goal is to infer safe routes, find what makes you stronger, and return to places that were out of reach.

The present small world tests layered maps, finds and returning stronger. It compresses what should be a long stretch of play, so finds are far denser than in the final game.

This phase succeeds when careful clue reading reliably outperforms random exploration, a new level reopens old places in a satisfying way, and spending health is a meaningful choice. Test both touch and desktop input, and use clue-based solvers to check the world without giving them hidden information.

## Phase 2: one complete mini adventure

Aim for a roughly 10–15 minute journey from the village to a dungeon boss, with enough danger that a death is plausible. The original area sizes are starting points, not technical limits.

### Starting overworld

A hand-authored area of about 24×32 tiles:

- **Village in the south:** revealed and safe, with the start, a shop, and a house with an indoor room. The house tests interiors and room boundaries, not a different zero-reveal mode.
- **Meadow in the middle:** slimes, bats, and stronger threats arranged in layers. Hide whetstones, heart pieces and tools as exploration rewards.
- **Tall grass in the west:** the first region you can only partly clear. Monsters do not respawn, and there is no grinding to do.
- **Cave entrance in the north:** leads to the dungeon. Clues and monster levels gate routes. Tools can separately unlock exploration gates.

### Shop and items

Keep a thumb-friendly bottom sheet for shopping. Coins were removed from the core demo because they had no use and added collection taps. A shop requires a deliberate economy design, including earnings, pickup behavior, and farm balance. Do not bring back mandatory corpse-looting taps by default.

The original shop is a proposal to revisit, not settled balance:

| Item | Original proposal | Decision needed |
| --- | --- | --- |
| Potion | 5 coins, restores 2 hearts | Whether limited healing fits the health budget |
| Bomb | 8 coins, reveals 3×3; kills enemies at or below power and exposes stronger ones | Interaction with the combat rules |
| Heart piece | 15 coins, sold once; four pieces add one max heart | Pieces versus whole containers, pricing, and whether max-health gains heal |

Coins and other extras do not tie directly into progression, apart from perhaps a single whetstone in the shop. Currency rewards, if restored, should be predictable rather than random, following the original economy intent.

### Dungeon and boss

Dungeons with finds are fixed maps, because a layout rebuilt on every visit would let you farm them. Random floors could return later with extras such as coins. Replace the original chest's sword shard with a health or tool reward; its exact contents remain open.

A 2×2 level-5 boss occupies four tiles but counts as one monster in neighboring clue sums. Deduplicate its contribution when several occupied tiles touch the same clue. Rules for clues within its footprint, movement after victory, and remains still need definition.

The boss follows the same combat model: power 5 would make it safe; lower power can win if the player survives the damage. Tune power and hearts together. Its planned reward remains a heart container and a Lantern. For this adventure, the Lantern opens the next-zone gate.

### Persistence and completion

Add inventory and a HUD for health, power, pieces, and relevant items or currency. Progress is saved locally so a session can be resumed, and needs a more durable store later. Saving is separate from deciding what survives death. Define the persistent and resettable state for exploration, finds, monsters, and notes first.

The adventure is complete when village exploration, deduction, finds, and the boss form one coherent journey. Keep the player's health budget meaningful across that journey. The current map transitions are not the final persistence design.

## Open decisions and later scope

Before Phase 2, settle how far power goes, healing and the shop economy, room/zone reset boundaries, multi-tile boss behavior, and mobile panning controls. Death can wait.

Later zones can introduce swamp, ice, or darkness. Traversal items such as boots or a shovel, an Infinite Minesweeper-style number display option, and a distinct hardcore mode remain outside this prototype. The current test's game-over rule alone does not settle the eventual difficulty modes.
