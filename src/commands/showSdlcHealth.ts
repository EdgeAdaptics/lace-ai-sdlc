import * as path from 'path';
import * as vscode from 'vscode';
import { EntropyScoreEngine } from '../lifecycle/entropyEngine';
import { DriftDetector } from '../lifecycle/driftDetector';
import { findLaceConfig } from '../services/config/laceConfig';
import { LaceExtensionResources } from '../types/resources';

const COMMAND_ID = 'lace.showSdlcHealth';

const entropyEngine = new EntropyScoreEngine();
const driftDetector = new DriftDetector();

export function registerShowSdlcHealthCommand(resources: LaceExtensionResources): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const { evaluator, outputChannel, statusBarItem } = resources;
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

      const entropyReport = await entropyEngine.generateReport({
        laceRoot: configLocation.rootDir,
        evaluation
      });
      const driftReport = await driftDetector.analyze({
        laceRoot: configLocation.rootDir,
        evaluation
      });

      outputChannel.appendLine('--- LACE SDLC Health ---');
      outputChannel.appendLine('[Entropy]');
      outputChannel.appendLine(JSON.stringify(entropyReport, null, 2));
      outputChannel.appendLine('[Drift]');
      outputChannel.appendLine(JSON.stringify(driftReport, null, 2));
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
