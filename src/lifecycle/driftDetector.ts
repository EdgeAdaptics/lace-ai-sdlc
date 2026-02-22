import type { EvaluationResult } from '../core/evaluator';
import type { PersistentState } from '../sdlc/persistentState';
import { getStateSnapshot } from '../sdlc/persistentState';

export interface DriftReport {
  recurringViolations: string[];
  unstableModules: string[];
  ignoredDecisions: string[];
}

export interface DriftContext {
  laceRoot: string;
  evaluation: EvaluationResult;
  violationThreshold?: number;
}

const DEFAULT_THRESHOLD = 3;

export class DriftDetector {
  async analyze(context: DriftContext): Promise<DriftReport> {
    const snapshot = await getStateSnapshot(context.laceRoot);
    const threshold = context.violationThreshold ?? DEFAULT_THRESHOLD;

    const recurringViolations = Object.entries(snapshot.violations)
      .filter(([, count]) => count >= threshold)
      .map(([ruleId]) => ruleId)
      .sort();

    const unstableModules = Object.entries(snapshot.files)
      .filter(([, info]) => info.violationCount >= threshold)
      .map(([file]) => file)
      .sort();

    const ignoredDecisions = this.collectDecisionViolations(context.evaluation, snapshot, threshold);

    return {
      recurringViolations,
      unstableModules,
      ignoredDecisions
    };
  }

  private collectDecisionViolations(
    evaluation: EvaluationResult,
    snapshot: PersistentState,
    threshold: number
  ): string[] {
    const decisions = new Set<string>();
    for (const match of evaluation.matches) {
      if (!match.policy.origin) {
        continue;
      }
      const violationCount = snapshot.violations[match.policy.id] ?? 0;
      if (violationCount >= threshold) {
        decisions.add(match.policy.origin);
      }
    }

    return Array.from(decisions).sort();
  }
}
