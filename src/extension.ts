import * as path from 'path';
import * as vscode from 'vscode';
import { registerGenerateContextCommand } from './commands/generateContext';
import { registerRefreshPoliciesCommand } from './commands/refreshPolicies';
import { registerShowSdlcHealthCommand } from './commands/showSdlcHealth';
import { ContextCompiler } from './context/contextCompiler';
import { GovernanceEvaluator, EvaluationResult } from './core/evaluator';
import { PolicyEngine } from './core/policyEngine';
import { PolicyWatcher } from './services/config/policyWatcher';
import { FileParser } from './services/parser/fileParser';
import { LaceExtensionResources } from './types/resources';
import { registerHoverProvider } from './vscode/hoverProvider';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('LACE Governance');
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = 'LACE';
  statusBarItem.tooltip = 'LACE governance status';
  statusBarItem.hide();

  const diagnostics = vscode.languages.createDiagnosticCollection('lace');
  const wasmPath = context.asAbsolutePath(path.join('resources', 'tree-sitter', 'tree-sitter-typescript.wasm'));
  const fileParser = new FileParser(wasmPath);
  const policyEngine = new PolicyEngine();
  const contextCompiler = new ContextCompiler();
  const policyWatcher = new PolicyWatcher(policyEngine, outputChannel);
  policyWatcher.initialize();
  const evaluator = new GovernanceEvaluator(policyEngine, fileParser, contextCompiler);

  const evaluationCache = new Map<string, EvaluationResult>();

  const resources: LaceExtensionResources = {
    extensionContext: context,
    diagnostics,
    evaluator,
    policyEngine,
    fileParser,
    contextCompiler,
    outputChannel,
    statusBarItem,
    evaluationCache
  };

  context.subscriptions.push(
    outputChannel,
    statusBarItem,
    diagnostics,
    policyWatcher,
    registerGenerateContextCommand(resources),
    registerRefreshPoliciesCommand(resources),
    registerShowSdlcHealthCommand(resources),
    registerHoverProvider(resources)
  );

  outputChannel.appendLine('LACE extension activated.');
}

export function deactivate(): void {
  // VSCode disposes subscriptions automatically; explicit hook for completeness.
}
