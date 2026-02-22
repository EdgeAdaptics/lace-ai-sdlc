import * as vscode from 'vscode';
import { LaceExtensionResources } from '../types/resources';

const COMMAND_ID = 'lace.refreshPolicies';

export function registerRefreshPoliciesCommand(resources: LaceExtensionResources): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const { outputChannel, policyEngine } = resources;
    policyEngine.clear();
    outputChannel.appendLine('[LACE] Policy cache cleared.');
    await vscode.window.showInformationMessage('LACE policies cleared and will reload on next run.');
  });
}
