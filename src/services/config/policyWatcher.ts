import * as path from 'path';
import * as vscode from 'vscode';
import { PolicyEngine } from '../../core/policyEngine';

export class PolicyWatcher implements vscode.Disposable {
  private watchers: vscode.FileSystemWatcher[] = [];
  private workspaceListener?: vscode.Disposable;

  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  initialize(): void {
    this.resetWatchers();
    this.workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() => this.resetWatchers());
  }

  dispose(): void {
    this.disposeWatchers();
    this.workspaceListener?.dispose();
  }

  private resetWatchers(): void {
    this.disposeWatchers();
    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const folder of folders) {
      const pattern = new vscode.RelativePattern(folder, '**/.lace/policies.yaml');
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      const handler = (uri: vscode.Uri) => this.handlePolicyChange(uri);
      watcher.onDidChange(handler);
      watcher.onDidCreate(handler);
      watcher.onDidDelete(handler);
      this.watchers.push(watcher);
    }
  }

  private handlePolicyChange(uri: vscode.Uri): void {
    const filePath = uri.fsPath;
    this.policyEngine.clear(filePath);
    const shortName = path.basename(filePath);
    this.outputChannel.appendLine(`[LACE] Detected ${shortName} change; policy cache cleared.`);
  }

  private disposeWatchers(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
  }
}
