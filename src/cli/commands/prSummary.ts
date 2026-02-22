import type { CliEvaluator } from '../utils/cliEvaluator';
import type { CliFileResult } from '../types';

export interface PrSummaryOptions {
  files: string[];
  evaluator: CliEvaluator;
}

export async function runPrSummary(options: PrSummaryOptions): Promise<string> {
  const results: CliFileResult[] = [];
  for (const file of options.files) {
    results.push(await options.evaluator.evaluateFile(file));
  }

  const decisions = new Set<string>();
  const requirements = new Set<string>();
  const strictViolations: string[] = [];
  let entropyAccumulator = 0;
  let trendAccumulator = 0;

  for (const result of results) {
    result.decisions.forEach(decision => decisions.add(decision));
    result.requirements.forEach(requirement => requirements.add(requirement));
    if (result.strictViolations > 0) {
      strictViolations.push(`${result.path}`);
    }
    entropyAccumulator += result.entropyScore;
    trendAccumulator += result.entropyTrend;
  }

  const entropyDelta = results.length > 0 ? trendAccumulator / results.length : 0;

  const lines: string[] = [];
  lines.push('PR SDLC Summary');
  lines.push('----------------');
  lines.push('Affected Decisions:');
  lines.push(...formatList(decisions));
  lines.push('Affected Requirements:');
  lines.push(...formatList(requirements));
  lines.push('New Strict Violations:');
  lines.push(...formatList(new Set(strictViolations)));
  lines.push('Entropy Delta:');
  lines.push(`  ${entropyDelta >= 0 ? '+' : ''}${entropyDelta.toFixed(4)}`);
  return lines.join('\n');
}

function formatList(values: Set<string>): string[] {
  if (values.size === 0) {
    return ['  None'];
  }
  return Array.from(values).sort().map(value => `  ${value}`);
}
