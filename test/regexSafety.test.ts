import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { runEvaluateCommand } from '../src/cli/commands/evaluate';

let workspace: string;
const fixtureRoot = path.resolve(__dirname, 'fixtures/regex-workspace');

beforeEach(async () => {
  workspace = await fs.promises.mkdtemp(path.join(tmpdir(), 'lace-regex-'));
  await fs.promises.cp(fixtureRoot, workspace, { recursive: true });
});

afterEach(async () => {
  await fs.promises.rm(workspace, { recursive: true, force: true });
});

describe('Regex safety', () => {
  it('handles extremely long single-line files without backtracking issues', async () => {
    const result = await runEvaluateCommand(
      { files: ['src/long_line.cpp'], strictOnly: false, json: false },
      { cwd: workspace }
    );
    expect(result.exitCode).toBe(0);
  });
});
