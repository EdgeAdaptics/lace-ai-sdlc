import type { EvaluationResult } from '../core/evaluator';

export interface CliFileResult {
  path: string;
  strictViolations: number;
  advisoryViolations: number;
  decisions: string[];
  requirements: string[];
  entropyScore: number;
  entropyTrend: number;
  contextInflation: number;
  decisionDrift: boolean;
  evaluation: EvaluationResult;
}

export interface EvaluateSummary {
  strictTotal: number;
  advisoryTotal: number;
  entropyScore: number;
}

export interface EvaluateCommandResult {
  files: CliFileResult[];
  summary: EvaluateSummary;
  exitCode: number;
  json?: string;
  text?: string;
}

export interface EvaluateOptions {
  files: string[];
  strictOnly: boolean;
  json: boolean;
}

export interface PrSummaryResult {
  output: string;
}
