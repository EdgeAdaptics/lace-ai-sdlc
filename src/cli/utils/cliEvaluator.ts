import { PolicyEngine } from '../../core/policyEngine';
import type { NormalizedPolicy } from '../../core/policyTypes';
import { ContextCompiler } from '../../context/contextCompiler';
import { buildMetadata } from './fileAnalyzer';
import type { CliFileResult } from '../types';
import {
  loadDecisionEntries,
  selectDecisions,
  type DecisionEntry
} from '../../sdlc/decisionLedger';
import {
  loadRequirementEntries,
  selectRequirement,
  type RequirementEntry
} from '../../sdlc/requirementGraph';
import type { EvaluationResult } from '../../core/evaluator';
import type { ParsedFileMetadata } from '../../services/parser/types';
import { EntropyScoreEngine } from '../../lifecycle/entropyEngine';

export class CliEvaluator {
  private readonly policyEngine = new PolicyEngine();
  private readonly contextCompiler = new ContextCompiler();
  private readonly entropyEngine = new EntropyScoreEngine();

  private constructor(
    private readonly laceRoot: string,
    private readonly policies: NormalizedPolicy[],
    private readonly ciConfig: ReturnType<PolicyEngine['getCiConfig']>,
    private readonly decisions: DecisionEntry[],
    private readonly requirements: RequirementEntry[]
  ) {}

  static async create(laceRoot: string, policyFile: string): Promise<CliEvaluator> {
    const policyEngine = new PolicyEngine();
    const policies = await policyEngine.loadPolicies(policyFile);
    const ciConfig = policyEngine.getCiConfig(policyFile);
    const decisions = await loadDecisionEntries(laceRoot);
    const requirements = await loadRequirementEntries(laceRoot);
    return new CliEvaluator(laceRoot, policies, ciConfig, decisions, requirements);
  }

  get root(): string {
    return this.laceRoot;
  }

  getCiConfig() {
    return this.ciConfig;
  }

  async evaluateFile(filePath: string): Promise<CliFileResult> {
    const metadata = await buildMetadata(filePath, this.laceRoot);
    const matches = this.policyEngine.evaluate(this.policies, metadata as ParsedFileMetadata);
    const policyIds = matches.map(match => match.policy.id);
    const decisions = selectDecisions(this.decisions, metadata.modulePath, policyIds);
    const requirement = selectRequirement(this.requirements, metadata.modulePath);
    const context = this.contextCompiler.compile({ metadata, matches, decisions, requirement });

    const strictViolations = countViolations(matches, 'strict');
    const advisoryViolations = countViolations(matches, 'advisory');
    const evaluation: EvaluationResult = {
      metadata,
      matches,
      decisions,
      requirement,
      context,
      laceRoot: this.laceRoot
    };
    const entropy = await this.entropyEngine.record({ laceRoot: this.laceRoot, evaluation });

    return {
      path: metadata.modulePath,
      strictViolations,
      advisoryViolations,
      decisions: decisions.map(decision => decision.id).sort(),
      requirements: requirement ? [requirement.id] : [],
      entropyScore: entropy.score,
      entropyTrend: entropy.trend,
      contextInflation: entropy.tokens,
      decisionDrift: matches.some(match => match.policy.origin && match.violations.length > 0),
      evaluation
    };
  }
}

function countViolations(matches: EvaluationResult['matches'], severity: 'strict' | 'advisory'): number {
  let count = 0;
  for (const match of matches) {
    count += match.violations.filter(v => v.severity === severity).length;
  }
  return count;
}
