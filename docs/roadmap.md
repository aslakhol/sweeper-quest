# Prototype roadmap

[idea.md](../idea.md) is the consolidated game plan, including the intended multi-area adventure and open design questions. This roadmap tracks implementation stages. [decisions.md](decisions.md) records the reasoning behind the first playtest changes.

## Phase 1: core loop

Ten generated 11×15 clearings each hide 31 monsters at levels 1–3 around a visible level-4 chief. Kills earn XP that raises power; fights resolve in one action and cost hearts when the monster is stronger. Running out of hearts is game over. Zeros flood open, including revealed clues that become zero after a kill. A map test plays each clearing with a solver that only uses visible clues.

The game now plays a full-screen scratch village with a tall-grass meadow instead; the clearings remain as a balance test bank. They test deduction and combat balance. Their size, sequence, and fresh state between maps are not the intended world structure. This phase does not include rooms, tall grass, a shop, inventory items, dungeons, or saved games.

## Phase 2: starting area

Build one 10–15 minute adventure with a possible death along the way:

- A hand-authored roughly 24×32 overworld with a revealed southern village, shop, indoor room, meadow, western tall grass, and northern cave entrance. Replace the original sword-shard rewards with heart upgrades or tools. Power comes from kills, and visible strong monsters gate routes.
- Room and zone metadata in the text map. Flood reveal is the standard rule throughout; define boundaries and transitions for the larger world.
- Repeatable tall grass with fog and fixed-spawn resets on leaving, subject to XP and economy balancing. Decide how pickups, notes, and death interact with these resets.
- A thumb-friendly shop sheet and inventory. Revisit coins, potions, bombs, and heart upgrades together. The original prices and effects in [idea.md](../idea.md#shop-and-items) are proposals, not current rules.
- An approximately 8×8 generated dungeon with bats, goblins, and a chest containing a health or tool reward. The original entry/exit reset model remains a proposal pending persistence decisions. Validate reachability and use seeded randomness for tests.
- A 2×2 level-5 boss, counted once in neighboring clues. Apply the same level-gap combat rule as other monsters. Reward a heart container and Lantern; the Lantern opens the next-zone gate.
- Inventory, an appropriate HUD, and versioned localStorage saves with validation. Do not serialize animations, input state, or queued walking.

Resolve the questions below, then build the overworld and room/reset rules, shop and items, and dungeon and boss. Add saving once the persistent/transient state boundary is settled.

## Decisions before Phase 2

1. **Progression.** XP from kills is settled. Define curves through powers 4 and 5, reward placements, and the effect of repeatable grass encounters on progression.
2. **Health and death.** The core test has finite health, no healing, and game over on death. Decide how this extends across areas, whether respawning returns, and what survives death. Do not assume the original free respawn and retained progress.
3. **Economy and rewards.** Decide how coins return with a shop, whether healing is available, and how heart pieces or containers affect current health. Define bomb XP and reward behavior.
4. **Multi-tile clues.** Deduplicate the boss in neighboring sums. Define clues inside its footprint and where the player and remains go after victory.
5. **Resets.** Decide which pickups and exploration state persist in grass and dungeons, and when notes clear. Retaining notes against regenerated layouts can mislead players.
6. **Mobile panning and routing.** The camera follows the player; looking ahead still needs panning without accidental movement or notes. Decide whether a distant hidden target with no reachable revealed neighbor should walk at all.

## Later

Additional zones and rule changes, traversal items, alternate number display, and a distinct hardcore mode remain outside this prototype.
