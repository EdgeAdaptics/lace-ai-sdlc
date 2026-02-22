import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { DriftDetector } from '../src/lifecycle/driftDetector';
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

function evaluation(): EvaluationResult {
  return {
    metadata: {
      modulePath: 'src/a.cpp',
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
          description: '',
          severity: 'strict',
          language: 'all',
          scope: {},
          origin: 'DEC-1',
          forbiddenImports: [],
          requiredImports: [],
          forbiddenCalls: [],
          requiredCalls: [],
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
      text: '',
      invariantsIncluded: 0,
      decisionsIncluded: 0,
      requirementIncluded: false,
      truncatedItems: 0
    }
  };
}

describe('DriftDetector', () => {
  it('identifies recurring violations and ignored decisions', async () => {
    const laceRoot = await fs.mkdtemp(path.join(tmpdir(), 'lace-drift-'));
    tempDirs.push(laceRoot);
    await fs.writeFile(
      path.join(laceRoot, 'state.json'),
      JSON.stringify({
        violations: { 'RULE-1': 5 },
        files: { 'src/a.cpp': { violationCount: 5 } }
      })
    );

    const detector = new DriftDetector();
    const report = await detector.analyze({
      laceRoot,
      evaluation: evaluation(),
      violationThreshold: 3
    });

    expect(report.recurringViolations).toContain('RULE-1');
    expect(report.unstableModules).toContain('src/a.cpp');
    expect(report.ignoredDecisions).toContain('DEC-1');
  });
});
