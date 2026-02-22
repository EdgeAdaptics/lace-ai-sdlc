import * as path from 'path';
import * as vscode from 'vscode';
import { EntropyScoreEngine } from '../lifecycle/entropyEngine';
import { DriftDetector } from '../lifecycle/driftDetector';
import { findLaceConfig } from '../services/config/laceConfig';
import { LaceExtensionResources } from '../types/resources';
import type { EntropyReport } from '../lifecycle/entropyEngine';
import type { DriftReport } from '../lifecycle/driftDetector';

const COMMAND_ID = 'lace.showSdlcHealth';

const entropyEngine = new EntropyScoreEngine();
const driftDetector = new DriftDetector();

export function registerShowSdlcHealthCommand(resources: LaceExtensionResources): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const { evaluator, outputChannel, statusBarItem, evaluationCache } = resources;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('LACE requires an active editor to analyze SDLC health.');
      return;
    }

    statusBarItem.text = 'LACE: Analyzing…';
    statusBarItem.show();

    try {
      const configLocation = await findLaceConfig(collectSearchPaths(editor.document));
      if (!configLocation) {
        void vscode.window.showWarningMessage('LACE could not locate .lace artifacts in this workspace.');
        return;
      }

      const evaluation = await evaluator.evaluate({
        document: editor.document,
        cursor: editor.selection.active,
        laceConfig: configLocation
      });
      evaluationCache.set(editor.document.uri.toString(), evaluation);

      const entropyReport = await entropyEngine.generateReport({
        laceRoot: configLocation.rootDir,
        evaluation
      });
      const driftReport = await driftDetector.analyze({
        laceRoot: configLocation.rootDir,
        evaluation
      });

      const report = formatHealthReport(entropyReport, driftReport);
      outputChannel.appendLine(report);
      outputChannel.show(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[LACE] SDLC Health analysis failed: ${message}`);
      void vscode.window.showErrorMessage(`LACE error: ${message}`);
    } finally {
      statusBarItem.text = 'LACE';
      statusBarItem.hide();
    }
  });
}

function collectSearchPaths(document: vscode.TextDocument): string[] {
  const paths = new Set<string>();
  paths.add(path.dirname(document.uri.fsPath));
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    paths.add(folder.uri.fsPath);
  }
  return Array.from(paths);
}

export function formatHealthReport(entropy: EntropyReport, drift: DriftReport): string {
  const lines: string[] = [];
  lines.push('LACE SDLC Health Report');
  lines.push('------------------------');
  lines.push(...renderList('Recurring Violations', drift.recurringViolations));
  lines.push(...renderList('Unstable Modules', drift.unstableModules));
  lines.push(...renderList('Decision Drift', drift.ignoredDecisions));
  lines.push(`Context Inflation: ${entropy.contextInflationScore}`);
  lines.push(`Entropy Score: ${entropy.entropyScore?.toFixed(4) ?? '0.0000'}`);
  return lines.join('\n');
}

function renderList(title: string, values: string[]): string[] {
  const sorted = [...values].sort();
  if (sorted.length === 0) {
    return [`${title}:`, ' - None'];
  }

  return [`${title}:`, ...sorted.map(value => ` - ${value}`)];
}
