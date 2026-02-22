import { promises as fs } from 'fs';
import * as path from 'path';
import { load as parseYaml } from 'js-yaml';
import picomatch from 'picomatch';

interface DecisionYaml {
  decisions?: DecisionConfig[];
}

interface DecisionConfig {
  id: string;
  title: string;
  rationale: string;
  affected_modules?: string[];
  linked_policies?: string[];
}

export interface DecisionEntry {
  id: string;
  title: string;
  rationale: string;
  moduleMatchers: Array<(value: string) => boolean>;
  linkedPolicies: string[];
}

interface LedgerCacheEntry {
  mtimeMs: number;
  decisions: DecisionEntry[];
}

export interface DecisionRecord {
  id: string;
  title: string;
  rationale: string;
}

const cache = new Map<string, LedgerCacheEntry>();

export async function loadDecisionEntries(laceRoot: string): Promise<DecisionEntry[]> {
  return loadDecisions(laceRoot);
}

export function selectDecisions(
  entries: DecisionEntry[],
  filePath: string,
  linkedPolicyIds: string[] = []
): DecisionRecord[] {
  if (entries.length === 0) {
    return [];
  }

  const lowerPolicyIds = new Set(linkedPolicyIds.map(id => id.toLowerCase()));
  const matches: DecisionRecord[] = [];
  for (const decision of entries) {
    const moduleMatched = decision.moduleMatchers.length > 0 && decision.moduleMatchers.some(match => match(filePath));
    const policyMatched =
      decision.linkedPolicies.length > 0 &&
      decision.linkedPolicies.some(policyId => lowerPolicyIds.has(policyId.toLowerCase()));

    if (!moduleMatched && !policyMatched) {
      continue;
    }

    matches.push({
      id: decision.id,
      title: decision.title,
      rationale: decision.rationale
    });
  }

  const uniqueById = new Map<string, DecisionRecord>();
  for (const record of matches) {
    if (!uniqueById.has(record.id)) {
      uniqueById.set(record.id, record);
    }
  }

  return Array.from(uniqueById.values()).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 2);
}

export async function getDecisionsForFile(
  laceRoot: string,
  filePath: string,
  linkedPolicyIds: string[] = []
): Promise<DecisionRecord[]> {
  const entries = await loadDecisionEntries(laceRoot);
  return selectDecisions(entries, filePath, linkedPolicyIds);
}

async function loadDecisions(laceRoot: string): Promise<DecisionEntry[]> {
  const filePath = path.join(laceRoot, 'decisions.yaml');
  try {
    const stat = await fs.stat(filePath);
    const cacheEntry = cache.get(filePath);
    if (cacheEntry && cacheEntry.mtimeMs === stat.mtimeMs) {
      return cacheEntry.decisions;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = (parseYaml(raw) as DecisionYaml | undefined)?.decisions ?? [];
    const normalized = parsed
      .map(decision => normalizeDecision(decision))
      .filter(Boolean) as DecisionEntry[];
    cache.set(filePath, { mtimeMs: stat.mtimeMs, decisions: normalized });
    return normalized;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      cache.set(filePath, { mtimeMs: 0, decisions: [] });
      return [];
    }
    throw error;
  }
}

function normalizeDecision(decision: DecisionConfig | undefined): DecisionEntry | undefined {
  if (!decision || !decision.id || !decision.title) {
    return undefined;
  }

  const moduleMatchers = (decision.affected_modules ?? [])
    .filter(Boolean)
    .map(pattern => picomatch(pattern, { dot: true }));

  return {
    id: decision.id,
    title: decision.title,
    rationale: decision.rationale ?? '',
    moduleMatchers,
    linkedPolicies: (decision.linked_policies ?? []).filter(Boolean)
  };
}
