import { describe, it, expect } from 'vitest';
import { shouldSkipContext } from '../src/context/contextInsertion';

const baseEvaluation = {
  context: {
    invariantsIncluded: 0,
    decisionsIncluded: 0,
    requirementIncluded: false,
    truncatedItems: 0,
    text: ''
  },
  matches: [],
  decisions: [],
  requirement: undefined
} as any;

describe('shouldSkipContext', () => {
  it('returns true when nothing to report', () => {
    expect(shouldSkipContext(baseEvaluation)).toBe(true);
  });

  it('returns false when violations exist', () => {
    const evalWithViolation = {
      ...baseEvaluation,
      matches: [{ violations: [{ severity: 'strict' }] }]
    };
    expect(shouldSkipContext(evalWithViolation)).toBe(false);
  });
});
