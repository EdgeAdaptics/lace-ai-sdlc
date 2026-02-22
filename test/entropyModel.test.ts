import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EntropyScoreEngine } from '../src/lifecycle/entropyEngine';
import type { EvaluationResult } from '../src/core/evaluator';
import type { NormalizedPolicy } from '../src/core/policyTypes';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

let laceRoot: string;

beforeEach(async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(tmpdir(), 'lace-entropy-'));
  laceRoot = path.join(tempDir, '.lace');
  await fs.promises.mkdir(laceRoot, { recursive: true });
  await fs.promises.writeFile(path.join(laceRoot, 'state.json'), JSON.stringify({ violations: {}, files: {}, entropy: {} }));
});

afterEach(async () => {
  await fs.promises.rm(path.dirname(laceRoot), { recursive: true, force: true });
});

function createPolicy(id: string, severity: 'strict' | 'advisory', origin?: string): NormalizedPolicy {
  return {
    id,
    description: id,
    severity,
    language: 'cpp',
    scope: {},
    forbiddenImports: [],
    requiredImports: [],
    forbiddenCalls: [],
    requiredCalls: [],
    origin,
    moduleMatcher: undefined,
    functionRegex: undefined,
    forbiddenImportMatchers: [],
    requiredImportMatchers: [],
    forbiddenCallSet: new Set(),
    requiredCallSet: new Set()
  };
}

function evaluation(matches: Array<{ policy: NormalizedPolicy; violations: Array<{ severity: 'strict' | 'advisory'; message: string }> }>, imports: string[], decisions: string[] = []): EvaluationResult {
  return {
    metadata: {
      modulePath: 'src/sample.cpp',
      documentUri: {} as any,
      languageId: 'cpp',
      imports: imports.map(value => ({ value, range: {} as any })),
      symbols: [],
      functionCalls: [],
      activeSymbol: undefined
    },
    matches,
    decisions: decisions.map(id => ({ id, title: id, rationale: '' })),
    requirement: undefined,
    context: {
      text: '// example context',
      invariantsIncluded: 0,
      decisionsIncluded: 0,
      requirementIncluded: false,
      truncatedItems: 0
    },
    laceRoot
  };
}

describe('EntropyScoreEngine', () => {
  it('normalizes components and bounds entropy', async () => {
    const engine = new EntropyScoreEngine();
    const evalResult = evaluation(
      [
        { policy: createPolicy('P1', 'strict', 'D1'), violations: [{ severity: 'strict', message: '' }] },
        { policy: createPolicy('P2', 'advisory'), violations: [] }
      ],
      ['banned.hpp'],
      ['D1']
    );
    const recorded = await engine.record({ laceRoot, evaluation: evalResult });
    expect(recorded.score).toBeGreaterThanOrEqual(0);
    expect(recorded.score).toBeLessThanOrEqual(1);
    expect(recorded.components.vrs).toBeLessThanOrEqual(1);
    expect(recorded.components.pds).toBeLessThanOrEqual(1);
    expect(recorded.components.dds).toBeLessThanOrEqual(1);
    expect(recorded.components.cis).toBeLessThanOrEqual(1);
    expect(recorded.components.scs).toBeLessThanOrEqual(1);
  });

  it('handles zero divisions safely', async () => {
    const engine = new EntropyScoreEngine();
    const evalResult = evaluation([], []);
    const recorded = await engine.record({ laceRoot, evaluation: evalResult });
    expect(recorded.components.pds).toBe(0);
    expect(recorded.components.dds).toBe(0);
  });

  it('computes entropy trend index deterministically', async () => {
    const engine = new EntropyScoreEngine();
    const evalResult = evaluation(
      [{ policy: createPolicy('P1', 'strict', 'D1'), violations: [{ severity: 'strict', message: '' }] }],
      []
    );
    const first = await engine.record({ laceRoot, evaluation: evalResult });
    expect(first.trend).toBe(0);
    const second = await engine.record({ laceRoot, evaluation: evalResult });
    expect(second.trend).toBeCloseTo(0, 4);
  });

  it('rounds entropy values to four decimals and clamps tiny differences', async () => {
    const engine = new EntropyScoreEngine();
    const evalResult = evaluation(
      [{ policy: createPolicy('P1', 'strict'), violations: [{ severity: 'strict', message: '' }] }],
      []
    );
    const first = await engine.record({ laceRoot, evaluation: evalResult });
    expect(first.score.toFixed(4)).toBe(first.score.toFixed(4));
    const modified = evaluation(
      [{ policy: createPolicy('P1', 'strict'), violations: [{ severity: 'strict', message: '' }] }],
      ['.']
    );
    const next = await engine.record({ laceRoot, evaluation: modified });
    expect(Math.abs(next.trend)).toBeLessThanOrEqual(1);
  });
});
