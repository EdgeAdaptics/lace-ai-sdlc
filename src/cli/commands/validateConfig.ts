import * as fs from 'fs';
import * as path from 'path';
import { load as parseYaml } from 'js-yaml';
import picomatch from 'picomatch';
import { findLaceConfig } from '../../services/config/laceConfig';

interface ValidationOptions {
  cwd?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export async function runValidateConfig(options: ValidationOptions = {}): Promise<ValidationResult> {
  const startPath = options.cwd ?? process.cwd();
  const laceConfig = await findLaceConfig([startPath]);
  if (!laceConfig) {
    throw new Error('Unable to locate .lace directory');
  }

  const errors: string[] = [];
  const policies = await readYaml(path.join(laceConfig.rootDir, 'policies.yaml'));
  const decisions = await readYaml(path.join(laceConfig.rootDir, 'decisions.yaml'));
  const requirements = await readYaml(path.join(laceConfig.rootDir, 'requirements.yaml'));

  const policyIds = new Set<string>();
  for (const policy of policies.policies ?? []) {
    if (policyIds.has(policy.id)) {
      errors.push(`Duplicate policy id: ${policy.id}`);
    }
    policyIds.add(policy.id);
    for (const glob of policy.scope?.module_glob ? [policy.scope.module_glob] : []) {
      testGlob(glob, errors);
    }
  }

  const decisionIds = new Set<string>();
  for (const decision of decisions.decisions ?? []) {
    if (decisionIds.has(decision.id)) {
      errors.push(`Duplicate decision id: ${decision.id}`);
    }
    decisionIds.add(decision.id);
    for (const policyId of decision.linked_policies ?? []) {
      if (!policyIds.has(policyId)) {
        errors.push(`Decision ${decision.id} references missing policy ${policyId}`);
      }
    }
    for (const glob of decision.affected_modules ?? []) {
      testGlob(glob, errors);
    }
  }

  const requirementIds = new Set<string>();
  for (const requirement of requirements.requirements ?? []) {
    if (requirementIds.has(requirement.id)) {
      errors.push(`Duplicate requirement id: ${requirement.id}`);
    }
    requirementIds.add(requirement.id);
    for (const glob of requirement.modules ?? []) {
      testGlob(glob, errors);
    }
    for (const decisionId of requirement.decisions ?? []) {
      if (!decisionIds.has(decisionId)) {
        errors.push(`Requirement ${requirement.id} references missing decision ${decisionId}`);
      }
    }
  }

  errors.sort();
  return { ok: errors.length === 0, errors };
}

async function readYaml(filePath: string): Promise<any> {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return (parseYaml(raw) as any) ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function testGlob(pattern: string, errors: string[]): void {
  if (!pattern) {
    return;
  }
  try {
    picomatch(pattern);
  } catch {
    errors.push(`Invalid glob pattern: ${pattern}`);
  }
}
