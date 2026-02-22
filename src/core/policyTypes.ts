export type LaceSeverity = 'advisory' | 'strict';

export interface PolicyScope {
  module_glob?: string;
  function_regex?: string;
}

export interface LacePolicyConfig {
  id: string;
  description: string;
  language?: string;
  scope?: PolicyScope;
  forbidden_imports?: string[];
  required_imports?: string[];
  forbidden_calls?: string[];
  required_calls?: string[];
  severity?: LaceSeverity;
  origin?: string;
}

export interface CiConfig {
  maxContextInflation?: number;
  maxEntropyScore?: number;
  failOnDecisionDrift?: boolean;
}

export interface PolicyFile {
  policies: LacePolicyConfig[];
  ci?: CiConfig;
}

export interface PolicyViolation {
  policyId: string;
  severity: LaceSeverity;
  type: 'forbidden-import' | 'missing-import' | 'forbidden-call' | 'missing-call';
  message: string;
  offending?: string;
}

export interface ApplicablePolicy {
  policy: NormalizedPolicy;
  violations: PolicyViolation[];
}

export interface NormalizedPolicy {
  id: string;
  description: string;
  severity: LaceSeverity;
  language: string;
  scope: PolicyScope;
  forbiddenImports: string[];
  requiredImports: string[];
  forbiddenCalls: string[];
  requiredCalls: string[];
  origin?: string;
  moduleMatcher?: GlobMatcher;
  functionRegex?: RegExp;
  forbiddenImportMatchers: GlobMatcher[];
  requiredImportMatchers: GlobMatcher[];
  forbiddenCallSet: Set<string>;
  requiredCallSet: Set<string>;
}

export type GlobMatcher = (value: string) => boolean;
