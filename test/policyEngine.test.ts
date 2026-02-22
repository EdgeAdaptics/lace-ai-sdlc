import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import * as vscode from 'vscode';
import { PolicyEngine } from '../src/core/policyEngine';
import type { ParsedFileMetadata } from '../src/services/parser/types';

const fixturePath = path.resolve(__dirname, 'fixtures', 'policies.yaml');

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  it('detects forbidden imports scoped to module globs', async () => {
    const policies = await engine.loadPolicies(fixturePath);
    const metadata: ParsedFileMetadata = {
      modulePath: 'src/ui/view.ts',
      documentUri: vscode.Uri.file('/workspace/src/ui/view.ts'),
      languageId: 'cpp',
      imports: [
        {
          value: 'src/data/reporting/service',
          range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10))
        }
      ],
      symbols: [],
      functionCalls: [],
      activeSymbol: undefined
    };

    const matches = engine.evaluate(policies, metadata);
    expect(matches.some(match => match.violations.some(v => v.type === 'forbidden-import'))).toBe(true);
  });

  it('flags missing required dependencies and respects satisfied ones', async () => {
    const policies = await engine.loadPolicies(fixturePath);
    const missingMetadata: ParsedFileMetadata = {
      modulePath: 'src/ui/component.ts',
      documentUri: vscode.Uri.file('/workspace/src/ui/component.ts'),
      languageId: 'cpp',
      imports: [],
      symbols: [],
      functionCalls: [],
      activeSymbol: undefined
    };

    const matchesMissing = engine.evaluate(policies, missingMetadata);
    expect(matchesMissing.some(match => match.violations.some(v => v.type === 'missing-import'))).toBe(true);

    const satisfiedMetadata: ParsedFileMetadata = {
      modulePath: 'src/ui/component.ts',
      documentUri: vscode.Uri.file('/workspace/src/ui/component.ts'),
      languageId: 'cpp',
      imports: [
        {
          value: '@lace/logging',
          range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 15))
        }
      ],
      symbols: [],
      functionCalls: [],
      activeSymbol: undefined
    };

    const matchesSatisfied = engine.evaluate(policies, satisfiedMetadata);
    expect(matchesSatisfied.some(match => match.violations.length === 0)).toBe(true);
  });
});
