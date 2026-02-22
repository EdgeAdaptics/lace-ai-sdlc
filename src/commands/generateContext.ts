import * as path from 'path';
import * as vscode from 'vscode';
import { findLaceConfig } from '../services/config/laceConfig';
import { LaceExtensionResources } from '../types/resources';
import { getAdvisoryMode, getContextInsertionMode } from '../config/settings';
import { applyContextInsertion, shouldSkipContext } from '../context/contextInsertion';
import { buildDiagnostics } from '../vscode/diagnostics';

const COMMAND_ID = 'lace.generateContext';

export function registerGenerateContextCommand(resources: LaceExtensionResources): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const { outputChannel, statusBarItem, evaluationCache } = resources;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('LACE requires an active editor to generate context.');
      return;
    }

    statusBarItem.text = 'LACE: Generating…';
    statusBarItem.show();
    outputChannel.appendLine('[LACE] Starting governance context generation.');

    try {
      const document = editor.document;
      const configLocation = await findLaceConfig(collectSearchPaths(document));
      if (!configLocation) {
        resources.diagnostics.clear();
        void vscode.window.showWarningMessage('LACE could not locate .lace/policies.yaml in this workspace.');
        outputChannel.appendLine('[LACE] No .lace directory located.');
        return;
      }

      const evaluation = await resources.evaluator.evaluate({
        document,
        cursor: editor.selection.active,
        laceConfig: configLocation
      });
      evaluationCache.set(document.uri.toString(), evaluation);
      const contextBlock = evaluation.context;

      if (shouldSkipContext(evaluation)) {
        void vscode.window.showInformationMessage('LACE: No governance context required.');
      } else {
        const mode = getContextInsertionMode();
        const plan = applyContextInsertion(
          document.getText(),
          contextBlock.text,
          mode,
          document.offsetAt(editor.selection.active)
        );

        if (plan.clipboardText) {
          await vscode.env.clipboard.writeText(plan.clipboardText);
          outputChannel.appendLine('[LACE] Context copied to clipboard.');
        } else if (plan.newText !== undefined) {
          await replaceDocumentText(editor, plan.newText);
          outputChannel.appendLine(
            `[LACE] Context inserted (${contextBlock.invariantsIncluded} invariants, ${contextBlock.decisionsIncluded} decisions).`
          );
        }
      }

      const advisoryMode = getAdvisoryMode();
      resources.diagnostics.set(
        document.uri,
        buildDiagnostics(evaluation.metadata, evaluation.matches, document, advisoryMode)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[LACE] Generate context failed: ${message}`);
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

async function replaceDocumentText(editor: vscode.TextEditor, newText: string): Promise<void> {
  await editor.edit(editBuilder => {
    const document = editor.document;
    const lastLine = document.lineCount > 0 ? document.lineCount - 1 : 0;
    const endPosition = document.lineCount === 0 ? new vscode.Position(0, 0) : document.lineAt(lastLine).range.end;
    const fullRange = new vscode.Range(new vscode.Position(0, 0), endPosition);
    editBuilder.replace(fullRange, newText);
  });
}
