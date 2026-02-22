import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { runEvaluateCommand } from '../src/cli/commands/evaluate';

const fixtureRoot = path.resolve(__dirname, 'fixtures/cli-workspace');

async function createTempWorkspace(): Promise<string> {
  const tempDir = await fs.promises.mkdtemp(path.join(tmpdir(), 'lace-determinism-'));
  await fs.promises.cp(fixtureRoot, tempDir, { recursive: true });
  const policiesPath = path.join(tempDir, '.lace/policies.yaml');
  const contents = await fs.promises.readFile(policiesPath, 'utf8');
  await fs.promises.writeFile(policiesPath, stripCiBlock(contents), 'utf8');
  return tempDir;
}

describe('Deterministic CLI output', () => {
  it('produces identical JSON across repeated evaluations', async () => {
    const tempWorkspace = await createTempWorkspace();
    const result1 = await runEvaluateCommand(
      { files: ['src/strict.cpp'], strictOnly: false, json: true },
      { cwd: tempWorkspace }
    );
    const result2 = await runEvaluateCommand(
      { files: ['src/strict.cpp'], strictOnly: false, json: true },
      { cwd: tempWorkspace }
    );
    expect(result1.json).toEqual(result2.json);
    await fs.promises.rm(tempWorkspace, { recursive: true, force: true });
  });
});

function stripCiBlock(contents: string): string {
  const ciIndex = contents.indexOf('\nci:');
  if (ciIndex === -1) {
    return contents;
  }
  return contents.slice(0, ciIndex).trimEnd() + '\n';
}
