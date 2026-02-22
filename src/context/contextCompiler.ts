import type { ApplicablePolicy } from '../core/policyTypes';
import type { ParsedFileMetadata } from '../services/parser/types';
import type { DecisionRecord } from '../sdlc/decisionLedger';
import type { RequirementRecord } from '../sdlc/requirementGraph';

const MAX_TOKENS = 400;
const MAX_CHAR_BUDGET = MAX_TOKENS * 4;
const MAX_INVARIANTS = 5;

export interface CompileContextInput {
  metadata: ParsedFileMetadata;
  matches: ApplicablePolicy[];
  decisions: DecisionRecord[];
  requirement?: RequirementRecord;
}

export interface ContextBlockResult {
  text: string;
  invariantsIncluded: number;
  decisionsIncluded: number;
  requirementIncluded: boolean;
  truncatedItems: number;
}

export class ContextCompiler {
  compile(input: CompileContextInput): ContextBlockResult {
    const lines: string[] = [];
    let currentLength = 0;
    let truncatedItems = 0;

    const pushLine = (line: string): boolean => {
      const addition = line.length + (lines.length > 0 ? 1 : 0);
      if (currentLength + addition > MAX_CHAR_BUDGET) {
        truncatedItems += 1;
        return false;
      }

      lines.push(line);
      currentLength += addition;
      return true;
    };

    pushLine('// LACE CONTEXT:');
    pushLine(`// Language: ${input.metadata.languageId ?? 'unknown'}`);
    pushLine(`// File: ${input.metadata.modulePath}`);
    pushLine(`// Function: ${input.metadata.activeSymbol?.name ?? 'N/A'}`);

    pushLine('// Applicable Invariants:');
    const invariants = this.selectInvariants(input.matches);
    let invariantsIncluded = 0;
    if (invariants.length === 0) {
      pushLine('// - (none)');
    } else {
      for (const invariant of invariants) {
        const line = `// - ${invariant.severity.toUpperCase()} ${invariant.id}: ${invariant.description}`;
        if (!pushLine(line)) {
          break;
        }
        invariantsIncluded += 1;
      }
    }

    pushLine('// Decisions Affecting Module:');
    const decisions = [...input.decisions].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 2);
    let decisionsIncluded = 0;
    if (decisions.length === 0) {
      pushLine('// - (none)');
    } else {
      for (const decision of decisions) {
        if (!pushLine(`// - ${decision.id}: ${decision.title}`)) {
          break;
        }
        decisionsIncluded += 1;
      }
    }

    pushLine('// Requirement:');
    let requirementIncluded = false;
    if (!input.requirement) {
      pushLine('// - (none)');
    } else {
      if (pushLine(`// - ${input.requirement.id}: ${input.requirement.description}`)) {
        requirementIncluded = true;
      }
    }

    pushLine('// Violations:');
    const violations = this.collectViolations(input.matches);
    if (violations.length === 0) {
      pushLine('// - (none)');
    } else {
      for (const violation of violations) {
        const line = `// - ${violation.policyId}: ${violation.message}`;
        if (!pushLine(line)) {
          break;
        }
      }
    }

    if (truncatedItems > 0) {
      pushLine(`// ... ${truncatedItems} additional items omitted`);
    }

    return {
      text: lines.join('\n'),
      invariantsIncluded,
      decisionsIncluded,
      requirementIncluded,
      truncatedItems
    };
  }

  private selectInvariants(matches: ApplicablePolicy[]): Array<{ id: string; severity: string; description: string }> {
    return matches
      .map(match => ({
        id: match.policy.id,
        severity: match.policy.severity,
        description: match.policy.description
      }))
      .sort((a, b) => {
        if (a.severity === b.severity) {
          return a.id.localeCompare(b.id);
        }
        return a.severity === 'strict' ? -1 : 1;
      })
      .slice(0, MAX_INVARIANTS);
  }

  private collectViolations(matches: ApplicablePolicy[]): PolicyViolationLine[] {
    const violations: PolicyViolationLine[] = [];
    for (const match of matches) {
      for (const violation of match.violations) {
        violations.push({
          policyId: violation.policyId,
          severity: violation.severity,
          message: violation.message
        });
      }
    }

    return violations.sort((a, b) => {
      if (a.severity === b.severity) {
        return a.policyId.localeCompare(b.policyId);
      }
      return a.severity === 'strict' ? -1 : 1;
    });
  }
}

interface PolicyViolationLine {
  policyId: string;
  severity: string;
  message: string;
}
