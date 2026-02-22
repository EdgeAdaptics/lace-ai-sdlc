import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { FileParser } from '../src/services/parser/fileParser';
import type { ParserProvider } from '../src/services/parser/fileParser';
import { MockTextDocument } from './utils/mockDocument';

class FakeNode {
  constructor(
    public type: string,
    public startPosition: { row: number; column: number },
    public endPosition: { row: number; column: number },
    public text: string | undefined = undefined,
    private readonly fieldMap: Record<string, FakeNode | undefined> = {},
    private readonly children: FakeNode[] = []
  ) {}

  get namedChildCount(): number {
    return this.children.length;
  }

  namedChild(index: number): FakeNode | null {
    return this.children[index] ?? null;
  }

  childForFieldName(name: string): FakeNode | null {
    return this.fieldMap[name] ?? null;
  }
}

class FakeParser {
  constructor(private readonly root: FakeNode) {}

  parse(): { rootNode: FakeNode } {
    return { rootNode: this.root };
  }
}

function createTestTree(): FakeNode {
  const importTypes = new FakeNode(
    'import_statement',
    { row: 0, column: 0 },
    { row: 0, column: 10 },
    undefined,
    { source: new FakeNode('string', { row: 0, column: 7 }, { row: 0, column: 20 }, "'../types'") }
  );
  const importData = new FakeNode(
    'import_statement',
    { row: 1, column: 0 },
    { row: 1, column: 10 },
    undefined,
    { source: new FakeNode('string', { row: 1, column: 7 }, { row: 1, column: 25 }, "'../data/gateway'") }
  );

  const arrowInitializer = new FakeNode('arrow_function', { row: 3, column: 0 }, { row: 4, column: 5 });
  const arrowName = new FakeNode('identifier', { row: 2, column: 6 }, { row: 2, column: 18 }, 'loadDashboard');
  const arrowDeclarator = new FakeNode(
    'variable_declarator',
    { row: 2, column: 0 },
    { row: 4, column: 5 },
    undefined,
    { name: arrowName, value: arrowInitializer },
    [arrowName, arrowInitializer]
  );
  const arrowDeclaration = new FakeNode(
    'lexical_declaration',
    { row: 2, column: 0 },
    { row: 4, column: 5 },
    undefined,
    {},
    [arrowDeclarator]
  );

  const functionInitializer = new FakeNode('function_expression', { row: 5, column: 0 }, { row: 6, column: 3 });
  const functionName = new FakeNode('identifier', { row: 5, column: 6 }, { row: 5, column: 20 }, 'internalHelper');
  const functionDeclarator = new FakeNode(
    'variable_declarator',
    { row: 5, column: 0 },
    { row: 6, column: 3 },
    undefined,
    { name: functionName, value: functionInitializer },
    [functionName, functionInitializer]
  );
  const functionDeclaration = new FakeNode(
    'lexical_declaration',
    { row: 5, column: 0 },
    { row: 6, column: 3 },
    undefined,
    {},
    [functionDeclarator]
  );

  const className = new FakeNode('identifier', { row: 7, column: 13 }, { row: 7, column: 33 }, 'DashboardController');
  const classNode = new FakeNode(
    'class_declaration',
    { row: 7, column: 0 },
    { row: 8, column: 1 },
    undefined,
    { name: className },
    [className]
  );

  return new FakeNode(
    'program',
    { row: 0, column: 0 },
    { row: 8, column: 1 },
    undefined,
    {},
    [importTypes, importData, arrowDeclaration, functionDeclaration, classNode]
  );
}

describe('FileParser', () => {
  it('captures arrow functions and exported declarations', async () => {
    const provider: ParserProvider = async () => new FakeParser(createTestTree()) as unknown as any;
    const parser = new FileParser('unused', provider);
    const document = new MockTextDocument('', '/workspace/src/ui/dashboard.ts') as unknown as vscode.TextDocument;
    const cursor = new vscode.Position(4, 2);
    const metadata = await parser.parse(document, cursor);

    const symbolNames = metadata.symbols.map(symbol => symbol.name);
    expect(symbolNames).toContain('loadDashboard');
    expect(symbolNames).toContain('internalHelper');
    expect(symbolNames).toContain('DashboardController');
    expect(metadata.imports.length).toBe(2);
  });
});
