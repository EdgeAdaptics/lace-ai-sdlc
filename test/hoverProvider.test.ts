import { describe, it, expect } from 'vitest';
import { buildHoverMarkdown } from '../src/vscode/hoverProvider';

describe('buildHoverMarkdown', () => {
  it('renders entropy hint only in verbose mode', () => {
    const data = {
      policyId: 'RULE-1',
      decisionId: 'DEC-1',
      violationCount: 3,
      driftScore: '0.6',
      entropyHint: '0.250'
    };

    const verbose = buildHoverMarkdown(data, 'verbose');
    expect(verbose).toContain('Entropy Hint');

    const silent = buildHoverMarkdown(data, 'silent');
    expect(silent).not.toContain('Entropy Hint');
  });
});
