/* eslint-disable @typescript-eslint/no-empty-function */
import * as path from 'path';

export class Position {
  constructor(public line: number, public character: number) {}
}

export class Range {
  constructor(public start: Position, public end: Position) {}

  contains(position: Position): boolean {
    if (position.line < this.start.line || position.line > this.end.line) {
      return false;
    }

    if (position.line === this.start.line && position.character < this.start.character) {
      return false;
    }

    if (position.line === this.end.line && position.character > this.end.character) {
      return false;
    }

    return true;
  }
}

export class Uri {
  constructor(public fsPath: string) {}

  static file(fsPath: string): Uri {
    return new Uri(path.resolve(fsPath));
  }

  toString(): string {
    return this.fsPath;
  }
}

class Disposable {
  dispose(): void {}
}

export class RelativePattern {
  constructor(public base: { fsPath: string }, public pattern: string) {}
}

export const workspace = {
  workspaceFolders: [] as Array<{ uri: Uri }>,
  asRelativePath(input: Uri | string): string {
    if (typeof input === 'string') {
      return input;
    }
    const cwd = process.cwd();
    return path.relative(cwd, input.fsPath) || input.fsPath;
  },
  createFileSystemWatcher(): {
    onDidChange: () => Disposable;
    onDidCreate: () => Disposable;
    onDidDelete: () => Disposable;
    dispose: () => void;
  } {
    return {
      onDidChange: () => new Disposable(),
      onDidCreate: () => new Disposable(),
      onDidDelete: () => new Disposable(),
      dispose() {}
    };
  },
  onDidChangeWorkspaceFolders(): Disposable {
    return new Disposable();
  }
};

export const window = {
  showInformationMessage: async (): Promise<void> => {},
  showWarningMessage: async (): Promise<void> => {},
  showErrorMessage: async (): Promise<void> => {},
  createOutputChannel: () => ({
    appendLine(): void {},
    dispose(): void {}
  }),
  createStatusBarItem: () => ({
    text: '',
    tooltip: '',
    show(): void {},
    hide(): void {},
    dispose(): void {}
  })
};

export const commands = {
  registerCommand: (): Disposable => new Disposable()
};

export const languages = {
  createDiagnosticCollection: () => ({
    set(): void {},
    clear(): void {},
    dispose(): void {}
  })
};

export const DiagnosticSeverity = {
  Warning: 1,
  Error: 2
};
