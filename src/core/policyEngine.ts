import { promises as fs } from 'fs';
import * as path from 'path';
import { load as parseYaml } from 'js-yaml';
import picomatch from 'picomatch';
import type { ParsedFileMetadata } from '../services/parser/types';
import {
  ApplicablePolicy,
  LacePolicyConfig,
  LaceSeverity,
  NormalizedPolicy,
  PolicyFile,
  PolicyViolation
} from './policyTypes';

interface PolicyCacheEntry {
  mtimeMs: number;
  policies: NormalizedPolicy[];
}

const DEFAULT_SEVERITY: LaceSeverity = 'advisory';

export class PolicyEngine {
  private readonly cache = new Map<string, PolicyCacheEntry>();

  async loadPolicies(policyFilePath: string): Promise<NormalizedPolicy[]> {
    const stat = await fs.stat(policyFilePath);
    const mtimeMs = stat.mtimeMs;
    const cached = this.cache.get(policyFilePath);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.policies;
    }

    const raw = await fs.readFile(policyFilePath, 'utf8');
    const parsed = parseYaml(raw) as PolicyFile | undefined;
    if (!parsed || !Array.isArray(parsed.policies)) {
      throw new Error(`Invalid policies file: ${path.basename(policyFilePath)}`);
    }

    const normalized = parsed.policies.map(policy => this.normalizePolicy(policy)).filter(Boolean) as NormalizedPolicy[];
    this.cache.set(policyFilePath, { mtimeMs, policies: normalized });
    return normalized;
  }

  evaluate(policies: NormalizedPolicy[], metadata: ParsedFileMetadata): ApplicablePolicy[] {
    const results: ApplicablePolicy[] = [];
    const modulePath = metadata.modulePath;
    const activeName = metadata.activeSymbol?.name;
    const importValues = metadata.imports.map(entry => entry.value);
    const functionCalls = metadata.functionCalls ?? [];
    const languageId = metadata.languageId?.toLowerCase() ?? 'all';

    for (const policy of policies) {
      if (policy.language !== 'all' && policy.language !== languageId) {
        continue;
      }

      if (!this.matchesScope(policy, modulePath, activeName)) {
        continue;
      }

      const violations: PolicyViolation[] = [];

      if (policy.forbiddenImportMatchers.length > 0) {
        const violates = importValues.find(importSpec => policy.forbiddenImportMatchers.some(matcher => matcher(importSpec)));
        if (violates) {
          violations.push({
            policyId: policy.id,
            severity: policy.severity,
            type: 'forbidden-import',
            offending: violates,
            message: `Forbidden import "${violates}" matched policy ${policy.id}`
          });
        }
      }

      for (let index = 0; index < policy.requiredImportMatchers.length; index += 1) {
        const matcher = policy.requiredImportMatchers[index];
        const requirement = policy.requiredImports[index];
        const satisfied = importValues.some(importSpec => matcher(importSpec));
        if (!satisfied) {
          violations.push({
            policyId: policy.id,
            severity: policy.severity,
            type: 'missing-import',
            offending: requirement,
            message: `Required import "${requirement}" missing for policy ${policy.id}`
          });
        }
      }

      if (policy.forbiddenCallSet.size > 0) {
        const offending = functionCalls.find(call => policy.forbiddenCallSet.has(call.toLowerCase()));
        if (offending) {
          violations.push({
            policyId: policy.id,
            severity: policy.severity,
            type: 'forbidden-call',
            offending,
            message: `Forbidden call "${offending}" detected for policy ${policy.id}`
          });
        }
      }

      for (const requiredCall of policy.requiredCallSet) {
        const satisfied = functionCalls.some(call => call.toLowerCase() === requiredCall);
        if (!satisfied) {
          violations.push({
            policyId: policy.id,
            severity: policy.severity,
            type: 'missing-call',
            offending: requiredCall,
            message: `Required call "${requiredCall}" missing for policy ${policy.id}`
          });
        }
      }

      results.push({ policy, violations });
    }

    return results;
  }

  private normalizePolicy(policy: LacePolicyConfig): NormalizedPolicy | undefined {
    if (!policy || !policy.id || !policy.description) {
      return undefined;
    }

    const severity: LaceSeverity =
      policy.severity === 'strict' || policy.severity === 'advisory' ? policy.severity : DEFAULT_SEVERITY;
    const scope = policy.scope ?? {};
    const forbiddenImports = (policy.forbidden_imports ?? []).filter(Boolean);
    const requiredImports = (policy.required_imports ?? []).filter(Boolean);
    const forbiddenCalls = (policy.forbidden_calls ?? []).filter(Boolean).map(value => value.toLowerCase());
    const requiredCalls = (policy.required_calls ?? []).filter(Boolean).map(value => value.toLowerCase());
    const language = (policy.language ?? 'all').toLowerCase();

    return {
      id: policy.id,
      description: policy.description,
      severity,
      language,
      scope,
      origin: policy.origin,
      forbiddenImports,
      requiredImports,
      forbiddenCalls,
      requiredCalls,
      moduleMatcher: scope.module_glob ? picomatch(scope.module_glob, { dot: true }) : undefined,
      functionRegex: scope.function_regex ? new RegExp(scope.function_regex) : undefined,
      forbiddenImportMatchers: forbiddenImports.map(pattern => picomatch(pattern, { dot: true })),
      requiredImportMatchers: requiredImports.map(pattern => picomatch(pattern, { dot: true })),
      forbiddenCallSet: new Set(forbiddenCalls),
      requiredCallSet: new Set(requiredCalls)
    };
  }

  private matchesScope(policy: NormalizedPolicy, modulePath: string, activeSymbolName?: string): boolean {
    if (policy.moduleMatcher && !policy.moduleMatcher(modulePath)) {
      return false;
    }

    if (policy.functionRegex) {
      if (!activeSymbolName) {
        return false;
      }

      return policy.functionRegex.test(activeSymbolName);
    }

    return true;
  }

  clear(policyFilePath?: string): void {
    if (policyFilePath) {
      this.cache.delete(policyFilePath);
      return;
    }

    this.cache.clear();
  }
}
