# Prototype roadmap

[idea.md](../idea.md) is the consolidated game plan, including the intended multi-area adventure and open design questions. This roadmap tracks implementation stages. [decisions.md](decisions.md) records the reasoning behind the first playtest changes.

## Phase 1: core loop

A small connected world: a village with a tall-grass meadow to the west, a fixed cave to the north and a wood to the east, plus enterable houses with people to talk to. Monsters of levels 1–3 hide on layered maps with visible level-3 chiefs. Kills give nothing. Hidden whetstones and heart pieces raise power and hearts, and chiefs drop a whole upgrade. Fights resolve in one action and cost hearts when the monster is stronger; the hero starts on 3 hearts. A solver tours the whole world using only visible clues.

This world tests layered maps and returning stronger. Its size and density of finds are not the intended structure. This phase does not include a shop, inventory, or tools.

## Phase 2: starting area

Build one 10–15 minute adventure with a possible death along the way:

- A hand-authored roughly 24×32 overworld with a revealed southern village, shop, indoor room, meadow, western tall grass, and northern cave entrance. Whetstones and heart pieces are mostly hidden, and maps open in layers.
- Room and zone metadata in the text map. Flood reveal is the standard rule throughout; define boundaries and transitions for the larger world.
- Larger regions connected into one world, with enough play at each power that level-ups stay rare.
- A thumb-friendly shop sheet and inventory. Revisit coins, potions, bombs, and heart upgrades together. The original prices and effects in [idea.md](../idea.md#shop-and-items) are proposals, not current rules.
- A fixed dungeon with bats, goblins, and a chest containing a health or tool reward. Validate reachability.
- A 2×2 level-5 boss, counted once in neighboring clues. Apply the same level-gap combat rule as other monsters. Reward a heart container and Lantern; the Lantern opens the next-zone gate.
- Inventory, an appropriate HUD, and versioned localStorage saves with validation. Do not serialize animations, input state, or queued walking.

Resolve the questions below, then build the overworld and room/reset rules, shop and items, and dungeon and boss. Saves live in `localStorage` for now; a more durable store comes later.

## Decisions before Phase 2

1. **Progression.** Found whetstones and heart pieces are settled. Define how far power goes and how many finds the world holds.
2. **Health and death.** The core test has finite health, free full healing from Mum in the village, and game over on death. Death costs the walk back from home; decide whether it should cost more.
3. **Economy and rewards.** Decide how coins return with a shop, how healing is priced, and whether the shop sells a whetstone. Define bomb behavior.
4. **Multi-tile clues.** Deduplicate the boss in neighboring sums. Define clues inside its footprint and where the player and remains go after victory.
5. **Resets.** Monsters and finds stay gone. Decide when notes clear.
6. **Mobile panning and routing.** The camera follows the player; looking ahead still needs panning without accidental movement or notes. Decide whether a distant hidden target with no reachable revealed neighbor should walk at all.

## Later

Additional zones and rule changes, traversal items, alternate number display, and a distinct hardcore mode remain outside this prototype.
