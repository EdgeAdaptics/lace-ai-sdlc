import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { runEvaluateCommand } from '../src/cli/commands/evaluate';
import * as decisionLedger from '../src/sdlc/decisionLedger';
import * as requirementGraph from '../src/sdlc/requirementGraph';

const fixtureRoot = path.resolve(__dirname, 'fixtures/cli-workspace');

let workspace: string;

beforeEach(async () => {
  workspace = await fs.promises.mkdtemp(path.join(tmpdir(), 'lace-cli-cache-'));
  await fs.promises.cp(fixtureRoot, workspace, { recursive: true });
  const policyPath = path.join(workspace, '.lace/policies.yaml');
  const contents = await fs.promises.readFile(policyPath, 'utf8');
  await fs.promises.writeFile(policyPath, stripCiBlock(contents), 'utf8');
});

afterEach(async () => {
  await fs.promises.rm(workspace, { recursive: true, force: true });
});

describe('YAML caching per CLI execution', () => {
  it('loads decisions and requirements once', async () => {
    const decisionSpy = vi.spyOn(decisionLedger, 'loadDecisionEntries');
    const requirementSpy = vi.spyOn(requirementGraph, 'loadRequirementEntries');
    await runEvaluateCommand(
      { files: ['src/strict.cpp', 'src/advisory.cpp'], strictOnly: false, json: false },
      { cwd: workspace }
    );
    expect(decisionSpy).toHaveBeenCalledTimes(1);
    expect(requirementSpy).toHaveBeenCalledTimes(1);
    decisionSpy.mockRestore();
    requirementSpy.mockRestore();
  });
});

function stripCiBlock(contents: string): string {
  const idx = contents.indexOf('\nci:');
  if (idx === -1) {
    return contents;
  }
  return contents.slice(0, idx).trimEnd() + '\n';
}
