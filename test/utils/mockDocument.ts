import * as vscode from 'vscode';

export class MockTextDocument {
  public readonly uri: vscode.Uri;
  public readonly languageId: string;
  private readonly text: string;
  private readonly lines: string[];

  constructor(text: string, filePath: string, languageId = 'typescript') {
    this.text = text;
    this.lines = text.split(/\r?\n/);
    this.uri = vscode.Uri.file(filePath);
    this.languageId = languageId;
  }

  getText(range?: vscode.Range): string {
    if (!range) {
      return this.text;
    }

    const startOffset = this.offsetAt(range.start);
    const endOffset = this.offsetAt(range.end);
    return this.text.slice(startOffset, endOffset);
  }

  lineAt(index: number): { text: string } {
    return { text: this.lines[index] ?? '' };
  }

  private offsetAt(position: vscode.Position): number {
    let offset = 0;
    for (let line = 0; line < position.line; line += 1) {
      offset += (this.lines[line]?.length ?? 0) + 1;
    }
    return offset + position.character;
  }
}
