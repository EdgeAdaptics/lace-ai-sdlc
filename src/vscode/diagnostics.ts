import * as vscode from 'vscode';
import type { ApplicablePolicy } from '../core/policyTypes';
import type { ParsedFileMetadata } from '../services/parser/types';
import type { AdvisoryMode } from '../config/settings';

export function buildDiagnostics(
  metadata: ParsedFileMetadata,
  matches: ApplicablePolicy[],
  document: vscode.TextDocument,
  advisoryMode: AdvisoryMode
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const importRangeByValue = new Map<string, vscode.Range>(metadata.imports.map(entry => [entry.value, entry.range]));
  const includeAdvisory = advisoryMode !== 'silent';

  for (const match of matches) {
    for (const violation of match.violations) {
      if (violation.severity === 'advisory' && !includeAdvisory) {
        continue;
      }

      const severity =
        violation.severity === 'strict' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
      let range = document.lineAt(0).range;
      if (violation.offending) {
        const matchedRange = importRangeByValue.get(violation.offending);
        if (matchedRange) {
          range = matchedRange;
        }
      }

      const diagnostic = new vscode.Diagnostic(range, violation.message, severity);
      diagnostic.code = match.policy.id;
      diagnostic.source = 'LACE';
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}
