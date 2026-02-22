import * as vscode from 'vscode';
import type { LaceSeverity } from './policyTypes';

export function toDiagnosticSeverity(severity: LaceSeverity): vscode.DiagnosticSeverity {
  return severity === 'strict' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
}
