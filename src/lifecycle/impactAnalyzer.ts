import type { EvaluationResult } from '../core/evaluator';
import { getDecisionsForFile } from '../sdlc/decisionLedger';
import { getRequirementsForFile } from '../sdlc/requirementGraph';

export interface ImpactSummary {
  affectedRequirements: string[];
  affectedDecisions: string[];
  affectedPolicies: string[];
}

export class ChangeImpactAnalyzer {
  async summarize(laceRoot: string, evaluation: EvaluationResult): Promise<ImpactSummary> {
    const requirement = await getRequirementsForFile(laceRoot, evaluation.metadata.modulePath);
    const decisions = await getDecisionsForFile(
      laceRoot,
      evaluation.metadata.modulePath,
      evaluation.matches.map(match => match.policy.id)
    );
    const policies = evaluation.matches
      .filter(match => match.violations.length > 0)
      .map(match => match.policy.id);

    return {
      affectedRequirements: requirement ? [requirement.id] : [],
      affectedDecisions: decisions.map(decision => decision.id),
      affectedPolicies: Array.from(new Set(policies))
    };
  }
}
