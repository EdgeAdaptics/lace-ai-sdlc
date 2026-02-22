import * as fs from 'fs';
import * as path from 'path';
import type { ParsedFileMetadata, ParsedImport } from '../../services/parser/types';

const LANGUAGE_MAP: Record<string, string> = {
  '.c': 'cpp',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.h': 'cpp',
  '.hh': 'cpp',
  '.hpp': 'cpp',
  '.py': 'python',
  '.sh': 'shellscript',
  '.bash': 'shellscript'
};

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] ?? 'unknown';
}

export async function buildMetadata(filePath: string, laceRoot: string): Promise<ParsedFileMetadata> {
  const text = await fs.promises.readFile(filePath, 'utf8');
  const languageId = detectLanguage(filePath);
  const modulePath = path.relative(path.dirname(laceRoot), filePath).replace(/\\/g, '/');
  const imports = extractImports(languageId, text, filePath);
  const functionCalls = extractFunctionCalls(text);
  return {
    modulePath,
    documentUri: { fsPath: filePath } as any,
    languageId,
    imports,
    symbols: [],
    functionCalls,
    activeSymbol: undefined
  };
}

function extractImports(languageId: string, text: string, filePath: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (languageId === 'cpp') {
      const match = trimmed.match(/^#\s*include\s*[<\"]([^>\"]+)/);
      if (match) {
        imports.push(createImport(match[1], index, line.indexOf(match[1])));
      }
    } else if (languageId === 'python') {
      const match = trimmed.match(/^from\s+([\w\.]+)/) || trimmed.match(/^import\s+([\w\.]+)/);
      if (match) {
        imports.push(createImport(match[1], index, line.indexOf(match[1])));
      }
    } else if (languageId === 'shellscript') {
      const match = trimmed.match(/^(source|\.)\s+([^\s]+)/);
      if (match) {
        imports.push(createImport(match[2], index, line.indexOf(match[2])));
      }
    }
  });
  return imports;
}

function createImport(value: string, line: number, column: number): ParsedImport {
  return {
    value,
    range: {
      start: { line, character: column },
      end: { line, character: column + value.length }
    } as any
  };
}

function extractFunctionCalls(text: string): string[] {
  const matches = new Set<string>();
  const regex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  const ignored = new Set(['if', 'for', 'while', 'switch', 'return', 'catch', 'sizeof', 'function', 'class']);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    if (!ignored.has(name)) {
      matches.add(name);
    }
  }
  return Array.from(matches);
}
