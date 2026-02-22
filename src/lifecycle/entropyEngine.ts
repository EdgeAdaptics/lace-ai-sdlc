import type { EvaluationResult } from '../core/evaluator';
import { getStateSnapshot, getEntropyForFile, updateEntropyForFile } from '../sdlc/persistentState';

export interface EntropyContext {
  laceRoot: string;
  evaluation: EvaluationResult;
}

export interface EntropyComponents {
  vrs: number;
  pds: number;
  dds: number;
  cis: number;
  scs: number;
}

export interface EntropyCalculation {
  score: number;
  tokens: number;
  relativeImports: number;
  components: EntropyComponents;
}

export interface RecordedEntropy extends EntropyCalculation {
  trend: number;
}

export interface EntropyReport {
  violationRecurrence: Record<string, number>;
  fileDriftScore: Record<string, number>;
  decisionDriftScore: Record<string, number>;
  contextInflationScore: number;
  couplingIndicator: Record<string, number>;
  entropyScore: number;
}

export class EntropyScoreEngine {
  async record(context: EntropyContext): Promise<RecordedEntropy> {
    const calc = this.calculate(context.evaluation);
    const previousStored = await getEntropyForFile(context.laceRoot, context.evaluation.metadata.modulePath);
    const previous = previousStored ?? calc.score;
    const diff = calc.score - previous;
    const trend = Math.abs(diff) < 0.0001 ? 0 : round4(diff);
    await updateEntropyForFile(context.laceRoot, context.evaluation.metadata.modulePath, calc.score);
    return { ...calc, trend };
  }

  async generateReport(context: EntropyContext): Promise<EntropyReport> {
    const snapshot = await getStateSnapshot(context.laceRoot);
    const calculation = this.calculate(context.evaluation);
    const totalViolations = Math.max(1, sumValues(snapshot.violations));

    const violationRecurrence: Record<string, number> = {};
    for (const [ruleId, count] of Object.entries(snapshot.violations)) {
      violationRecurrence[ruleId] = round4(count / totalViolations);
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

    const couplingIndicator: Record<string, number> = {
      [context.evaluation.metadata.modulePath]: calculation.relativeImports
    };

    return {
      violationRecurrence,
      fileDriftScore,
      decisionDriftScore,
      contextInflationScore: calculation.tokens,
      couplingIndicator,
      entropyScore: calculation.score
    };
  }

  calculate(evaluation: EvaluationResult): EntropyCalculation {
    const strictCount = countViolations(evaluation, 'strict');
    const violatedPolicies = evaluation.matches.filter(match => match.violations.length > 0).length;
    const totalPolicies = evaluation.matches.length;
    const decisions = evaluation.decisions.length;
    const decisionViolations = evaluation.matches.filter(
      match => match.policy.origin && match.violations.length > 0
    ).length;
    const tokens = estimateTokens(evaluation.context.text);
    const relativeImports = countRelativeImports(evaluation.metadata.languageId, evaluation.metadata.imports);

    const vrs = round4(Math.min(strictCount / 10, 1));
    const pds = round4(totalPolicies > 0 ? Math.min(violatedPolicies / totalPolicies, 1) : 0);
    const dds = round4(decisions > 0 ? Math.min(decisionViolations / decisions, 1) : 0);
    const cis = round4(Math.min(tokens / 400, 1));
    const scs = round4(Math.min(relativeImports / 20, 1));

    const score = round4(0.3 * vrs + 0.25 * pds + 0.2 * dds + 0.15 * cis + 0.1 * scs);
    return {
      score,
      tokens,
      relativeImports,
      components: { vrs, pds, dds, cis, scs }
    };
  }
}

function countViolations(evaluation: EvaluationResult, severity: 'strict' | 'advisory'): number {
  let total = 0;
  for (const match of evaluation.matches) {
    total += match.violations.filter(v => v.severity === severity).length;
  }
  return total;
}

function estimateTokens(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) {
    return 0;
  }
  return Math.ceil(cleaned.length / 4);
}

function countRelativeImports(languageId: string, imports: Array<{ value: string }>): number {
  return imports.filter(entry => isRelativeImport(languageId, entry.value)).length;
}

function isRelativeImport(languageId: string, value: string): boolean {
  if (languageId === 'cpp') {
    return !value.startsWith('<');
  }
  return value.startsWith('.') || value.includes('/') || !value.includes('://');
}

function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}
