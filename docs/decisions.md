# Decisions

## Finds replace XP

XP clicked on small maps, where going from weak to strong fits inside one board. On a larger map it broke: the tall grass held 121 XP against the 26 needed for max power, and at power 3 no ordinary dungeon monster could hurt you. More levels would only delay that. Starting each region at power 1 was rejected because a character should not lose strength in an RPG.

- **Kills give nothing.** Monsters are in the way. The reward is exploring, as in Zelda and Minesweeper.
- **Power and hearts come from finds.** Four whetstones raise power; four heart pieces add a heart. Chiefs can drop a whole one: a greatstone or a heart.
- **Whetstones, not shards.** Sharpening fits what power does: the same sword now cuts through what used to hurt you. A find is small enough that collecting four feels natural.
- **Level-ups are rare.** There should be a lot of game between them, so heart pieces, tools and secrets carry the everyday rewards.
- **Ground finds start hidden, then become visible before pickup.** Playtesting found it more satisfying to spot an item on the ground before collecting it. Prefer a flood or a free kill that reveals the item from another tile, followed by walking over to it. Do not show items through covered tiles or add a pickup confirmation. Terrain, rumours and monster groups can still hint where to explore. This is the default placement preference, not a ban on every instant discovery.
- **One world, not stages.** It holds more pieces than you need, and being stuck in one region and returning stronger is intended. Solvers check the whole world, not each region.
- **Hearts start at 3** so early damage is scary. Mum's full heal stays for now.
- **Death costs the walk back.** Game over offers Continue, which wakes you at home with the world unchanged. It is still a failure: maps are never balanced around dying.
- **Maps with finds are fixed.** Regenerated floors could be farmed.
- **Grinding is not possible, on purpose.** Monsters do not respawn, and a stuck player goes exploring instead.
- **Maps open in layers.** Each power opens part of a map, and a new level reopens old places with no extra mechanic. See [map-design.md](map-design.md).

### Rejected

- **XP with more levels.** It delays the problem and pushes clues and damage up with it.
- **Resetting power per region.** It kept the small-map feel but makes no sense for a character in an RPG.
- **XP capped by items.** It stops over-levelling, but every new region would need a whole ladder above the cap.
- **Showing every find from the start.** It gives direction but removes the mystery. A rare visible teaser is fine.
- **Spare pieces per stage.** Spares are counted across the world. There are no stages.

The original shards failed because they were too easy to reach: the first bundle took 7 taps and made 16 of 19 monsters harmless. Keeping finds rare and hidden is what fixes that, not the name.

## World authoring and progression

Key rewards, where they are placed and how they are obtained remain a collaboration with Aslak as the world develops. Agents should design the local deductions without requiring him to supervise puzzle construction. A complete progression budget is not a prerequisite for extending the world; record agreed dependencies as they emerge.

Regions may contain few or no power-up items. The test world's reward density compresses progression and should not carry into the larger adventure. Quests and shops may provide items and power outside explicit puzzles; their acquisition rules and costs will be designed alongside the world.

Partial access at a given power is intentional. The player explores elsewhere, grows stronger and returns to discover another door, reward or quest objective. Judge solvability and progression across the connected world and persistent visits. Do not require each region to supply an upgrade or be cleared on arrival, and do not insert rewards merely to make it self-contained. See [puzzle design](puzzle-design.md) for the authoring and validation policy.


## First playtest

The first demo could be won without reading a clue. The subsequent playtest also found forced guesses and required damage unsatisfying. The rules below incorporate both findings; the earlier model of paying hearts to kill a stronger monster is retired.

## Combat

- **Power determines whether a monster can die.** At or below your power, it dies for free and you enter its tile.
- **A hidden stronger monster survives.** Attacking reveals it and costs `level × (level − power)` hearts. The hero stays put, its clue stays hidden, nearby sums stay unchanged, and no reward or flood occurs. Losing the last heart is lethal.
- **Visible stronger monsters block attacks.** Once the danger is known, another tap is a misclick. The hero briefly shakes, with no damage or game-state change. This also applies to chiefs visible from the start. Return with enough power to fight.
- **Hearts cover mistakes, not passage.** Healing and repeated attacks cannot break a power gate.
- **Required progression is safe.** The connected world must have a route to its objectives without guessing or taking any damage. A region can remain partially blocked while another reachable region supplies clues, quests or upgrades. A required upgrade cannot be locked behind a monster that needs that upgrade.

The demo previously supplied only seven whetstones before the level-3 cave chief, whose greatstone supplied the missing power. With stronger monsters now surviving attacks, that became a circular dependency. Aslak chose to add an eighth whetstone elsewhere. It sits in the wood's power-2 north-east pocket; the chief keeps its reward. Clearing the demo can consequently reach power 4.

## Monsters and corpses

- **Monster tiles never show a clue while the monster is alive.** An unsuccessful attack leaves the living monster visible. Show its sprite without the underlying clue and tint it when it is stronger than you. Future reveal tools must follow the same rule. The level legend lists each monster's level.
- **Kills must be felt.** The monster appears, takes the hit and pops before the player steps in. Clues that change because of the kill visibly update.
- **Corpses become remains.** A faint species-specific mark is drawn under the tile's clue and never covers it. There is no corpse inspection.

## Board

- **Flood reveal is the only mode.** A zero opens its whole connected zero area and the bordering numbers. Remove the toggle.
- **Zeros are blank.**
- **The player's tile shows its clue like any other tile**, in the upper half with the hero below. Remove "Here: N".
- **Remove the start tile marker.**

## Coins

- **Coins are hidden finds.** They were removed because they had no use and cost taps. They came back to buy the shop's single whetstone, and are picked up by walking onto them like any other find.

## Deferred

- **Screen layout, HUD, status line and copy.** These will be redesigned from scratch later.
- **Note tools.** Revisit once the board plays like a real deduction puzzle.

## Tutorial start

A new game wakes up at home. Mum sends you to Doctor Madeleine's dojo, where she asks for help against the goblin chiefs and hands over a sword when you agree. Four short lessons teach the clue rules before the open world.

- **No sword means power 0.** The sword gives the first point of power, and whetstones add to it. Leaving the village before training is allowed but dangerous, because even a slime hurts. No extra lock is needed.
- **Lessons are separate maps without exits.** A lesson starts afresh each time on its `@`, and is won by defeating every monster at or below your power. That lets a lesson include a stronger monster to leave alone. Winning puts you back beside her for the next one.
- **The world survey trains for real.** It says yes, plays each lesson with the same deductions and must take no damage, so map checks also cover the tutorial.
- **The main quest ends the game.** The hero counts defeated chiefs. Returning to Doctor Madeleine with all three earns a Bachelor of Fighting and a completion screen. Continue keeps the world, and the survey collects the award as part of the world check.
- **Skip training is a debug shortcut** for playtesting new saves and for browser tests.

## Save slots

Three local save slots keep separate playthroughs during development. The menu and game-over screen offer a save picker, and switching saves the outgoing game first. Replacing an occupied slot requires confirmation.

An incompatible save stays stored, even when it was the active slot at startup. Autosave must not replace it with a fresh world. Download exports its original JSON for backup or manual repair; Import accepts a compatible file. The original single save is copied into Save 1 without changing its contents, and the legacy storage entry remains as a backup.
