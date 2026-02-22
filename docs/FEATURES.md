# Lace-AI-SDLC Feature Catalog (Phase 1)

## Core Capabilities
- **Policy-Governed Context** — Loads `.lace/policies.yaml` and injects deterministic architectural context before Copilot usage.
- **Single-File Parsing** — Evaluates only the active document on demand or on save; no indexing, no daemons.
- **Scope-Aware Evaluation** — Matches invariants by module glob and optional function regex to keep enforcement precise.
- **Advisory Diagnostics** — Presents findings in a VSCode diagnostic collection and output channel without blocking editing.
- **Token-Bounded Context Compiler** — Enforces a ≤400-token limit, truncates deterministically, and replaces old context blocks.
- **SDLC Memory Integration** — Pulls linked decisions (`.lace/decisions.yaml`), requirements (`.lace/requirements.yaml`), and strict violation counts (`.lace/state.json`) into the rendered context.

## VSCode Integration
- Command palette entry: `LACE: Generate with Governance Context`.
- Context injection modes: replace, cursor, top, clipboard.
- Advisory mode control: silent, normal, verbose (verbose adds entropy hints to hovers).
- Smart context skip avoids inserting empty blocks and notifies the developer.
- SDLC health command renders deterministic reports in the output channel.
- Diagnostic hovers show policy, decision, violation count, and drift score.
- Optional status bar badge reflecting latest evaluation state.
- Output channel `LACE Governance` for logs and troubleshooting.
- Automatic `.lace/policies.yaml` watcher that clears caches the moment policies change—no manual refresh required.

## Policy Features
- YAML schema: `id`, `description`, `language`, `scope`, `forbidden_imports`, `required_imports`, `forbidden_calls`, `required_calls`, `severity`, `origin`.
- Severity levels: `advisory` (warning) and `strict` (error) while remaining non-blocking.
- Scoped matching via glob patterns for modules and regex for functions; policies can link back to decisions via `origin`.

## Parser & Analysis
- Extracts imports, classes, functions, exported/default declarations, and cursor-active symbol (including `const foo = () => {}` patterns).
- Lightweight, anchored regex-based detection of imports/includes/function calls; patterns are tested against 10k-character lines to prevent catastrophic backtracking.
- Incremental execution on explicit command or save; no background scans.

## Context Output Structure
```
// LACE CONTEXT:
// Language: <language>
// File: <relative path>
// Function: <name or N/A>
// Applicable Invariants:
// - STRICT <rule-id>: <summary>
// Decisions Affecting Module:
// - <decision-id>: <title>
// Requirement:
// - <requirement-id>: <description>
// Violations:
// - <rule-id>: <description>
// ... N additional items omitted (if truncated)
```

## CLI Capabilities
- `lace-cli evaluate <files>` — file-scoped governance checks with `--strict-only` exit logic and `--json` output for CI parsing.
- `lace-cli validate-config` — detects duplicate IDs, invalid glob patterns, and orphaned decision/requirement references.
- `lace-cli pr-summary --changed-files <files...>` — aggregates affected decisions/requirements, new strict violations, and entropy deltas for PR reviews.
- CI thresholds (`maxContextInflation`, `maxEntropyScore`, `failOnDecisionDrift`) enforced with deterministic exit codes (0 success, 1 strict violations, 2 CI failure, 3 config errors).
- Policies, decisions, and requirements are parsed once per CLI invocation and reused for every file in that process to keep evaluations linear and deterministic.

## Scientific Entropy Model
- Normalized entropy scoring across five components:
  - `VRS = min(strictViolations / 10, 1)`
  - `PDS = violatedPolicies / totalApplicablePolicies`
  - `DDS = decisionLinkedViolations / decisionsAffectingFile`
  - `CIS = min(contextTokens / 400, 1)`
  - `SCS = min(projectRelativeImports / 20, 1)`
- Final entropy score `E = 0.30*VRS + 0.25*PDS + 0.20*DDS + 0.15*CIS + 0.10*SCS`, deterministically rounded to four decimals.
- Entropy Trend Index (ETI) stored per file in `.lace/state.json` to capture the delta between runs without accumulating history.

## Stability & Production Hardening
- All user-visible lists (violations, decisions, requirements, CLI JSON arrays) are sorted deterministically.
- Entropy scores and trend values are rounded to exactly four decimals before storage/output.
- `.lace/state.json` is sanitized on load—corrupt or partial files are reset safely.
- Repeat CLI evaluations produce byte-identical JSON output for unchanged files.
- Regex and YAML safety: high-volume test fixtures ensure long single-line files do not trigger catastrophic backtracking and YAML files are cached per process rather than parsed repeatedly.

## Future Hooks (Phase 2+ candidates)
- Additional language grammars.
- CLI/CI integration for policy checks.
- Clipboard copy mode and automated test scaffolding.
- Repository-wide policy summaries without heavy indexing.
- Extended Vitest suite once a Linux-native Node toolchain is standard.

---

*This catalog updates alongside each release milestone.*
