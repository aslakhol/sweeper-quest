# Prototype roadmap

## Phase 1: core loop

Ten generated 11×15 clearings, played in sequence, each hide 31 monsters at levels 1–3 around a visible level-4 chief. Kills earn XP that raises power; fights always resolve and cost hearts when the monster is stronger; running out of hearts is game over. Zeros flood open. A map test plays each clearing with a solver that only uses visible clues. See [decisions.md](decisions.md) for the reasoning and first tuning values.

This phase does not include rooms, tall grass, a shop, inventory items, dungeons, or saved games.

## Phase 2: starting area

Build one 10–15 minute adventure with a possible death along the way:

- A hand-authored roughly 24×32 overworld. The southern village begins revealed and contains the start, a shop, and one indoor room. The meadow has slimes, bats, two hidden heart pieces, and three shard spots. A western tall-grass zone farms coins. A cave entrance sits to the north.
- Room metadata in the text map. A zero floods connected zero tiles only within that indoor room, including their bordering clues. Outdoor revealing remains one ring.
- Tall-grass fog and fixed monster spawns reset on leaving the zone or dying. Overworld progress persists. Define which items, corpses, and notes reset before implementing this.
- A thumb-friendly shop sheet. Potion: 5 coins for 2 hearts. Bomb: 8 coins, reveals 3×3 and kills monsters at or below player power. Heart piece: 15 coins, sold once. Four pieces add one max heart.
- An approximately 8×8 generated dungeon with bats, normal level-3 goblins, and one chest containing a shard. Entering generates a fresh dungeon; leaving or dying resets it. Validate reachability and use seeded randomness for tests.
- A 2×2 level-5 boss. Represent it as one monster with multiple occupied tiles so clues count it once. Reward a heart container and Lantern; the Lantern opens the next-zone gate.
- Inventory, full HUD, and versioned localStorage saves with validation. Do not serialize animations, input state, or queued walking.

Build the overworld and room/reset rules first, then the shop and items, then the dungeon and boss. Add saving once the persistent/transient state boundary is settled.

## Decisions before Phase 2

1. **Progression.** Decided: XP from kills, with areas gated by visible strong monsters ([decisions.md](decisions.md)). Phase 2 still needs XP curves for powers 4 and 5 and a replacement for the shard spots and dungeon chest rewards.
2. **Boss combat.** Decided: fights always resolve and cost hearts by level gap, so a boss can be beaten below its level with enough hearts.
3. **Multi-tile clues.** Agree whether each boss tile shows the boss's own level as an adjacent threat, and how a single corpse and pickup occupy its footprint.
4. **Resets.** Decide which pickups are permanent in grass/dungeons and whether a reset clears notes. Retaining notes against regenerated layouts can mislead players.
5. **Mobile camera.** The Phase 1 board fits across the screen. The larger overworld needs a player-following viewport and a way to pan without accidentally walking or placing notes.

## Later

Additional zones and rule changes, traversal items, alternate number display, and hardcore mode remain outside this prototype.
