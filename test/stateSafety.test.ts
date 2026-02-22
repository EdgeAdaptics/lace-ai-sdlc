import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { getStateSnapshot } from '../src/sdlc/persistentState';

let laceRoot: string;

beforeEach(async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(tmpdir(), 'lace-state-'));
  laceRoot = path.join(tempDir, '.lace');
  await fs.promises.mkdir(laceRoot, { recursive: true });
});

afterEach(async () => {
  await fs.promises.rm(path.dirname(laceRoot), { recursive: true, force: true });
});

describe('state.json resilience', () => {
  it('recovers from missing file', async () => {
    const snapshot = await getStateSnapshot(laceRoot);
    expect(snapshot.violations).toEqual({});
    expect(snapshot.files).toEqual({});
    expect(snapshot.entropy).toEqual({});
  });

  it('resets when file is corrupt', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.promises.writeFile(path.join(laceRoot, 'state.json'), '{invalid');
    const snapshot = await getStateSnapshot(laceRoot);
    expect(snapshot.entropy).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('sanitizes unexpected keys', async () => {
    await fs.promises.writeFile(
      path.join(laceRoot, 'state.json'),
      JSON.stringify({
        violations: { RULE: 1, BAD: 'x' },
        files: { 'src/a.cpp': { violationCount: 2, extra: true } },
        entropy: { 'src/a.cpp': 0.123456, BAD: 'y' },
        extraKey: {}
      })
    );
    const snapshot = await getStateSnapshot(laceRoot);
    expect(snapshot.violations).toEqual({ RULE: 1 });
    expect(snapshot.files).toEqual({ 'src/a.cpp': { violationCount: 2 } });
    expect(snapshot.entropy['src/a.cpp']).toBeCloseTo(0.1235, 4);
    expect(snapshot.entropy.BAD).toBeUndefined();
  });
});
