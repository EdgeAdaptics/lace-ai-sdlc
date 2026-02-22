import { describe, it, expect } from 'vitest';
import { buildDiagnostics } from '../src/vscode/diagnostics';
import { MockTextDocument } from './utils/mockDocument';

const metadata = {
  modulePath: 'src/app.ts',
  documentUri: {} as any,
  languageId: 'typescript',
  imports: [],
  symbols: [],
  functionCalls: [],
  activeSymbol: undefined
};

const match = {
  policy: {
    id: 'RULE-1',
    description: '',
    severity: 'strict',
    language: 'all',
    scope: {},
    forbiddenImports: [],
    requiredImports: [],
    forbiddenCalls: [],
    requiredCalls: [],
    forbiddenImportMatchers: [],
    requiredImportMatchers: [],
    forbiddenCallSet: new Set(),
    requiredCallSet: new Set()
  },
  violations: [
    { policyId: 'RULE-1', severity: 'strict', type: 'forbidden-call', message: 'strict violation' },
    { policyId: 'RULE-1', severity: 'advisory', type: 'missing-call', message: 'advisory' }
  ]
};

describe('buildDiagnostics', () => {
  it('filters advisory diagnostics when mode is silent', () => {
    const doc = new MockTextDocument('console.log("a");', '/workspace/app.ts') as unknown as any;
    const diagnostics = buildDiagnostics(metadata, [match], doc, 'silent');
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].message).toContain('strict violation');
  });

  it('includes advisories in normal mode', () => {
    const doc = new MockTextDocument('console.log("a");', '/workspace/app.ts') as unknown as any;
    const diagnostics = buildDiagnostics(metadata, [match], doc, 'normal');
    expect(diagnostics.length).toBe(2);
  });
});
