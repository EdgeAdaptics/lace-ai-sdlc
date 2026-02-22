import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { getViolationCount, incrementViolation } from '../src/sdlc/persistentState';

const tempDirs: string[] = [];

afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 600));
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

async function createLaceDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'lace-state-'));
  tempDirs.push(dir);
  return dir;
}

describe('PersistentState', () => {
  it('increments violation counts deterministically', async () => {
    const root = await createLaceDir();
    expect(await getViolationCount(root, 'RULE-A')).toBe(0);
    await incrementViolation(root, 'RULE-A', 'src/a.cpp');
    await incrementViolation(root, 'RULE-A', 'src/a.cpp');
    expect(await getViolationCount(root, 'RULE-A')).toBe(2);
  });
});
