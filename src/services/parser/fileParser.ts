import Parser from 'web-tree-sitter';
import * as vscode from 'vscode';
import type { ParsedFileMetadata, ParsedSymbol, ParsedImport, SymbolKind } from './types';

const IMPORT_NODE_TYPES = new Set(['import_statement', 'import_declaration']);
const FUNCTION_NODE_TYPES = new Set(['function_declaration', 'method_definition']);
const CLASS_NODE_TYPES = new Set(['class_declaration', 'interface_declaration']);
const VARIABLE_DECLARATION_NODE_TYPES = new Set(['variable_declaration', 'lexical_declaration', 'variable_statement']);
const ARROW_INITIALIZER_TYPES = new Set(['arrow_function', 'function', 'function_expression']);

export type ParserProvider = () => Promise<Parser>;

export class FileParser {
  private parserPromise?: Promise<Parser>;

  constructor(private readonly wasmPath: string, private readonly parserProvider?: ParserProvider) {}

  async parse(document: vscode.TextDocument, cursor: vscode.Position): Promise<ParsedFileMetadata> {
    const parser = await this.getParser();
    const documentText = document.getText();
    const tree = parser.parse(documentText);
    const root = tree.rootNode;

    const imports: ParsedImport[] = [];
    const symbols: ParsedSymbol[] = [];
    const queue = [root];
    while (queue.length > 0) {
      const node = queue.pop();
      if (!node) {
        break;
      }

      if (IMPORT_NODE_TYPES.has(node.type)) {
        const importEntry = this.extractImport(document, node);
        if (importEntry) {
          imports.push(importEntry);
        }
      } else if (node.type === 'call_expression') {
        const requireEntry = this.extractRequireCall(document, node);
        if (requireEntry) {
          imports.push(requireEntry);
        }
      }

      if (FUNCTION_NODE_TYPES.has(node.type)) {
        const functionSymbol = this.buildSymbol(document, node, node.type === 'method_definition' ? 'method' : 'function');
        if (functionSymbol) {
          symbols.push(functionSymbol);
        }
      } else if (CLASS_NODE_TYPES.has(node.type)) {
        const classSymbol = this.buildSymbol(document, node, 'class');
        if (classSymbol) {
          symbols.push(classSymbol);
        }
      } else if (VARIABLE_DECLARATION_NODE_TYPES.has(node.type)) {
        this.collectArrowFunctionSymbols(document, node, symbols);
      }

      for (let i = 0; i < node.namedChildCount; i += 1) {
        const child = node.namedChild(i);
        if (child) {
          queue.push(child);
        }
      }
    }

    const activeSymbol = this.findActiveSymbol(symbols, cursor);
    return {
      modulePath: vscode.workspace.asRelativePath(document.uri, false),
      documentUri: document.uri,
      languageId: document.languageId,
      imports,
      symbols,
      functionCalls: this.extractFunctionCalls(documentText),
      activeSymbol
    };
  }

  private extractFunctionCalls(text: string): string[] {
    const matches = new Set<string>();
    const regex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    const ignored = new Set(['if', 'for', 'while', 'switch', 'return', 'catch', 'sizeof', 'function', 'class']);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      if (!name || ignored.has(name)) {
        continue;
      }
      matches.add(name);
    }
    return Array.from(matches);
  }

  private async getParser(): Promise<Parser> {
    if (!this.parserPromise) {
      this.parserPromise = this.parserProvider
        ? this.parserProvider()
        : (async () => {
            await Parser.init();
            const language = await Parser.Language.load(this.wasmPath);
            const parser = new Parser();
            parser.setLanguage(language);
            return parser;
          })();
    }

    return this.parserPromise;
  }

  private extractImport(document: vscode.TextDocument, node: Parser.SyntaxNode): ParsedImport | undefined {
    const sourceNode = node.childForFieldName('source');
    if (!sourceNode) {
      return undefined;
    }

    const range = new vscode.Range(
      sourceNode.startPosition.row,
      sourceNode.startPosition.column,
      sourceNode.endPosition.row,
      sourceNode.endPosition.column
    );
    const raw = sourceNode.text ?? document.getText(range);
    return { value: this.cleanImportValue(raw), range };
  }

  private extractRequireCall(document: vscode.TextDocument, node: Parser.SyntaxNode): ParsedImport | undefined {
    const firstChild = node.namedChild(0);
    if (!firstChild || firstChild.type !== 'identifier') {
      return undefined;
    }

    const identifierText =
      firstChild.text ??
      document.getText(
        new vscode.Range(
          firstChild.startPosition.row,
          firstChild.startPosition.column,
          firstChild.endPosition.row,
          firstChild.endPosition.column
        )
      );

    if (identifierText !== 'require') {
      return undefined;
    }

    const argumentList = node.childForFieldName('arguments');
    if (!argumentList || argumentList.namedChildCount === 0) {
      return undefined;
    }

    const argNode = argumentList.namedChild(0);
    if (!argNode) {
      return undefined;
    }

    const range = new vscode.Range(
      argNode.startPosition.row,
      argNode.startPosition.column,
      argNode.endPosition.row,
      argNode.endPosition.column
    );

    const raw = argNode.text ?? document.getText(range);
    return {
      value: this.cleanImportValue(raw),
      range
    };
  }

  private buildSymbol(
    document: vscode.TextDocument,
    node: Parser.SyntaxNode,
    kind: SymbolKind
  ): ParsedSymbol | undefined {
    const nameNode = node.childForFieldName('name') ?? node.namedChild(0);
    if (!nameNode) {
      return undefined;
    }

    const range = new vscode.Range(
      new vscode.Position(node.startPosition.row, node.startPosition.column),
      new vscode.Position(node.endPosition.row, node.endPosition.column)
    );

    const name =
      nameNode.text ??
      document.getText(
        new vscode.Range(nameNode.startPosition.row, nameNode.startPosition.column, nameNode.endPosition.row, nameNode.endPosition.column)
      );

    return { name, kind, range };
  }

  private findActiveSymbol(symbols: ParsedSymbol[], cursor: vscode.Position): ParsedSymbol | undefined {
    let best: ParsedSymbol | undefined;
    let smallestSpan = Number.POSITIVE_INFINITY;
    for (const symbol of symbols) {
      if (!symbol.range.contains(cursor)) {
        continue;
      }

      const span =
        (symbol.range.end.line - symbol.range.start.line) * 1000 +
        (symbol.range.end.character - symbol.range.start.character);
      if (span < smallestSpan) {
        best = symbol;
        smallestSpan = span;
      }
    }

    return best;
  }

  private collectArrowFunctionSymbols(
    document: vscode.TextDocument,
    node: Parser.SyntaxNode,
    symbols: ParsedSymbol[]
  ): void {
    for (let i = 0; i < node.namedChildCount; i += 1) {
      const declarator = node.namedChild(i);
      if (!declarator || declarator.type !== 'variable_declarator') {
        continue;
      }

      const initializer =
        declarator.childForFieldName('value') ??
        declarator.childForFieldName('initializer') ??
        declarator.namedChild(1);
      if (!initializer || !ARROW_INITIALIZER_TYPES.has(initializer.type)) {
        continue;
      }

      const nameNode = declarator.childForFieldName('name') ?? declarator.namedChild(0);
      if (!nameNode) {
        continue;
      }

      const name =
        nameNode.text ??
        document.getText(
          new vscode.Range(nameNode.startPosition.row, nameNode.startPosition.column, nameNode.endPosition.row, nameNode.endPosition.column)
        );
      const range = new vscode.Range(
        new vscode.Position(declarator.startPosition.row, declarator.startPosition.column),
        new vscode.Position(declarator.endPosition.row, declarator.endPosition.column)
      );
      symbols.push({ name, kind: 'function', range });
    }
  }

  private cleanImportValue(raw: string): string {
    const trimmed = raw.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }
}
