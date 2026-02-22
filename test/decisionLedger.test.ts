import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { getDecisionsForFile } from '../src/sdlc/decisionLedger';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

async function createLaceDir(decisionYaml: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'lace-decisions-'));
  tempDirs.push(dir);
  await fs.writeFile(path.join(dir, 'decisions.yaml'), decisionYaml, 'utf8');
  return dir;
}

describe('DecisionLedger', () => {
  it('matches decisions by module glob and linked policies', async () => {
    const root = await createLaceDir(`decisions:
  - id: DEC-1
    title: First
    rationale: Demo
    affected_modules:
      - "src/ui/**"
  - id: DEC-2
    title: Linked
    rationale: Via policy
    linked_policies:
      - POLICY-1
`);

    const moduleDecisions = await getDecisionsForFile(root, 'src/ui/button.ts');
    expect(moduleDecisions.map(d => d.id)).toContain('DEC-1');

    const linkedDecisions = await getDecisionsForFile(root, 'src/other/file.ts', ['POLICY-1']);
    expect(linkedDecisions.map(d => d.id)).toContain('DEC-2');
  });
});
