import { describe, it, expect } from 'vitest';
import { formatHealthReport } from '../src/commands/showSdlcHealth';

describe('formatHealthReport', () => {
  it('renders structured report deterministically', () => {
    const output = formatHealthReport(
      {
        violationRecurrence: {},
        fileDriftScore: {},
        decisionDriftScore: {},
        contextInflationScore: 10,
        couplingIndicator: {},
        entropyScore: 0.1
      },
      {
        recurringViolations: ['RULE-B', 'RULE-A'],
        unstableModules: [],
        ignoredDecisions: []
      }
    );

    expect(output).toContain('LACE SDLC Health Report');
    const occurrences = (output.match(/RULE-A/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});
