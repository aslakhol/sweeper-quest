# Designing Minesweeper puzzles for Sweeper Quest

Keep the world fixed. Author places worth exploring, then use generation and solver checks to build deductions inside them. Most play should use readable local reasoning. At selected progression points, comparing clues must accomplish something that following small numbers cannot. Expert deductions can uncover finds early.

This is the authoring policy for new puzzles. Profiles A and B and the subset-subtraction part of C are implemented, with authored fixtures and connected-world reports. Profile D and general overlap bounds remain future work. [Map design](map-design.md) remains the reference for current mechanics. The strategy examples are derived for our weighted, changing clues; the linked sources describe the classic game and its relatives.

## Author within a connected world

Aslak and the agent develop key rewards, their acquisition and overall progression together as the world grows. There is no requirement to settle a complete progression budget before extending it. Agents handle local deduction design within the agreed world changes. They must not add or relocate power rewards just to make a region independently solvable or satisfy a puzzle metric.

Regions can have few or no power-up items. Quests supply items and power outside floor finds and monster drops: a villager rewards you for bringing back a keepsake found in the world. Shops remain to be designed. The dense rewards in the test world are not a template for new regions. Allow long stretches at the same power, with exploration, routes, discoveries and quest objectives giving those stretches purpose.

A region may be only partly accessible on the first visit. Returning stronger can expose another door, reward or quest objective, and may lead to further regions. Review that experience across visits and across the connected world. Local puzzle encounters are useful authoring examples and test fixtures, not a requirement to divide the adventure into self-contained boards or clear each region before leaving.

Record progression facts as they are agreed: where rewards come from, their prerequisites, and any dependencies that must remain intact. This record follows the evolving world design. An upgrade supplied by a quest or shop must eventually be validated through its actual prerequisites and costs. The world survey delivers keepsakes to their owners as it finds them. Until shops exist, label assumed entry power and external dependencies explicitly; a conditional region check does not prove that the whole world can reach that state.

## What to take from Minesweeper

Classic Minesweeper commonly distributes mines randomly. Randomness and guessing are separate choices: a generator can select boards that are solvable from a particular opening without guesses. Minesweeper Online offers both ordinary play and a no-guess mode. [Gameplay rules](https://minesweeper.online/help/gameplay)

Simon Tatham's generator runs a solver, changes placements when it gets stuck, and finally solves the finished board again from the start without further changes. Solvability depends on the opening. His warning about simply banning certain arrangements also matters here: placement conventions can become hidden clues that knowledgeable players exploit. [Generator design](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/mines-solver/)

Our generator already uses seeded randomness during authoring and writes fixed text maps. Keep that arrangement. The missing piece is judging the reasoning and exploration those maps produce.

The experience to aim for is a question the player can notice, enough evidence to answer it, and a useful consequence when they act. A good deduction might open a route, reveal a landmark, or simplify another clue. Several obvious moves can be welcome after a difficult inference. A wall of equally opaque numbers offers neither a starting point nor that release.

Those are design judgments for this game, not measured laws of Minesweeper enjoyment. Validate them by watching players explain their choices.

## What different players bring

These are useful authoring profiles, not formal skill ratings. A player may know one difficult pattern and miss an easy one in an unfamiliar shape.

| Player | Typical classic strategy | What we should support here |
| --- | --- | --- |
| Beginner | A satisfied number makes its remaining neighbours safe. If the remaining mine count equals the covered neighbours, all are mines. Marks help track deductions. | Read a small clue, subtract a visible monster, identify an isolated monster, and learn that free kills change nearby clues. |
| Intermediate | Compare overlapping neighbourhoods, subtract confirmed mines, recognise patterns such as 1-2-1, and carry deductions around corners. | Compare sums shared by two clues; bound a group without locating every monster; use a free kill or another approach to obtain the next clue. |
| Expert | Combine longer chains, eliminate hypothetical cases, enumerate configurations, use the global mine count, and reason about uncertainty. | Find less obvious bounds, approach from another entrance, expose secrets early, and choose moves that expose useful information without taking damage. |

Classic patterns depend on their complete neighbourhoods, not just the printed numbers. Reduction and shared groups explain many familiar patterns; longer chains and global mine counting extend them. [Pattern guide](https://minesweeper.online/help/patterns)

Experts also optimise execution through selective flagging, chording and planning openings. That is a separate skill from deduction. Our touch-first exploration game should reward fewer wasted steps without requiring speed or dexterity. [Efficiency guide](https://minesweeper.online/help/efficiency)

When guesses are unavoidable, the safest immediate square need not give the best chance of finishing. What it reveals matters too. Johnny Deuss's solver explicitly separates calculating probabilities from choosing a move. In our game, that suggests rewarding useful vantage points and shortcuts. It does not justify mandatory gambling. [Solver explanation](https://github.com/JohnnyDeuss/minesweeper-solver)

## Translate the reasoning, not the numbered patterns

Mamono Sweeper supplies the central idea: clues sum monster levels and monsters at or below your level are harmless. Its original progression uses combat XP and defeating all monsters. Our finds, changing clues and route-based goals need their own puzzle design. [Original Mamono Sweeper rules](https://hojamaka.com/game/mamosui_list2.html)

Let a hidden tile's value be its living monster's level, or zero if empty. Values are nonnegative integers. For each readable clue:

```text
sum of hidden neighbouring values
  = displayed clue − known living neighbouring monster levels

safe move:      highest possible target value <= player power
failed attack: level × (level − player power) damage; monster survives
```

"Free" means no damage, even if there is a monster. Surviving an attack on a stronger monster does not let you enter its tile. Multiple hidden arrangements can remain possible while a move is certainly free. We do not need a unique solution for every monster.

Only subtract living monsters from the current displayed clue. A corpse's contribution has already disappeared. Notes are hypotheses unless proved. A regional monster cap is usable evidence only if the player knows it; never infer it from hidden map contents or the generator's settings.

### Single clues and level bounds

At power 1, every neighbour of a 1 is free. At power 2, every neighbour of a 2 is free. A 4 beside a known living level-3 chief leaves just 1 for all its other neighbours, making those tiles free at power 1.

A large clue does not prove that any particular tile is dangerous. A 3 could mean one goblin, a bat and a slime, or three slimes. Counting three unknown neighbours beside a 3 does not prove that they are three slimes.

Bounds generalise the simple rule. If a clue's remaining sum is `r`, a target's upper bound is at most `r` minus the other neighbours' proven lower bounds. Its lower bound is at least `r` minus their upper bounds. Repeating this propagates information between clues. This is what `levelBounds` already does.

### Shared groups are the main intermediate mechanic

Suppose two readable clues have exactly these unknown neighbours, after subtracting known contributions:

```text
A: a + b     = 3
B: a + b + c = 4
```

The shared group contributes 3 to both clues, so `c = 1`. At power 1, c is free even though neither displayed number is small enough for the beginner shortcut. The positions of the monsters in a and b remain unresolved.

One possible geometry is below. Letters are hidden floor, numbers are revealed empty floor, and `#` is wall. These are displayed clues, not map-file symbols. An actual placement is a slime at a, a bat at b, and a slime at c.

```text
# # # # #
# a b c #
# 3 4 # #
# # # # #
```

From the 4, the diagonal step into c is legal under our movement rule. Killing c changes 4 to 3 and exposes c's own clue. In the stated placement that clue is 2, identifying b as the bat and a as the slime. One comparison creates another useful deduction.

The same principle works without exact identification:

```text
A: a + b         = 3
B: a + b + c + d = 4
therefore c + d  = 1
```

Both c and d are free at power 1. Do not force players to determine which is empty. If both clue totals were 3 instead, both extra tiles would be empty. These are reusable relationships, provided the map geometry really gives those neighbourhoods and no additional unknown contributors.

### Longer combinations belong in optional challenges

For a logical example with three pairwise sums:

```text
a + b = 3
b + c = 3
a + c = 4
```

The first two imply `a = c`; the third gives `a = c = 2`, then `b = 1`. At power 1, b is free. This is an equation example, not a complete playable layout. A map must make all three clues readable and b physically reachable.

More generally, test an assumption such as "this tile is above my power". If every such assignment contradicts visible clues, the tile is free. Start with short, inspectable deductions. Exhaustive search finding a move does not establish that a human will enjoy finding it.

Classic endgame mine counting has no equivalent unless we deliberately reveal a total. Do not give our solver the hidden number of monsters, their level distribution, the location of finds, or knowledge that a particular reward must be reachable.

## Rules for authoring new maps

1. **Give each required deduction a consequence.** It should reach new clues, a route, a find or a useful landmark. Counting an optional deduction somewhere on the map does not establish that progression needs it.
2. **Teach before requiring.** Introduce one relationship with few unknown tiles and visible supporting clues. Repeat it with a different orientation or level total, then combine it with something familiar. Teach through small encounters and feedback; avoid tutorial paragraphs in the map UI.
3. **Require comparisons at selected milestones.** Early exploration can use single clues. Later, a player who only follows small numbers must eventually need to compare clues to advance through the adventure. The payoff can be a route, door or quest objective, without a power reward. Do not require a new trick at every find or impose a difficulty quota on every region.
4. **Keep required proofs local enough to read on a phone.** The first shared-group puzzles should fit in one camera view. Longer chains and evidence from another approach can appear later. Offscreen clues increase memory and navigation demands independently of logic.
5. **Provide a route through the world without guessing hidden threats.** Individual areas may stop yielding progress. Somewhere else reachable must provide evidence, a suitable reward, or a damage-free fight. Never require a guess, a damaging attack to obtain information, or damage to pass a known monster. Validate required upgrades independently of the monsters they unlock.
6. **Let expertise open soft gates early.** A find intended for power 2 may be deducible at power 1. Report that; do not automatically reject it. If early access breaks the world, use an actual traversal restriction or a known monster above the earlier power. Obscurity is not a reliable lock.
7. **Make kills change the puzzle usefully.** Place some free monsters where their removal clarifies another frontier or triggers a satisfying opening. Confirm the next step from the resulting clues, rather than assuming that any kill improves the route.
8. **Protect discovery from accidental floods.** Inspect what becomes visible and what can actually be walked to. Floods can cross diagonals that movement cannot. A find seen early is different from a find collected early.
9. **Vary the work between rewards.** Alternate small deductions, short chains, openings, choices of route and returns to familiar places. Long corridors of identical forced taps add labour without teaching anything.
10. **Use scenery and rumours to direct attention.** A suspicious pocket is a reason to investigate, not mathematical proof that it is safe. Monster rings should be one clue among several, with variations; a repeated stamp can become a lookup answer.

The main route should eventually expect intermediate reasoning. Optional finds can ask for harder combinations. A returning player may overpower an old puzzle, and an expert may solve it early. Both are useful expressions of mastery, provided the world still offers worthwhile deductions elsewhere.

### Health and uncertainty

Required progression must be possible without guessing or taking any damage. Hearts are protection against mistakes. A stronger monster survives every attack until the player's power reaches its level, so neither spare hearts nor repeated healing can buy passage. Its tile exposes the monster's identity, not its clue; it still contributes to neighbouring sums. Solvers must not spend health to obtain that identity.

Every hidden move on a validated route needs an upper bound at or below current power, derived only from readable evidence and the public monster roster. A lucky guess at an actually harmless tile does not count. A known monster is attackable on that route only at or below power. If all reachable regions stall before the required objectives, reject the world until there is a demonstrated safe route. Do not silently add rewards or lower objectives to make it pass.

A region may remain unresolved until growth elsewhere. Check that the upgrade can be obtained without crossing the gate it unlocks. Quests must include safely obtaining and delivering their items. Difficult logic is allowed, but a solver stall is not proof that no logic exists. Until the available tools can explain a safe route, mark progression unverified and repair the encounter or extend the reasoning with a tested example.

Do not assign a "50% chance" merely because two arrangements fit. Hand-authored placements have no automatically justified probability distribution. Use guaranteed bounds for acceptance checks. Players may guess, but no required route may depend on their doing so.

## Reusable puzzle encounters

| Encounter | What the player learns | What to verify |
| --- | --- | --- |
| Small clue at the first frontier | A weak monster is as safe as empty floor. | The entry exposes evidence before an uncertain step. |
| Extra tile beside a shared group | Subtract two overlapping sums. | The weaker solver cannot bypass the comparison through another exposed clue. |
| Extra group with a small total | Every member can be safe without exact identities. | Each extra tile's bound is at most power; the needed tile is reachable. |
| Free kill beside a blocked route | Removing a monster changes evidence and may open ground. | The kill is provably free before the reveal, and the resulting state advances exploration. |
| Pocket approached from two sides | Walking elsewhere can supply a missing clue. | The second approach itself is available without guessing. |
| Route that opens after a power increase | An old bound becomes sufficient at the new power. | Real progression reaches the upgrade elsewhere; the return produces meaningful access. |
| Optional pocket with a short contradiction | Combine several clues to beat the intended power. | Early access is affordable for the world economy and not required for ordinary progress. |

Author an encounter's terrain and intended evidence first. Generate surrounding placements afterwards, preserving the encounter's neighbourhoods. Rotate, reflect and vary sums, then revalidate; a pattern's name is never a correctness check.

## Encode difficulty as solver capabilities

Use nested profiles with the same movement, combat and observation rules. Each profile includes the previous one's deductions.

| Profile | Allowed reasoning | Purpose |
| --- | --- | --- |
| A: direct | Remaining clue at or below power; exactly one unknown; known visible monster subtraction. | Test introductory play and detect trivial progression. |
| B: bounds | Repeated single-clue lower and upper bounds, as in today's solver. | Test practiced local reasoning. This can include long chains and is not automatically beginner-friendly. |
| C: groups | Subtract subset neighbourhoods and propagate results. General partial-overlap rules can be added when needed. | Intended ceiling for most required puzzle reasoning. Subset subtraction is implemented. |
| D: cases | Bounded contradiction or complete enumeration of a small connected constraint component. | Future audit for optional challenges and early access. Timeouts mean unknown, not impossible. |

Run the cheapest available rule first and record an explanation for each bound and move: supporting clues, contributing deductions, target bound, power and resulting access. Keep rule complexity, number of dependent steps and spatial spread separate. A profile gives an upper bound on the reasoning needed, not a validated human difficulty score.

For a designated comparison milestone, exhaust B's accessible progress across the implemented world, including alternative finds, revisits and earned upgrades. Include quest and shop rewards with their real prerequisites when those systems exist. If B reaches the milestone, a harder move in C's chosen route proves nothing. Accept the intended comparison requirement when B stalls short and C reaches it under the same no-guess, no-damage policy. Check A separately when the lesson is simply to go beyond small clues. Apply this requirement only to agreed milestones; a region being partly blocked at a given power is expected, not a validation failure.

A stalled run shows a limitation of that strategy and route policy, not mathematical impossibility. Try alternative move and area orders when they affect access or information. Do not label a progression requirement "proved necessary" from one greedy trace. Keep stronger proofs and lower-skill bypass searches as different checks.

### What the current tools certify

`observe` exposes readable clues, known living contributions and hidden tile positions. `deduce` receives only that observation. NPC tiles supply no clue, notes carry no authority and hidden rewards cannot guide deductions. Tests enumerate small constraint systems to check that every valid assignment stays inside the solver's bounds.

`surveyWorld` follows real paths and exits, collects rewards encountered along the way, and revisits persistent maps after new evidence or upgrades. It refuses hidden moves whose upper bound exceeds power and every known monster above power. Any damage invalidates the survey, even if healing later restores those hearts. Healing remains available when surveying a state after a player mistake, through an actual visit to a healer. Separate connected parts of a map remain separate until an actual route reaches them.

`pnpm maps:check` runs all three profiles in forward and reverse candidate order. Both tested groups runs must each reach all declared objectives in a single playthrough without guessing or damage. A tested safe move order that stalls is a failure to investigate, not a warning to ignore. A designated `requiresBeyond` check fails if a tested weaker strategy reaches that objective. This detects observed bypasses; failure to find one in two orders is not proof that none exists. The command reports which move opened a frontier and the evidence behind it, rather than claiming a human difficulty rating.

`measureLayers` distinguishes visible from reachable floor at successively granted powers. `openLayers` keeps its original revealed-floor result for the generator. These conditional experiments are separate from surveys that earn upgrades.

The prototype regression tests still check that B can collect its current finds and that its existing layer ranges hold. Those checks describe this test world. Replace that expectation deliberately when introducing worlds that require C; keep the agreed world objectives checked by C. New regions do not inherit a full-clear or upgrade requirement.

The public hidden-level cap is currently 3. At power 3 the cap alone makes ordinary hidden monsters harmless. A 100% layer there is not evidence of puzzle quality. The checker rejects hidden monsters above that cap; update the player-facing roster and solver domain together.

## What to measure

Reject failures of the agreed progression contract before ranking candidates. A nice distribution of layer percentages cannot compensate for a missing required route.

| Check | Record | Acceptance policy |
| --- | --- | --- |
| Whole-world progression | Rewards acquired from all implemented sources, upgrades earned, reachable exits and objectives, health and deaths. | Both tested C routes reach the agreed objectives without guesses or any damage, respecting actual prerequisites. Health and healing cannot substitute for power. The ending is checked when it exists. Neither full regional clears nor collection of every optional find is required. |
| Return visits | Newly reachable doors, routes, rewards and objectives after an earned power or item upgrade. | Check the intended reasons to return using persistent map state. Regions need not supply their own upgrades. |
| Required learning | Earliest milestone reached by A, B and C. | At selected later milestones, the designated weaker profile stalls and C succeeds. Check alternative reward routes. |
| Early access | Earliest reveal and collection of each key find by profile and power. | Report expert shortcuts. Reject only those violating an explicitly protected progression dependency. |
| Proof readability | Rule, dependency depth, number of clues, and their spatial span. | Review required proofs on a phone; tune limits from playtests. |
| Payoff and repetition | New reachable frontier, routes or finds per deduction; runs of repeated trivial moves. | Prefer useful consequences and varied sequences. Do not maximise total deduction count. |
| Flood behaviour | Initial and post-kill reveal sizes, exposed rewards, unreachable revealed floor. | Preserve intended discoveries while allowing satisfying openings. |
| Safe progression | Proven upper bound and power before each hidden move; level of each known opponent; damage over the entire route. | Every hidden bound and known opponent is at or below power. Total fight damage is zero. Unsuccessful attacks cannot be used to gather required evidence. |

Track total monster density, harmful-monster density at each power, clue sizes and the number of unknown neighbours as diagnostics. None alone defines difficulty. Strong monsters can make a dense region inaccessible; free monsters can make the same density easy to dismantle. Larger sums may increase arithmetic without adding an interesting decision.

Classic 3BV measures clicks needed to clear a board without flags. Use that as a reminder to measure interaction cost separately from reasoning. Our analogue is movement, repeated frontier taps and backtracking, not a claim that more clicks make a better puzzle. [3BV definition](https://minesweeper.online/help/gameplay)

Layer percentages remain useful for tuning how much a power increase opens. They should be diagnostics per region and profile, not identical quotas for every future map. A village, a narrow cave and an optional dangerous wood can have different jobs.

## Workflow for agents extending the world

1. Read the region's purpose and the agreed reward changes. State its entrances, expected early access, reasons to return, and any dependency on a future quest, shop or traversal item. Choose local layouts and deductions autonomously. Keep key rewards and acquisition rules within the world changes agreed with Aslak.
2. Use `src/game/puzzle-fixtures.ts` as worked examples. Make each intended deduction lead to evidence, a route, a discovery or an objective. Check the complete neighbourhood when adapting an example. Avoid filling a region with repeated stamps or inserting an upgrade to resolve a local stall.
3. Update `src/maps/puzzle-checks.ts` only for agreed objectives. A coordinate objective can require `revealed`, `reachable`, `collected` or `defeated`; a power objective checks an earned upgrade. Set `requiresBeyond: 'direct'` or `'bounds'` only at a designated learning milestone. Set `notBeforePower` only for an explicitly protected dependency. Ordinary intended access powers are tuning notes, not locks.
4. Run `pnpm maps:check` and inspect `output/map-checks/report.txt`. Fix failures in the map or implementation without quietly removing an objective or lowering its requirements. Review the partial layers, return visits, proofs, long stretches of basic moves and large floods. Any fight damage or globally stalled tested groups route is an error. A warning does not automatically disqualify a map.
5. Inspect relevant actions in `report.json`. Each hidden move includes its level upper bound, supporting clue snapshots and a deduction chain. Proof tile IDs are `y * mapWidth + x`; coordinates are zero-based. Check when a find first becomes visible, reachable and collected. Check the intended comparison actually affects access, including alternative routes.
6. Inspect the real reveal sequence at phone size when changing a map's layout. Confirm that the evidence can be noticed, the consequence is useful and returning feels worthwhile. Logical checks cannot establish these qualities. Run `pnpm check` before handing back the change.
7. Include a short authoring note with the change: the region's role, intended deductions, unresolved areas at entry power, reasons to return, agreed rewards or external dependencies, and any validation warnings. Report assumed future upgrades as assumptions. Do not claim a complete world route until their actual acquisition rules are implemented and checked.

The current objectives cover the prototype's two chiefs and power 3. No comparison milestone is declared yet, so the checker explicitly reports that intermediate reasoning is not required by the acceptance policy. The next world-design work can choose where that requirement belongs.

## Further work when needed

Add general overlap bounds or expert case analysis when a real encounter calls for them. Expand route-order checks if the reports reveal meaningful order dependence. Integrate quest and shop rewards through their real prerequisites and costs as those systems are built.

The generator still ranks its candidates by the original bounds-profile layer targets. Use the new reports to inspect the selected map before building richer scoring or local repair. Replay the final, unmodified placement after any adjustment. Human playtests should establish suitable pacing and proof size before turning those preferences into numeric acceptance thresholds.
