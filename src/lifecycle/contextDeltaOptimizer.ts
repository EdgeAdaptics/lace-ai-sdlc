export interface ContextDeltaData {
  language: string;
  file: string;
  functionName: string;
  decisions: string[];
  violations: string[];
  fullContext: string;
}

export class ContextDeltaOptimizer {
  optimize(previousContext: string, data: ContextDeltaData): string {
    const trimmedPrevious = previousContext.trim();
    if (!trimmedPrevious) {
      return data.fullContext;
    }

    const previous = summarizeContext(trimmedPrevious);
    const unchanged =
      setsEqual(new Set(previous.decisions), new Set(data.decisions)) &&
      setsEqual(new Set(previous.violations), new Set(data.violations));

    if (unchanged) {
      return [
        '// LACE CONTEXT:',
        `// Language: ${data.language}`,
        `// File: ${data.file}`,
        `// Function: ${data.functionName}`,
        '// Note: No SDLC changes detected since last generation.'
      ].join('\n');
    }

    return data.fullContext;
  }
}

function summarizeContext(block: string): { decisions: string[]; violations: string[] } {
  const lines = block.split('\n');
  const decisions: string[] = [];
  const violations: string[] = [];
  let currentSection: 'decisions' | 'violations' | undefined;

  for (const line of lines) {
    if (line.startsWith('// Decisions Affecting Module')) {
      currentSection = 'decisions';
      continue;
    }
    if (line.startsWith('// Violations')) {
      currentSection = 'violations';
      continue;
    }
    if (line.startsWith('//') && line.includes(':')) {
      if (currentSection === 'decisions' && line.startsWith('// - ')) {
        decisions.push(line.slice(4).trim());
      } else if (currentSection === 'violations' && line.startsWith('// - ')) {
        violations.push(line.slice(4).trim());
      }
    }
  }

  return { decisions, violations };
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}
