import type * as vscode from 'vscode';

export type SymbolKind = 'function' | 'class' | 'method';

export interface ParsedImport {
  value: string;
  range: vscode.Range;
}

export interface ParsedSymbol {
  name: string;
  kind: SymbolKind;
  range: vscode.Range;
}

export interface ParsedFileMetadata {
  modulePath: string;
  documentUri: vscode.Uri;
  languageId: string;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  functionCalls: string[];
  activeSymbol?: ParsedSymbol;
}
