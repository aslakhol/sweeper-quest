import { describe, expect, it } from 'vitest';
import { assessObjectives, checkMaps, type MapObjective } from './map-check';
import type { SolverProfile } from './solver';
import type { Survey } from './survey';
import { createWorld } from './world';

function run(profile: SolverProfile, reached: number[], power = 1): Survey {
  return {
    profile,
    order: 'forward',
    world: createWorld(),
    actions: [],
    visits: [],
    access: reached.map((x) => ({ area: 'wood', at: { x, y: 0 }, collected: power })),
  };
}
const objective: MapObjective = {
  name: 'An agreed quest item',
  kind: 'collected',
  area: 'wood',
  at: { x: 1, y: 0 },
};

describe('authoring acceptance checks', () => {
  it('requires one playthrough to satisfy all objectives rather than mixing incompatible runs', () => {
    const assessment = assessObjectives(
      [run('groups', [1]), run('groups', [2])],
      [objective, { ...objective, name: 'Another item', at: { x: 2, y: 0 } }],
    );
    expect(assessment.errors).toContainEqual(expect.stringContaining('one playthrough'));
  });

  it('checks designated comparison requirements against simpler complete runs', () => {
    const requirements = [{ ...objective, requiresBeyond: 'bounds' as const }];
    expect(
      assessObjectives([run('bounds', [1]), run('groups', [1])], requirements).errors,
    ).toContainEqual(expect.stringContaining('bypasses'));
    expect(assessObjectives([run('bounds', []), run('groups', [1])], requirements).errors).toEqual(
      [],
    );
  });

  it('allows early access by default and rejects it only for a protected dependency', () => {
    const runs = [run('groups', [1])];
    expect(assessObjectives(runs, [objective]).errors).toEqual([]);
    expect(assessObjectives(runs, [{ ...objective, notBeforePower: 2 }]).errors).toContainEqual(
      expect.stringContaining('before protected power 2'),
    );
  });

  it('allows partially solved regions but rejects a tested order that stalls globally', () => {
    expect(assessObjectives([run('groups', [1])], [objective]).errors).toEqual([]);
    const assessment = assessObjectives([run('groups', [1]), run('groups', [])], [objective]);
    expect(assessment.errors).toContainEqual(
      expect.stringContaining('Some groups move orders stall'),
    );
  });

  it('rejects completed objectives if the route took damage or guessed', () => {
    const unsafe = run('groups', [1]);
    unsafe.actions.push({
      area: 'wood',
      at: { x: 1, y: 0 },
      kind: 'deduction',
      power: 1,
      health: 3,
      revealed: 1,
      events: [
        {
          type: 'fight',
          from: { x: 0, y: 0 },
          at: { x: 1, y: 0 },
          damage: 2,
          monster: { kind: 'bat', level: 2, alive: true, goal: false },
        },
      ],
    });
    const assessment = assessObjectives([unsafe], [objective]);
    expect(assessment.errors).toContainEqual(expect.stringContaining('takes damage'));
    expect(assessment.errors).toContainEqual(expect.stringContaining('without a safe bound'));
  });

  it('checks the actual prototype, all entrances and authored examples', () => {
    const report = checkMaps();
    expect(report.errors).toEqual([]);
    expect(report.warnings).toContainEqual(
      expect.stringContaining('No required comparison milestone'),
    );
  }, 60_000);
});
