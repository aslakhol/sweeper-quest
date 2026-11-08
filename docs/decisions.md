# Decisions

## Finds replace XP

XP clicked on small maps, where going from weak to strong fits inside one board. On a larger map it broke: the tall grass held 121 XP against the 26 needed for max power, and at power 3 no ordinary dungeon monster could hurt you. More levels would only delay that. Starting each region at power 1 was rejected because a character should not lose strength in an RPG.

- **Kills give nothing.** Monsters are in the way. The reward is exploring, as in Zelda and Minesweeper.
- **Power and hearts come from finds.** Four whetstones raise power; four heart pieces add a heart. Chiefs can drop a whole one: a greatstone or a heart.
- **Whetstones, not shards.** Sharpening fits what power does: the same sword now cuts through what used to hurt you. A find is small enough that collecting four feels natural.
- **Level-ups are rare.** There should be a lot of game between them, so heart pieces, tools and secrets carry the everyday rewards.
- **Most finds are hidden.** Showing them all would remove the mystery. Maps hint with terrain, rumours and rings of monsters.
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

The first demo could be won without reading a clue, so these rules make deduction the way you survive. They still stand. Its XP, run and tuning rules were replaced by the section above.

## Combat

- **Fights always resolve.** Attacking a monster always kills it. If its level is above your power, you take damage. You die only if that damage exceeds your remaining health.
- **Winning moves you onto the tile.** One tap per fight.
- **Taps on stronger monsters are never blocked.** Taking damage to get through is a legitimate choice, and the health bar is the warning.

## Monsters and corpses

- **Monster tiles never show a clue while the monster is alive.** Monsters are only revealed by fighting them, so a living monster is normally visible only during the fight. If something later reveals living monsters (bombs), show the sprite only and tint it when it is stronger than you. The level legend lists each monster's level.
- **Kills must be felt.** The monster appears, takes the hit and pops before the player steps in. Clues that change because of the kill visibly update.
- **Corpses become remains.** A faint species-specific mark is drawn under the tile's clue and never covers it. There is no corpse inspection.

## Board

- **Flood reveal is the only mode.** A zero opens its whole connected zero area and the bordering numbers. Remove the toggle.
- **Zeros are blank.**
- **The player's tile shows its clue like any other tile**, in the upper half with the hero below. Remove "Here: N".
- **Remove the start tile marker.**

## Removed for now

- **Coins.** They have no use yet and cost taps. They will be redesigned alongside a shop.

## Deferred

- **Screen layout, HUD, status line and copy.** These will be redesigned from scratch later.
- **Note tools.** Revisit once the board plays like a real deduction puzzle.
