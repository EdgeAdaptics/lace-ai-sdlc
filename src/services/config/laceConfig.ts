import { promises as fs } from 'fs';
import * as path from 'path';

export interface LaceConfigLocation {
  rootDir: string;
  policyFile: string;
}

export async function findLaceConfig(startPaths: string[]): Promise<LaceConfigLocation | undefined> {
  const visited = new Set<string>();

  for (const start of startPaths) {
    let current = path.resolve(start);
    while (!visited.has(current)) {
      visited.add(current);
      const candidateDir = path.join(current, '.lace');
      const candidateFile = path.join(candidateDir, 'policies.yaml');
      if (await exists(candidateFile)) {
        return { rootDir: candidateDir, policyFile: candidateFile };
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  return undefined;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
