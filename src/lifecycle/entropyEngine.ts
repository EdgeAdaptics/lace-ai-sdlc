import type { EvaluationResult } from '../core/evaluator';
import { getStateSnapshot } from '../sdlc/persistentState';

export interface EntropyContext {
  laceRoot: string;
  evaluation: EvaluationResult;
}

export interface EntropyReport {
  violationRecurrence: Record<string, number>;
  fileDriftScore: Record<string, number>;
  decisionDriftScore: Record<string, number>;
  contextInflationScore: number;
  couplingIndicator: Record<string, number>;
}

export class EntropyScoreEngine {
  async generateReport(context: EntropyContext): Promise<EntropyReport> {
    const snapshot = await getStateSnapshot(context.laceRoot);
    const totalViolations = Math.max(1, sumValues(snapshot.violations));

    const violationRecurrence: Record<string, number> = {};
    for (const [ruleId, count] of Object.entries(snapshot.violations)) {
      violationRecurrence[ruleId] = Number((count / totalViolations).toFixed(3));
    }

    const fileDriftScore: Record<string, number> = {};
    for (const [file, info] of Object.entries(snapshot.files)) {
      fileDriftScore[file] = info.violationCount;
    }

    const decisionDriftScore: Record<string, number> = {};
    for (const match of context.evaluation.matches) {
      if (!match.policy.origin) {
        continue;
      }
      const violationCount = snapshot.violations[match.policy.id] ?? 0;
      decisionDriftScore[match.policy.origin] =
        (decisionDriftScore[match.policy.origin] ?? 0) + violationCount;
    }

    const contextInflationScore = Math.ceil(context.evaluation.context.text.length / 4);
    const couplingIndicator: Record<string, number> = {
      [context.evaluation.metadata.modulePath]: context.evaluation.metadata.imports.length
    };

    return {
      violationRecurrence,
      fileDriftScore,
      decisionDriftScore,
      contextInflationScore,
      couplingIndicator
    };
  }
}

function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((total, value) => total + value, 0);
}
