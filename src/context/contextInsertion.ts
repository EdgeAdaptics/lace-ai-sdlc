import type { ContextInsertionMode } from '../config/settings';
import type { EvaluationResult } from '../core/evaluator';

export interface ContextInsertionPlan {
  newText?: string;
  clipboardText?: string;
  changed: boolean;
}

interface RemovalResult {
  text: string;
  removedStart?: number;
  removedLength: number;
}

export function applyContextInsertion(
  documentText: string,
  snippet: string,
  mode: ContextInsertionMode,
  cursorOffset: number
): ContextInsertionPlan {
  const normalizedSnippet = snippet.endsWith('\n') ? snippet : `${snippet}\n`;
  const removal = stripExistingBlock(documentText);
  let baseText = removal.text;
  let adjustedCursor = cursorOffset;
  if (removal.removedStart !== undefined && removal.removedStart < cursorOffset) {
    adjustedCursor = Math.max(removal.removedStart, cursorOffset - removal.removedLength);
  }

  if (mode === 'clipboard') {
    return {
      clipboardText: normalizedSnippet,
      newText: documentText,
      changed: false
    };
  }

  let insertOffset: number;
  switch (mode) {
    case 'top':
      insertOffset = 0;
      break;
    case 'cursor':
      insertOffset = Math.min(Math.max(adjustedCursor, 0), baseText.length);
      break;
    case 'replace':
      insertOffset =
        removal.removedStart !== undefined ? removal.removedStart : Math.min(adjustedCursor, baseText.length);
      break;
    default:
      insertOffset = Math.min(Math.max(adjustedCursor, 0), baseText.length);
      break;
  }

  const newText = `${baseText.slice(0, insertOffset)}${normalizedSnippet}${baseText.slice(insertOffset)}`;
  return { newText, changed: true };
}

export function shouldSkipContext(evaluation: EvaluationResult): boolean {
  const hasInvariants = evaluation.context.invariantsIncluded > 0;
  const hasDecisions = evaluation.decisions.length > 0;
  const hasRequirement = Boolean(evaluation.requirement);
  const hasViolations = evaluation.matches.some(match => match.violations.length > 0);
  return !hasInvariants && !hasDecisions && !hasRequirement && !hasViolations;
}

function stripExistingBlock(text: string): RemovalResult {
  const lines = text.split('\n');
  let startIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('// LACE CONTEXT:')) {
      startIndex = i;
      endIndex = i;
      while (endIndex + 1 < lines.length && lines[endIndex + 1].trim().startsWith('//')) {
        endIndex += 1;
      }
      break;
    }
  }

  if (startIndex === -1) {
    return { text, removedLength: 0 };
  }

  const before = lines.slice(0, startIndex).join('\n');
  const after = lines.slice(endIndex + 1).join('\n');
  const removalText = lines.slice(startIndex, endIndex + 1).join('\n');
  const removedStart = before.length > 0 ? before.length + 1 : 0;
  const between = before.length > 0 && after.length > 0 ? '\n' : '';
  const stripped = [before, after].filter(part => part.length > 0).join(between);
  const removedLength = removalText.length + (before.length > 0 && after.length > 0 ? 1 : 0);
  return {
    text: stripped,
    removedStart,
    removedLength
  };
}
