import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { EntropyScoreEngine } from '../src/lifecycle/entropyEngine';
import type { EvaluationResult } from '../src/core/evaluator';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

function createEvaluation(modulePath: string): EvaluationResult {
  return {
    metadata: {
      modulePath,
      documentUri: {} as any,
      languageId: 'cpp',
      imports: [],
      symbols: [],
      functionCalls: [],
      activeSymbol: undefined
    },
    matches: [
      {
        policy: {
          id: 'RULE-1',
          description: 'demo',
          severity: 'strict',
          language: 'all',
          scope: {},
          forbiddenImports: [],
          requiredImports: [],
          forbiddenCalls: [],
          requiredCalls: [],
          origin: 'DEC-1',
          forbiddenImportMatchers: [],
          requiredImportMatchers: [],
          forbiddenCallSet: new Set(),
          requiredCallSet: new Set()
        },
        violations: []
      }
    ],
    decisions: [],
    requirement: undefined,
    context: {
      text: '// demo context',
      invariantsIncluded: 1,
      decisionsIncluded: 0,
      requirementIncluded: false,
      truncatedItems: 0
    }
  };
}

describe('EntropyScoreEngine', () => {
  it('computes recurrence and drift metrics from state', async () => {
    const laceRoot = await fs.mkdtemp(path.join(tmpdir(), 'lace-entropy-'));
    tempDirs.push(laceRoot);
    await fs.writeFile(
      path.join(laceRoot, 'state.json'),
      JSON.stringify(
        {
          violations: { 'RULE-1': 4, 'RULE-2': 2 },
          files: {
            'src/a.cpp': { violationCount: 3 }
          }
        },
        null,
        2
      )
    );

    const engine = new EntropyScoreEngine();
    const evaluation = createEvaluation('src/a.cpp');
    const report = await engine.generateReport({ laceRoot, evaluation });

    expect(report.violationRecurrence['RULE-1']).toBeGreaterThan(0);
    expect(report.fileDriftScore['src/a.cpp']).toBe(3);
    expect(report.decisionDriftScore['DEC-1']).toBeGreaterThanOrEqual(0);
    expect(report.contextInflationScore).toBeGreaterThan(0);
    expect(report.couplingIndicator['src/a.cpp']).toBe(0);
  });
});
