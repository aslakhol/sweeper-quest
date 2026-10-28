# Decisions after the first playtest

The Phase 1 demo is winnable without reading a single clue. A bot that bumps the nearest unknown tile wins in about 105 taps with one free death. The first shard bundle is reachable in 7 taps, after which 16 of 19 monsters are harmless. These decisions aim to make deduction the way you survive, not an optional extra.

## Run structure

- **Death is game over.** Show a game over screen with Start over. Nothing carries between runs. A respawn mechanic may return once the game has many areas.
- **Health does not refill** within a run. Health is the resource that deduction protects.

## Progression

- **Power comes from XP earned by kills.** Stronger monsters give more XP. Shards are removed.
- **Each area holds about 1.5× the XP needed to level up through it**, so players level up after clearing most of the deducible monsters rather than hunting for the last slime.
- **Areas are gated by visible monsters, not XP thresholds.** A row of high-level monsters blocks a path. You can fight through, but only by spending more health than you have.
- **Exploration rewards are heart containers and tools**, not power.

This answers roadmap decisions 1 (progression) and 2 (boss combat).

## Combat

- **Fights always resolve.** Attacking a monster always kills it. If its level is above your power, you take damage. You die only if that damage exceeds your remaining health.
- **Winning moves you onto the tile.** One tap per fight.
- **Taps on stronger monsters are never blocked.** Taking damage to reach a level-up is a legitimate choice, and the health bar is the warning.

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
- **Tapping a distant hidden tile.** Today it walks to the closest revealed tile in a straight line, which may not border the target. Later it should walk only when a revealed neighbor of the target is reachable.

## Open questions

- **Damage formula** for fighting a stronger monster. Start with damage scaling with the level difference, and tune it against a full-health budget for the demo.
- **XP values per monster and level thresholds.**
- **Demo map.** It needs rebuilding so the player spends most of the run weaker than most monsters around them, with level-ups found by deduction.
