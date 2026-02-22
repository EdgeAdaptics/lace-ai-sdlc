import * as vscode from 'vscode';

export type ContextInsertionMode = 'replace' | 'cursor' | 'top' | 'clipboard';
export type AdvisoryMode = 'silent' | 'normal' | 'verbose';

export function getContextInsertionMode(): ContextInsertionMode {
  const config = vscode.workspace.getConfiguration('lace');
  return config.get<ContextInsertionMode>('contextInjectionMode', 'replace');
}

export function getAdvisoryMode(): AdvisoryMode {
  const config = vscode.workspace.getConfiguration('lace');
  return config.get<AdvisoryMode>('advisoryMode', 'normal');
}
