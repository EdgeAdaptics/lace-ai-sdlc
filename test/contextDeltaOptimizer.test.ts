import { describe, it, expect } from 'vitest';
import { ContextDeltaOptimizer } from '../src/lifecycle/contextDeltaOptimizer';

describe('ContextDeltaOptimizer', () => {
  it('returns minimal header when no changes detected', () => {
    const optimizer = new ContextDeltaOptimizer();
    const previous = `// LACE CONTEXT:
// Decisions Affecting Module:
// - DEC-1: Decision
// Violations:
// - RULE-1: Message`;

    const result = optimizer.optimize(previous, {
      language: 'cpp',
      file: 'src/app.cpp',
      functionName: 'main',
      decisions: ['DEC-1: Decision'],
      violations: ['RULE-1: Message'],
      fullContext: 'full text'
    });

    expect(result).toContain('No SDLC changes detected');
  });

  it('returns new context when decisions change', () => {
    const optimizer = new ContextDeltaOptimizer();
    const previous = '';
    const context = optimizer.optimize(previous, {
      language: 'cpp',
      file: 'src/app.cpp',
      functionName: 'main',
      decisions: [],
      violations: [],
      fullContext: '// new context'
    });

    expect(context).toBe('// new context');
  });
});
