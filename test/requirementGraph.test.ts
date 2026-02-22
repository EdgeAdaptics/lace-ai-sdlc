import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { getRequirementsForFile } from '../src/sdlc/requirementGraph';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

async function createLaceDir(requirementsYaml: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'lace-reqs-'));
  tempDirs.push(dir);
  await fs.writeFile(path.join(dir, 'requirements.yaml'), requirementsYaml, 'utf8');
  return dir;
}

describe('RequirementGraph', () => {
  it('returns only non-stable requirement that matches glob', async () => {
    const root = await createLaceDir(`requirements:
  - id: REQ-DEV
    description: Dev requirement
    modules:
      - "src/**"
    stage: development
  - id: REQ-STABLE
    description: Should not appear
    modules:
      - "src/**"
    stage: stable
`);

    const requirement = await getRequirementsForFile(root, 'src/module/file.ts');
    expect(requirement?.id).toBe('REQ-DEV');
  });
});
