import { promises as fs } from 'fs';
import * as path from 'path';
import { load as parseYaml } from 'js-yaml';
import picomatch from 'picomatch';

type RequirementStage = 'development' | 'review' | 'stable';

interface RequirementYaml {
  requirements?: RequirementConfig[];
}

interface RequirementConfig {
  id: string;
  description: string;
  modules?: string[];
  stage?: RequirementStage;
}

interface NormalizedRequirement {
  id: string;
  description: string;
  stage: RequirementStage;
  moduleMatchers: Array<(value: string) => boolean>;
}

interface RequirementCacheEntry {
  mtimeMs: number;
  requirements: NormalizedRequirement[];
}

export interface RequirementRecord {
  id: string;
  description: string;
  stage: RequirementStage;
}

const cache = new Map<string, RequirementCacheEntry>();

export async function getRequirementsForFile(laceRoot: string, filePath: string): Promise<RequirementRecord | undefined> {
  const normalized = await loadRequirements(laceRoot);
  if (normalized.length === 0) {
    return undefined;
  }

  const matches = normalized
    .filter(requirement => requirement.stage !== 'stable')
    .filter(requirement => requirement.moduleMatchers.some(match => match(filePath)))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (matches.length === 0) {
    return undefined;
  }

  const match = matches[0];
  return {
    id: match.id,
    description: match.description,
    stage: match.stage
  };
}

async function loadRequirements(laceRoot: string): Promise<NormalizedRequirement[]> {
  const filePath = path.join(laceRoot, 'requirements.yaml');
  try {
    const stat = await fs.stat(filePath);
    const cached = cache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.requirements;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = (parseYaml(raw) as RequirementYaml | undefined)?.requirements ?? [];
    const normalized = parsed
      .map(requirement => normalizeRequirement(requirement))
      .filter(Boolean) as NormalizedRequirement[];
    cache.set(filePath, { mtimeMs: stat.mtimeMs, requirements: normalized });
    return normalized;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.set(filePath, { mtimeMs: 0, requirements: [] });
      return [];
    }
    throw error;
  }
}

function normalizeRequirement(requirement: RequirementConfig | undefined): NormalizedRequirement | undefined {
  if (!requirement || !requirement.id || !requirement.description) {
    return undefined;
  }

  const moduleMatchers = (requirement.modules ?? [])
    .filter(Boolean)
    .map(pattern => picomatch(pattern, { dot: true }));

  return {
    id: requirement.id,
    description: requirement.description,
    stage: requirement.stage ?? 'development',
    moduleMatchers
  };
}
