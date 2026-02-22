import * as path from 'path';
import * as vscode from 'vscode';
import { findLaceConfig } from '../services/config/laceConfig';
import type { ContextBlockResult } from '../context/contextCompiler';
import type { ApplicablePolicy } from '../core/policyTypes';
import type { ParsedFileMetadata } from '../services/parser/types';
import { LaceExtensionResources } from '../types/resources';

const COMMAND_ID = 'lace.generateContext';

export function registerGenerateContextCommand(resources: LaceExtensionResources): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const { outputChannel, statusBarItem } = resources;
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
      const contextBlock = evaluation.context;

      const inserted = await insertContextBlock(editor, contextBlock);
      if (!inserted) {
        outputChannel.appendLine('[LACE] Context insertion canceled by user.');
        return;
      }

      resources.diagnostics.set(document.uri, buildDiagnostics(evaluation.metadata, evaluation.matches, document));

      outputChannel.appendLine(
        `[LACE] Context inserted (${contextBlock.invariantsIncluded} invariants, ${contextBlock.decisionsIncluded} decisions).`
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

async function insertContextBlock(editor: vscode.TextEditor, contextBlock: ContextBlockResult): Promise<boolean> {
  const existingRange = findExistingContextBlock(editor.document);
  let replaceExisting = false;

  if (existingRange) {
    const selection = await vscode.window.showQuickPick(
      [
        { label: 'Replace existing LACE context block', value: 'replace' },
        { label: 'Insert another block at cursor', value: 'insert' }
      ],
      {
        placeHolder: 'Existing LACE context block detected.'
      }
    );

    if (!selection) {
      return false;
    }

    replaceExisting = selection.value === 'replace';
  }

  await editor.edit(editBuilder => {
    const snippet = `${contextBlock.text}\n`;
    if (replaceExisting && existingRange) {
      editBuilder.replace(existingRange, snippet);
    } else {
      editBuilder.insert(editor.selection.start, snippet);
    }
  });

  return true;
}

function buildDiagnostics(
  metadata: ParsedFileMetadata,
  matches: ApplicablePolicy[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const importRangeByValue = new Map<string, vscode.Range>(metadata.imports.map(entry => [entry.value, entry.range]));

  for (const match of matches) {
    for (const violation of match.violations) {
      const severity =
        violation.severity === 'strict' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
      let range = document.lineAt(0).range;
      if (violation.offending) {
        const matchedRange = importRangeByValue.get(violation.offending);
        if (matchedRange) {
          range = matchedRange;
        }
      }

      diagnostics.push(new vscode.Diagnostic(range, violation.message, severity));
    }
  }

  return diagnostics;
}

function findExistingContextBlock(document: vscode.TextDocument): vscode.Range | undefined {
  for (let line = 0; line < document.lineCount; line += 1) {
    const currentLine = document.lineAt(line);
    if (!currentLine.text.startsWith('// LACE CONTEXT:')) {
      continue;
    }

    let endLine = line;
    while (endLine + 1 < document.lineCount) {
      const nextLine = document.lineAt(endLine + 1);
      if (!nextLine.text.trim().startsWith('//')) {
        break;
      }
      endLine += 1;
    }

    const startPosition = new vscode.Position(line, 0);
    const endPosition = document.lineAt(endLine).range.end;
    return new vscode.Range(startPosition, endPosition);
  }

  return undefined;
}
