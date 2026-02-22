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

export interface RequirementEntry {
  id: string;
  description: string;
  stage: RequirementStage;
  moduleMatchers: Array<(value: string) => boolean>;
}

interface RequirementCacheEntry {
  mtimeMs: number;
  requirements: RequirementEntry[];
}

export interface RequirementRecord {
  id: string;
  description: string;
  stage: RequirementStage;
}

const cache = new Map<string, RequirementCacheEntry>();

export async function loadRequirementEntries(laceRoot: string): Promise<RequirementEntry[]> {
  return loadRequirements(laceRoot);
}

export function selectRequirement(entries: RequirementEntry[], filePath: string): RequirementRecord | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  const matches = entries
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

export async function getRequirementsForFile(laceRoot: string, filePath: string): Promise<RequirementRecord | undefined> {
  const entries = await loadRequirementEntries(laceRoot);
  return selectRequirement(entries, filePath);
}

async function loadRequirements(laceRoot: string): Promise<RequirementEntry[]> {
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
      .filter(Boolean) as RequirementEntry[];
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

function normalizeRequirement(requirement: RequirementConfig | undefined): RequirementEntry | undefined {
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
