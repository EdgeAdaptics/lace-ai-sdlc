import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { runEvaluateCommand } from '../src/cli/commands/evaluate';
import { CliEvaluator } from '../src/cli/utils/cliEvaluator';
import { runValidateConfig } from '../src/cli/commands/validateConfig';
import { runPrSummary } from '../src/cli/commands/prSummary';
import { findLaceConfig } from '../src/services/config/laceConfig';

const fixtureRoot = path.resolve(__dirname, 'fixtures/cli-workspace');

describe('CLI evaluate command', () => {
  it('respects strict-only flag when only advisory violations exist', async () => {
    await withTemporaryPolicies(async () => {
      const result = await runEvaluateCommand({
        files: ['src/advisory.cpp'],
        strictOnly: true,
        json: false
      }, { cwd: fixtureRoot });
      expect(result.exitCode).toBe(0);
    });
  });

  it('fails for strict violations', async () => {
    await withTemporaryPolicies(async () => {
      const result = await runEvaluateCommand({
        files: ['src/strict.cpp'],
        strictOnly: false,
        json: false
      }, { cwd: fixtureRoot });
      expect(result.exitCode).toBe(1);
    });
  });

  it('produces deterministic JSON output', async () => {
    await withTemporaryPolicies(async () => {
      const result = await runEvaluateCommand({
        files: ['src/strict.cpp'],
        strictOnly: false,
        json: true
      }, { cwd: fixtureRoot });
      expect(result.json).toBeDefined();
      const payload = JSON.parse(result.json!);
      expect(payload).toEqual({
        files: [
          {
            path: 'src/strict.cpp',
            strictViolations: expect.any(Number),
            advisoryViolations: expect.any(Number),
            decisions: expect.any(Array),
            requirements: expect.any(Array),
            entropyScore: expect.any(Number),
            entropyTrend: expect.any(Number)
          }
        ],
        summary: {
          strictTotal: expect.any(Number),
          advisoryTotal: expect.any(Number),
          entropyScore: expect.any(Number)
        }
      });
    });
  });

  it('returns exit code 2 when CI thresholds fail', async () => {
    const result = await runEvaluateCommand({
      files: ['src/strict.cpp'],
      strictOnly: false,
      json: false
    }, { cwd: fixtureRoot });
    // fixture thresholds are low so CI failure expected
    expect(result.exitCode).toBe(2);
  });
});

describe('validate-config', () => {
  it('returns success for valid fixture', async () => {
    const result = await runValidateConfig({ cwd: fixtureRoot });
    expect(result.ok).toBe(true);
  });

  it('detects duplicate policies', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(fixtureRoot, '..', 'dup-'));
    await fs.promises.mkdir(path.join(tempDir, '.lace'));
    await fs.promises.writeFile(path.join(tempDir, '.lace/policies.yaml'), 'policies:\n  - id: DUP\n  - id: DUP\n');
    const result = await runValidateConfig({ cwd: tempDir });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Duplicate policy');
  });
});

describe('PR summary', () => {
  it('reports affected artifacts deterministically', async () => {
    const config = await findLaceConfig([fixtureRoot]);
    if (!config) throw new Error('missing lace config');
    const evaluator = await CliEvaluator.create(config.rootDir, config.policyFile);
    const output = await runPrSummary({
      files: [path.join(fixtureRoot, 'src/strict.cpp')],
      evaluator
    });
    expect(output).toContain('PR SDLC Summary');
    expect(output).toContain('Affected Decisions');
    expect(output.split('\n')[2]).toBe('Affected Decisions:');
  });
});

async function withTemporaryPolicies(fn: () => Promise<void>): Promise<void> {
  const policyPath = path.join(fixtureRoot, '.lace/policies.yaml');
  const statePath = path.join(fixtureRoot, '.lace/state.json');
  const originalPolicy = await fs.promises.readFile(policyPath, 'utf8');
  const originalState = await fs.promises.readFile(statePath, 'utf8');
  await fs.promises.writeFile(policyPath, stripCiBlock(originalPolicy), 'utf8');
  await fs.promises.writeFile(statePath, stripEntropy(originalState), 'utf8');
  try {
    await fn();
  } finally {
    await fs.promises.writeFile(policyPath, originalPolicy, 'utf8');
    await fs.promises.writeFile(statePath, originalState, 'utf8');
  }
}

function stripCiBlock(contents: string): string {
  const ciIndex = contents.indexOf('\nci:');
  if (ciIndex === -1) {
    return contents;
  }
  return contents.slice(0, ciIndex).trimEnd() + '\n';
}

function stripEntropy(contents: string): string {
  try {
    const parsed = JSON.parse(contents);
    parsed.entropy = {};
    return JSON.stringify(parsed, null, 2);
  } catch {
    return contents;
  }
}
