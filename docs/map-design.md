# Map design

How the puzzle works, how maps are built, and what we know so far about making them good. Rules are taken from `src/game/game.ts`, which wins if this document disagrees. The reasons behind the design are in [decisions.md](decisions.md).

Before authoring or regenerating maps, read [puzzle design](puzzle-design.md). It defines the reasoning we want to teach, worked examples for weighted clues, and the authoring workflow. Direct, bounds and shared-group solver profiles are implemented; expert case analysis remains future work.

## The game in brief

You walk a connected world of hidden tiles. Monsters hide on tiles and sum into clues. Kills give nothing. You grow only by finding hidden items: four whetstones raise your power, four heart pieces add a heart. Level-ups should be rare, so most play happens at one fixed power. Maps are not boards to clear; they are places you explore, get stuck in, leave, and return to stronger.

Hidden finds, chief drops, quests and the shop are the current upgrade sources. A quest giver asks for a keepsake lost out in the world and hands over a reward when you bring it back. Bram's shop sells one whetstone for five coins found around the world. Key reward placement and acquisition remain collaborative with Aslak. A region may have few or no power-up items and depend on growth elsewhere to reveal another door, reward or quest objective on a later visit. The test world's reward density and layer ranges below are prototype measurements, not quotas for future regions.

## Exact rules

### Clues

- A clue is the sum of the levels of living monsters on the eight neighbouring tiles. It excludes the tile itself.
- Clues count through anything. A wall, tree, fence or water tile between you and a monster does not block it.
- Clues change. A kill lowers every clue around it, so a number on screen is always the current one, not a fixed fact from when it was revealed.
- Every revealed floor tile shows its clue, including village ground and exits, unless someone is standing there. Zeros are drawn blank.
- A living monster's tile shows no clue. A dead monster leaves faint remains and shows its clue like any other tile.
- Finds, people and exits add nothing to clues.
- Visible chiefs do add to clues, so their level has to be subtracted when reading around them.

### Revealing

- Stepping onto a tile reveals it.
- A zero floods: it opens every connected zero and the numbered tiles bordering them, in all eight directions, without revealing living monsters.
- A kill that turns a revealed clue into zero floods from that tile too.
- **Floods pass through any floor, not just hidden floor.** A zero on the village lawn flows through an open fence gap into the tall grass, which is why each grass entrance holds a slime.
- Floods ignore the diagonal movement rule, so they can reveal ground you cannot walk to yet.
- A flood reveals finds but does not collect them. You pick one up by walking onto it.
- Walls, trees, fences and water are always visible and never flood.

### Moving and fighting

- You move in eight directions. A diagonal step is blocked only when both tiles beside it block movement.
- Attacking a hidden monster reveals it and clears its note.
- A monster at or below your power dies for free and you enter its tile.
- A stronger one costs `level × (level − power)` hearts but survives. You stay put. Its clue stays hidden, neighbouring clues do not change, and no flood, drop or victory occurs. If that takes your last heart you lose.
- Repeated attacks and healing cannot clear a stronger monster. No required progression may depend on guesses or damage, including attacks used merely to reveal a monster.
- Auto-walk only crosses known ground, and tapping a hidden tile beside known ground walks there and steps in.
- Notes are the player's own marks on hidden tiles, levels 1–5 and "danger". They never block movement or affect the rules.
- Game over offers Continue, which wakes you at home with all hearts and the world unchanged. Maps must never rely on it: dying counts as failure.

### Numbers today

| Monster | Level | Cost at power 1 | Power 2 | Power 3 |
| --- | --- | --- | --- | --- |
| Slime | 1 | 0 | 0 | 0 |
| Bat | 2 | 2 | 0 | 0 |
| Goblin | 3 | 6 | 3 | 0 |
| Chief (visible) | 3 | 6 | 3 | 0 |

These are damage costs per unsuccessful attack, not prices for killing a monster. The hero starts on 3 hearts, so at power 1 one attack on a bat is survivable, a second is not, and a goblin is lethal. Whoever draws maps must treat a wrong guess as possibly fatal, especially early. Later levels cost more: a monster one level above you costs `power + 1`, so about `2 × power + 1` hearts survive one mistake. The planned ladder stops around power 5 or 6, and note tools already go up to 5.

## How this differs from classic Minesweeper

Most advice about Minesweeper boards needs translating:

- **Safe means "level at or below my power", not "empty".** A hidden tile is safe when the clues cap its possible level. The rule of thumb: a clue at or below your power makes all its neighbours safe, because no single neighbour can be higher than the clue.
- **Clues are weighted sums, so they are ambiguous.** A 3 can be one goblin, a bat and a slime, or three slimes. Classic counting patterns such as 1-2-1 do not carry over directly.
- **The board changes as you solve it.** Killing a free monster removes noise from nearby clues, so clearing weak monsters is a deduction tool, not only a reward.
- **There are no flags or mine counts.** The player does not know how many monsters remain, and nothing checks their notes.
- **The goal is a route, not a full clear.** Nothing requires clearing a map, and a player may leave at any time and come back stronger. A board that is stuck is not a failed board.
- **Hearts cover mistakes.** A wrong guess can cost hearts, but cannot clear a stronger monster. Required progression never spends health or relies on revealing a threat through a failed attack.
- **Power changes what is solvable.** The same board is a different puzzle at each power, and a map is designed as all of those puzzles at once.
- **Terrain is part of the puzzle.** Walls limit how many tiles can sit around a clue, and chokepoints decide where a route must go.
- **Maps are large and scroll.** A camera follows the player, so only part of the map is on screen at once.

## Layers

At each power, part of a map can be proven free using only visible clues. That share is its layer. It is the main measure of a map today.

| Map | Size | Hidden floor | Slimes | Bats | Goblins | Density | Open at power 1 | Power 2 | Power 3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tall grass | 14×26 of the 34×30 village | 332 | 21 | 44 | 30 | 29% | 61% | 89% | 100% |
| Wood | 20×22 | 310 | 13 | 41 | 28 | 26% | 44% | 85% | 100% |
| Cave | 15×17 | 170 | 8 | 26 | 15 | 29% | 42% | 79% | 100% |

`maps.test.ts` holds every map to these ranges: 35–65% at power 1, 70–95% at power 2, and 100% at power 3. Change the ranges deliberately if the design moves, not to make a map pass.

The world test also checks that:

- the village alone cannot give you power 2, so being stuck sends you elsewhere
- every find and chief can be reached without a guess or any damage, by touring all maps repeatedly

This test world holds 8 whetstones and 6 heart pieces, counting two whetstones and a heart piece that villagers give as quest rewards and the whetstone Bram sells. Seven coins are hidden in the village, wood and cave, two more than the whetstone costs. It compresses a long stretch of play into a short test. Real maps should hold far fewer.

The eighth whetstone is in the wood at `(18, 1)`, in the north-east pocket. Both bounds and groups reach it at power 2 in the tested orders. It supplies the missing stone before either level-3 chief is defeated. The cave chief keeps its greatstone, so completing the demo can now reach power 4. This extra reward was agreed with Aslak to remove the dependency on taking damage; the monster roster still ends at level 3.

## Hints for hidden finds

Ground finds start hidden. Prefer positions that become visible before the player steps onto them: a nearby zero flood or a free kill can expose the item and create a reason to approach it. This applies to pieces, keepsakes and coins on the ground, not rewards handed over by people or dropped by chiefs. The item must not be drawn through a covered tile.

A zero on the item tile is not enough by itself: entering that hidden tile reveals and collects it in one action. Check that another action uncovers it first. A numbered tile on a flood boundary can work well too. Keep the intended access power and safe route intact; exceptions should be explained in the authoring note rather than changing rewards to satisfy a metric.

Before the reveal, give the player a reason to investigate:

- **Clues:** a ring of bats around an empty centre makes the numbers climb around nothing. Hilde's ring and a heart piece sit in rings today, and Hilde at the inn hints at them.
- **Terrain:** a gap in the trees, a walled pocket, an island you cannot reach yet.
- **People:** rumours about something out in the world.

## Tools

`pnpm maps [candidates] [output directory]` regenerates the village, wood and cave. Walls, water, exits and chiefs come from the existing map files. Each candidate scatters monsters with density and strength growing with walking distance from the entrances, stamps in rings and gate slimes, and is scored against its layer targets. Finds then go on ground first revealed and reachable at the power named in the script. Among eligible positions, the generator prefers tiles first revealed from somewhere else, then spreads finds apart. Fixed ring finds are still authored exceptions to inspect. This preference uses the conditional solver trace; the final connected-world report checks what actually happens after rewards are placed. Settings for each map are at the top of `scripts/generate-maps.ts`. Without an output directory it overwrites the maps, and any changed map drops existing saves.

`pnpm maps:check [output directory]` validates the agreed prototype objectives and writes `report.txt` and `report.json` under `output/map-checks` by default. It runs three deduction profiles in two move orders across the connected world, with actual walks and earned rewards. Every attempted fight must be damage-free, and both tested groups orders must reach all objectives. It also measures conditional layers from every entrance, distinguishing visible ground from reachable ground. These layer experiments grant power and do not count as earned world progression.

`src/maps/puzzle-checks.ts` records agreed world objectives. It currently names the two chiefs and power 3 from the prototype. It imposes no upgrade quota or full-clear requirement on new regions. A designated reasoning requirement or protected earliest power must be recorded explicitly; expert shortcuts are otherwise allowed.

`src/game/solver.ts` separates readable observations from deduction and records the supporting clues and bounds. The generator still uses the bounds profile so adding stronger reasoning does not silently change its scoring. `highestHiddenLevel` is a public roster limit, not a fact inferred from hidden map contents; update it with the player-facing legend when introducing stronger hidden monsters.

`src/game/puzzle-fixtures.ts` contains small authored examples, including shared groups, changing clues after kills and deliberately unresolved frontiers. `src/game/survey.ts` follows connected routes and revisits persistent maps as evidence and power change. The report includes each hidden move's proof, each find's reveal, reach and collection power, and whether each collected ground find was already revealed before the pickup step, using zero-based map coordinates and row-major tile IDs in proofs.

## Known weaknesses

- **Metrics need playtesting.** Layers, runs of basic moves and flood sizes expose things to inspect; they do not measure enjoyment. The village's 61% at power 1 may be too generous.
- **The solver has limits.** Shared-group reasoning currently subtracts subset neighbourhoods. It does not handle general overlap bounds or enumerate cases. Two move orders provide useful route checks, not exhaustive proof of minimum difficulty. NPC clues are excluded and people block walking, matching the displayed evidence and movement rules.
- **Monster placement is random.** Danger grows with distance and rings are stamped on, but there is no authored structure such as belts, gates or set-piece patterns.
- **Rings may be too obvious or too rare to teach anything.** We have not tested this with players.
- **Only levels 1–3 exist.** We do not yet know how readable clues stay at levels 4–6.

## Direction for new puzzles

[Puzzle design](puzzle-design.md) translates Minesweeper strategies into an authoring policy:

- Teach single-clue safety first, then require shared-group reasoning at selected progression milestones.
- Keep a route through the world without guessing about hidden threats. Known stronger monsters remain blocked until the player has enough power; their rewards cannot supply the power required to defeat them.
- Let experts reach some finds early. Check important progression dependencies explicitly instead of treating obscurity as a lock.
- Measure the reasoning needed to collect finds and reach routes, alongside the existing layer shares. Distinguish revealed ground from reachable ground.
- Author small encounters, vary them, then validate the complete placement from its actual entrances. Density alone is not a difficulty target.

Playtests still need to establish suitable clue sizes and monster mixes, how long chains remain readable on a phone, spacing between deductions and finds, and whether rings and other hints stay interesting after repetition.
