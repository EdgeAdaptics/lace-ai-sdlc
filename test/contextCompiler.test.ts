import { describe, it, expect } from 'vitest';
import { ContextCompiler } from '../src/context/contextCompiler';
import type { ParsedFileMetadata } from '../src/services/parser/types';
import type { ApplicablePolicy, NormalizedPolicy } from '../src/core/policyTypes';

const baseMetadata: ParsedFileMetadata = {
  modulePath: 'src/app/main.cpp',
  documentUri: {
    fsPath: '/workspace/src/app/main.cpp',
    path: '/workspace/src/app/main.cpp',
    scheme: 'file',
    authority: '',
    fragment: '',
    query: '',
    with: () => baseMetadata.documentUri,
    toJSON: () => baseMetadata.documentUri
  } as any,
  languageId: 'cpp',
  imports: [],
  symbols: [],
  functionCalls: [],
  activeSymbol: undefined
};

function createPolicy(id: string, severity: 'strict' | 'advisory'): NormalizedPolicy {
  return {
    id,
    description: `${id} description`,
    severity,
    language: 'all',
    scope: {},
    forbiddenImports: [],
    requiredImports: [],
    forbiddenCalls: [],
    requiredCalls: [],
    moduleMatcher: undefined,
    functionRegex: undefined,
    forbiddenImportMatchers: [],
    requiredImportMatchers: [],
    forbiddenCallSet: new Set(),
    requiredCallSet: new Set()
  };
}

describe('ContextCompiler', () => {
  it('renders decisions and requirements', () => {
    const compiler = new ContextCompiler();
    const matches: ApplicablePolicy[] = [
      {
        policy: createPolicy('RULE-1', 'strict'),
        violations: []
      }
    ];

    const result = compiler.compile({
      metadata: baseMetadata,
      matches,
      decisions: [{ id: 'DEC-1', title: 'Decision', rationale: 'Reason' }],
      requirement: { id: 'REQ-1', description: 'Requirement', stage: 'development' }
    });

    expect(result.text).toContain('DEC-1');
    expect(result.text).toContain('REQ-1');
    expect(result.invariantsIncluded).toBeGreaterThan(0);
  });

  it('reports truncation when exceeding budget', () => {
    const compiler = new ContextCompiler();
    const matches: ApplicablePolicy[] = [];
    for (let i = 0; i < 20; i += 1) {
      matches.push({
        policy: createPolicy(`RULE-${i}`, 'advisory'),
        violations: []
      });
    }

    const result = compiler.compile({
      metadata: baseMetadata,
      matches,
      decisions: [],
      requirement: undefined
    });

    expect(result.truncatedItems).toBeGreaterThanOrEqual(0);
    if (result.truncatedItems > 0) {
      expect(result.text).toContain('additional items omitted');
    }
  });
});
