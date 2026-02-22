import * as path from 'path';
import type { EvaluateOptions, EvaluateCommandResult, CliFileResult } from '../types';
import { CliEvaluator } from '../utils/cliEvaluator';
import { findLaceConfig } from '../../services/config/laceConfig';
import type { CiConfig } from '../../core/policyTypes';

export interface EvaluateCommandContext {
  cwd?: string;
}

export async function runEvaluateCommand(options: EvaluateOptions, context: EvaluateCommandContext = {}): Promise<EvaluateCommandResult> {
  const startPath = context.cwd ?? process.cwd();
  const laceConfig = await findLaceConfig([startPath]);
  if (!laceConfig) {
    throw new Error('Unable to locate .lace directory');
  }

  const evaluator = await CliEvaluator.create(laceConfig.rootDir, laceConfig.policyFile);
  const files = options.files.length > 0 ? options.files : []; // future: support glob
  if (files.length === 0) {
    throw new Error('No files specified');
  }

  const absoluteFiles = files.map(file => path.resolve(startPath, file));
  const results: CliFileResult[] = [];
  for (const file of absoluteFiles) {
    results.push(await evaluator.evaluateFile(file));
  }
  results.sort((a, b) => a.path.localeCompare(b.path));

  const summary = buildSummary(results);
  const ciConfig = evaluator.getCiConfig();
  const strictExit = summary.strictTotal > 0 ? 1 : 0;
  let exitCode = strictExit;
  let ciFailure = false;
  if (ciConfig) {
    ciFailure = evaluateCiThresholds(ciConfig, results, summary);
    if (ciFailure) {
      exitCode = 2;
    }
  }
  if (options.strictOnly && exitCode === 0 && summary.strictTotal === 0) {
    exitCode = 0;
  }

  const json = options.json ? buildJsonOutput(results, summary) : undefined;
  const text = options.json ? undefined : buildTextOutput(results, summary, ciFailure);
  if (exitCode === 0 && !ciFailure && summary.strictTotal === 0 && summary.advisoryTotal === 0) {
    // no issues, keep exitCode 0
  }

  return {
    files: results,
    summary,
    exitCode,
    json,
    text
  };
}

function buildSummary(results: CliFileResult[]): { strictTotal: number; advisoryTotal: number; entropyScore: number } {
  let strictTotal = 0;
  let advisoryTotal = 0;
  let entropyAccumulator = 0;
  for (const result of results) {
    strictTotal += result.strictViolations;
    advisoryTotal += result.advisoryViolations;
    entropyAccumulator += result.entropyScore;
  }
  const entropyScore = results.length > 0 ? Number((entropyAccumulator / results.length).toFixed(4)) : 0;
  return { strictTotal, advisoryTotal, entropyScore };
}

function evaluateCiThresholds(ci: CiConfig, results: CliFileResult[], summary: { entropyScore: number }): boolean {
  if (ci.maxEntropyScore !== undefined && summary.entropyScore > ci.maxEntropyScore) {
    return true;
  }
  if (ci.maxContextInflation !== undefined) {
    for (const result of results) {
      if (result.contextInflation > ci.maxContextInflation) {
        return true;
      }
    }
  }
  if (ci.failOnDecisionDrift) {
    if (results.some(result => result.decisionDrift)) {
      return true;
    }
  }
  return false;
}

function buildJsonOutput(results: CliFileResult[], summary: { strictTotal: number; advisoryTotal: number; entropyScore: number }): string {
  const payload = {
    files: results.map(result => ({
      path: result.path,
      strictViolations: result.strictViolations,
      advisoryViolations: result.advisoryViolations,
      decisions: [...result.decisions].sort(),
      requirements: [...result.requirements].sort(),
      entropyScore: Number(result.entropyScore.toFixed(4)),
      entropyTrend: Number(result.entropyTrend.toFixed(4))
    })),
    summary: {
      strictTotal: summary.strictTotal,
      advisoryTotal: summary.advisoryTotal,
      entropyScore: Number(summary.entropyScore.toFixed(4))
    }
  };
  return JSON.stringify(payload, null, 2);
}

function buildTextOutput(results: CliFileResult[], summary: { strictTotal: number; advisoryTotal: number; entropyScore: number }, ciFailure: boolean): string {
  const lines: string[] = [];
  lines.push('LACE CLI Evaluation');
  lines.push('--------------------');
  lines.push(`Files evaluated: ${results.length}`);
  lines.push(`Strict violations: ${summary.strictTotal}`);
  lines.push(`Advisory violations: ${summary.advisoryTotal}`);
  lines.push(`Entropy score: ${summary.entropyScore.toFixed(4)}`);
  if (ciFailure) {
    lines.push('CI thresholds: FAILED');
  }
  return lines.join('\n');
}
