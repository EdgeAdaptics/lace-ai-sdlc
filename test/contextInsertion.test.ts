import { describe, it, expect } from 'vitest';
import { applyContextInsertion } from '../src/context/contextInsertion';
import type { ContextInsertionMode } from '../src/config/settings';

const snippet = `// LACE CONTEXT:
// Language: cpp
// File: src/app.cpp`;

function runModeTest(mode: ContextInsertionMode, documentText: string, cursorOffset = documentText.length) {
  return applyContextInsertion(documentText, snippet, mode, cursorOffset);
}

describe('applyContextInsertion', () => {
  it('replaces existing block deterministically', () => {
    const doc = `${snippet}\nconsole.log('x');\n`;
    const plan = runModeTest('replace', doc);
    expect(plan.newText).toBe(`${snippet}\nconsole.log('x');\n`);
  });

  it('inserts at cursor when requested', () => {
    const doc = `console.log('a');\n`;
    const plan = runModeTest('cursor', doc, 0);
    expect(plan.newText?.startsWith(`${snippet}\nconsole.log`)).toBe(true);
  });

  it('inserts at top when requested', () => {
    const doc = `console.log('b');\n`;
    const plan = runModeTest('top', doc);
    expect(plan.newText?.startsWith(snippet)).toBe(true);
  });

  it('returns clipboard text when mode is clipboard', () => {
    const doc = `console.log('c');\n`;
    const plan = runModeTest('clipboard', doc);
    expect(plan.clipboardText).toContain('// LACE CONTEXT:');
    expect(plan.changed).toBe(false);
  });
});
