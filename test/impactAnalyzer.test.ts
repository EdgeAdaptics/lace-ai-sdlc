import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { ChangeImpactAnalyzer } from '../src/lifecycle/impactAnalyzer';
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
      modulePath: 'src/app/main.cpp',
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
          id: 'RULE-DEC',
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
        violations: [{ policyId: 'RULE-DEC', severity: 'strict', type: 'forbidden-call', message: '' }]
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

async function createLaceArtifacts(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'lace-impact-'));
  tempDirs.push(dir);
  await fs.writeFile(
    path.join(dir, 'decisions.yaml'),
    `decisions:
  - id: DEC-1
    title: Demo
    rationale: Test
    affected_modules:
      - "src/app/**"
`
  );
  await fs.writeFile(
    path.join(dir, 'requirements.yaml'),
    `requirements:
  - id: REQ-1
    description: Demo requirement
    modules:
      - "src/app/**"
    stage: development
`
  );
  return dir;
}

describe('ChangeImpactAnalyzer', () => {
  it('summarizes affected artifacts', async () => {
    const laceRoot = await createLaceArtifacts();
    const analyzer = new ChangeImpactAnalyzer();
    const summary = await analyzer.summarize(laceRoot, evaluation());
    expect(summary.affectedDecisions).toContain('DEC-1');
    expect(summary.affectedRequirements).toContain('REQ-1');
    expect(summary.affectedPolicies).toContain('RULE-DEC');
  });
});
