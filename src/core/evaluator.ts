import type * as vscode from 'vscode';
import { ContextCompiler } from '../context/contextCompiler';
import type { ContextBlockResult } from '../context/contextCompiler';
import type { FileParser } from '../services/parser/fileParser';
import type { ParsedFileMetadata } from '../services/parser/types';
import type { ApplicablePolicy } from './policyTypes';
import { PolicyEngine } from './policyEngine';
import type { LaceConfigLocation } from '../services/config/laceConfig';
import { getDecisionsForFile, DecisionRecord } from '../sdlc/decisionLedger';
import { getRequirementsForFile, RequirementRecord } from '../sdlc/requirementGraph';
import { incrementViolation } from '../sdlc/persistentState';
import { EntropyScoreEngine, RecordedEntropy } from '../lifecycle/entropyEngine';

export interface EvaluationRequest {
  document: vscode.TextDocument;
  cursor: vscode.Position;
  laceConfig: LaceConfigLocation;
}

export interface EvaluationResult {
  metadata: ParsedFileMetadata;
  matches: ApplicablePolicy[];
  decisions: DecisionRecord[];
  requirement?: RequirementRecord;
  context: ContextBlockResult;
  laceRoot: string;
  entropy?: RecordedEntropy;
}

export class GovernanceEvaluator {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly fileParser: FileParser,
    private readonly contextCompiler: ContextCompiler,
    private readonly entropyEngine: EntropyScoreEngine = new EntropyScoreEngine()
  ) {}

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    const metadata = await this.fileParser.parse(request.document, request.cursor);
    const policies = await this.policyEngine.loadPolicies(request.laceConfig.policyFile);
    const matches = this.policyEngine.evaluate(policies, metadata);
    await this.recordStrictViolations(matches, request.laceConfig.rootDir, metadata.modulePath);

    const policyIds = matches.map(match => match.policy.id);
    const decisions = await getDecisionsForFile(request.laceConfig.rootDir, metadata.modulePath, policyIds);
    const requirement = await getRequirementsForFile(request.laceConfig.rootDir, metadata.modulePath);
    const context = this.contextCompiler.compile({
      metadata,
      matches,
      decisions,
      requirement
    });

    const entropy = await this.entropyEngine.record({
      laceRoot: request.laceConfig.rootDir,
      evaluation: {
        metadata,
        matches,
        decisions,
        requirement,
        context,
        laceRoot: request.laceConfig.rootDir
      }
    });

    return {
      metadata,
      matches,
      decisions,
      requirement,
      context,
      laceRoot: request.laceConfig.rootDir,
      entropy
    };
  }

  private async recordStrictViolations(
    matches: ApplicablePolicy[],
    laceRoot: string,
    modulePath: string
  ): Promise<void> {
    const tasks: Array<Promise<void>> = [];
    for (const match of matches) {
      for (const violation of match.violations) {
        if (violation.severity !== 'strict') {
          continue;
        }
        tasks.push(incrementViolation(laceRoot, violation.policyId, modulePath));
      }
    }

    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }
}
