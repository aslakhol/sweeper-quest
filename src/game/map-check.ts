import { areas } from '../maps';
import { mapObjectives } from '../maps/puzzle-checks';
import { createGame, type Point, same } from './game';
import { puzzleFixtures } from './puzzle-fixtures';
import { deduce, highestHiddenLevel, measureLayers, observe, solverProfiles } from './solver';
import { type MoveOrder, type Survey, surveyWorld } from './survey';
import type { AreaId } from './world';

export type MapObjective = { name: string; requiresBeyond?: 'direct' | 'bounds' } & (
  | { kind: 'power'; power: number }
  | {
      kind: 'revealed' | 'reachable' | 'collected' | 'defeated';
      area: AreaId;
      at: Point;
      notBeforePower?: number;
    }
);

export function objectivePower(run: Survey, objective: MapObjective) {
  if (objective.kind === 'power')
    return run.world.game.hero.power >= objective.power ? objective.power : undefined;
  return run.access.find(
    (entry) => entry.area === objective.area && same(entry.at, objective.at),
  )?.[objective.kind];
}

export function assessObjectives(runs: Survey[], objectives: readonly MapObjective[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const intended = runs.filter((run) => run.profile === 'groups');
  const completing = intended.filter((run) =>
    objectives.every((objective) => objectivePower(run, objective) !== undefined),
  );
  if (!completing.length)
    errors.push(
      'No groups run reaches all agreed objectives in one playthrough. Progression is not certified.',
    );
  else if (completing.length !== intended.length)
    warnings.push(
      'Some groups move orders stall before the objectives. Inspect the successful route and the stalled frontiers.',
    );
  for (const objective of objectives) {
    const weakerProfile = objective.requiresBeyond;
    if (weakerProfile) {
      if (!runs.some((run) => run.profile === weakerProfile))
        errors.push(
          `${objective.name}: no ${weakerProfile} run was recorded to check the reasoning requirement.`,
        );
      const bypass = runs.find(
        (run) =>
          solverProfiles.indexOf(run.profile) <= solverProfiles.indexOf(weakerProfile) &&
          objectivePower(run, objective) !== undefined,
      );
      if (bypass)
        errors.push(
          `${objective.name}: ${bypass.profile}/${bypass.order} bypasses the designated reasoning requirement.`,
        );
    }
    if (objective.kind !== 'power' && objective.notBeforePower !== undefined) {
      for (const run of runs) {
        const power = objectivePower(run, objective);
        if (power !== undefined && power < objective.notBeforePower)
          errors.push(
            `${objective.name}: ${run.profile}/${run.order} reaches it at power ${power}, before protected power ${objective.notBeforePower}.`,
          );
      }
    }
  }
  if (!objectives.some((objective) => objective.requiresBeyond))
    warnings.push(
      'No required comparison milestone is configured. This prototype is not certified to require intermediate reasoning.',
    );
  if (
    runs.some(
      (run) =>
        run.profile === 'direct' &&
        objectives.every((objective) => objectivePower(run, objective) !== undefined),
    )
  )
    warnings.push(
      'Direct clue reading reaches all current objectives in at least one tested order.',
    );
  return { errors, warnings };
}

function summarize(run: Survey) {
  const regions = [...run.world.visited].map(([area, game]) => {
    const access = run.access.filter((entry) => entry.area === area);
    return {
      area,
      width: game.width,
      height: game.height,
      floor: game.tiles.filter((tile) => tile.terrain === 'floor').length,
      revealed: access.filter((entry) => entry.revealed !== undefined).length,
      reachable: access.filter((entry) => entry.reachable !== undefined).length,
      collected: access.filter((entry) => entry.collected !== undefined).length,
      remainingFinds: game.tiles.filter((tile) => tile.find).length,
    };
  });
  let basicRun = 0;
  let longestBasicRun = 0;
  for (const action of run.actions) {
    if (
      action.kind === 'deduction' &&
      !action.proof?.deductions.some((proof) => proof.rule === 'subset') &&
      !action.events.some((event) => event.type === 'find')
    ) {
      basicRun++;
      longestBasicRun = Math.max(longestBasicRun, basicRun);
    } else if (action.kind !== 'walk') basicRun = 0;
  }
  return {
    profile: run.profile,
    order: run.order,
    hero: { ...run.world.game.hero },
    regions,
    frontierMoves: run.actions.filter((action) => action.kind === 'deduction').length,
    subsetMoves: run.actions.filter((action) =>
      action.proof?.deductions.some((proof) => proof.rule === 'subset'),
    ).length,
    damage: run.actions
      .flatMap((action) => action.events)
      .reduce((sum, event) => sum + (event.type === 'fight' ? event.damage : 0), 0),
    healingVisits: run.actions.filter((action) =>
      action.events.some((event) => event.type === 'heal'),
    ).length,
    largestReveal: Math.max(0, ...run.actions.map((action) => action.revealed)),
    longestBasicRun,
    objectives: mapObjectives.map((objective) => ({
      name: objective.name,
      power: objectivePower(run, objective),
    })),
    access: run.access,
    visits: run.visits,
    actions: run.actions,
  };
}

export function checkMaps() {
  const errors: string[] = [];
  const fixtures = puzzleFixtures.map((fixture) => {
    const game = createGame(fixture.map, { legend: fixture.legend });
    const target = fixture.target.y * game.width + fixture.target.x;
    const profiles = solverProfiles.map((profile) => {
      const high = deduce(observe(game), profile).bounds.get(target)?.high;
      if (high !== fixture.high[profile])
        errors.push(
          `${fixture.name}: ${profile} gives ${high}, expected ${fixture.high[profile]}.`,
        );
      return { profile, high };
    });
    return { name: fixture.name, lesson: fixture.lesson, profiles };
  });
  const layers = [];
  for (const area of Object.keys(areas) as AreaId[]) {
    const spec = areas[area];
    // Each supported entry is a separate conditional experiment, with fresh state initially and
    // persistent kills/reveals as power rises. None of these granted upgrades count as world progress.
    const entrances = [...new Set(Object.values(spec.exits).map((exit) => exit.to))];
    const starts: (string | undefined)[] =
      area === 'village' ? [undefined, ...entrances] : entrances;
    for (const from of starts) {
      const initial = createGame(spec.map, { legend: spec, from });
      if (
        initial.tiles.some(
          (tile) => !tile.revealed && tile.monster && tile.monster.level > highestHiddenLevel,
        )
      )
        errors.push(
          `${area}: hidden monster exceeds the public solver cap of ${highestHiddenLevel}.`,
        );
      for (const profile of ['bounds', 'groups'] as const) {
        const game = createGame(spec.map, { legend: spec, from });
        const hidden = game.tiles.filter((tile) => tile.terrain === 'floor' && !tile.revealed);
        const measured = measureLayers(game, highestHiddenLevel, profile);
        layers.push({
          area,
          from: from ?? 'start',
          profile,
          initiallyHidden: hidden.length,
          powers: Array.from({ length: highestHiddenLevel }, (_, index) => {
            const power = index + 1;
            return {
              power,
              revealed: hidden.filter((tile) => (measured.revealed.get(tile) ?? Infinity) <= power)
                .length,
              reachable: hidden.filter(
                (tile) => (measured.reachable.get(tile) ?? Infinity) <= power,
              ).length,
            };
          }),
        });
      }
    }
  }
  const runs = solverProfiles.flatMap((profile) =>
    (['forward', 'reverse'] satisfies MoveOrder[]).map((order) => surveyWorld({ profile, order })),
  );
  const assessment = assessObjectives(runs, mapObjectives);
  // Preserve the existing prototype dependency without assuming that every future area holds power.
  const villageOnly = surveyWorld({ profile: 'bounds', destinations: [] });
  if (villageOnly.world.game.hero.power > 1)
    errors.push(
      'The village alone now supplies power 2. Review the existing requirement to explore elsewhere.',
    );
  return {
    errors: [...errors, ...assessment.errors],
    warnings: assessment.warnings,
    limitations: [
      'Two deterministic move orders are evidence, not exhaustive route search or a proof of minimum difficulty.',
      'Groups implements subset subtraction. General overlap bounds and expert case analysis are not implemented.',
      'Conditional layers grant power; actual world surveys earn it. Partial regions are allowed.',
      'Shops and traversal items are not implemented. Quest rewards are earned by delivering keepsakes.',
      'Repetition and flood sizes are review diagnostics, not calibrated measures of enjoyment.',
    ],
    objectives: mapObjectives,
    fixtures,
    layers,
    runs: runs.map(summarize),
  };
}

export function formatMapCheck(report: ReturnType<typeof checkMaps>) {
  const lines = [
    `Map checks: ${report.errors.length ? 'FAILED' : 'PASSED'}`,
    ...report.errors.map((error) => `ERROR: ${error}`),
    ...report.warnings.map((warning) => `REVIEW: ${warning}`),
    '',
    'World runs: real rewards, persistent maps, hidden moves cost no health.',
  ];
  for (const run of report.runs) {
    lines.push(
      `${run.profile}/${run.order}: power ${run.hero.power}, hearts ${run.hero.health}/${run.hero.maxHealth}, ${run.frontierMoves} frontier moves, ${run.subsetMoves} using shared groups, ${run.damage} known-fight damage, ${run.healingVisits} healing visits`,
      `  Largest step reveal: ${run.largestReveal}; longest run without a find or group comparison: ${run.longestBasicRun}`,
    );
    for (const objective of run.objectives)
      lines.push(
        `  ${objective.name}: ${objective.power === undefined ? 'not reached' : `power ${objective.power}`}`,
      );
    for (const region of run.regions)
      lines.push(
        `  ${region.area}: ${region.revealed}/${region.floor} visible, ${region.reachable} reached, ${region.collected} finds collected, ${region.remainingFinds} finds remain`,
      );
    const seen = new Set<AreaId>();
    for (const visit of run.visits) {
      if (seen.has(visit.area) && (visit.revealedAfter > visit.revealedBefore || visit.collected))
        lines.push(
          `  Return to ${visit.area} at power ${visit.powerOnEntry}: ${visit.revealedAfter - visit.revealedBefore} new visible tiles, ${visit.collected} finds`,
        );
      seen.add(visit.area);
    }
  }
  lines.push(
    '',
    'Conditional layers: cumulative visible / reachable out of initially hidden floor. Granted power, not earned progression.',
  );
  for (const layer of report.layers) {
    if (!layer.initiallyHidden) continue;
    lines.push(
      `${layer.area} from ${layer.from}, ${layer.profile}: ${layer.powers.map((entry) => `P${entry.power} ${entry.revealed}/${entry.reachable}`).join('; ')} of ${layer.initiallyHidden}`,
    );
  }
  lines.push('', 'Authored examples:');
  for (const fixture of report.fixtures) lines.push(`  ${fixture.name}: ${fixture.lesson}`);
  lines.push('', 'Limits:', ...report.limitations.map((line) => `  ${line}`));
  return `${lines.join('\n')}\n`;
}
