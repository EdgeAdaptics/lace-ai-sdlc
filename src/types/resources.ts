import * as vscode from 'vscode';
import type { ContextCompiler } from '../context/contextCompiler';
import type { GovernanceEvaluator } from '../core/evaluator';
import type { PolicyEngine } from '../core/policyEngine';
import type { FileParser } from '../services/parser/fileParser';

export interface LaceExtensionResources {
  extensionContext: vscode.ExtensionContext;
  diagnostics: vscode.DiagnosticCollection;
  evaluator: GovernanceEvaluator;
  policyEngine: PolicyEngine;
  fileParser: FileParser;
  contextCompiler: ContextCompiler;
  outputChannel: vscode.OutputChannel;
  statusBarItem: vscode.StatusBarItem;
}
