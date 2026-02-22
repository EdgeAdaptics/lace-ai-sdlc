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
- Optional status bar badge reflecting latest evaluation state.
- Output channel `LACE Governance` for logs and troubleshooting.
- Automatic `.lace/policies.yaml` watcher that clears caches the moment policies change—no manual refresh required.

## Policy Features
- YAML schema: `id`, `description`, `language`, `scope`, `forbidden_imports`, `required_imports`, `forbidden_calls`, `required_calls`, `severity`, `origin`.
- Severity levels: `advisory` (warning) and `strict` (error) while remaining non-blocking.
- Scoped matching via glob patterns for modules and regex for functions; policies can link back to decisions via `origin`.

## Parser & Analysis
- Extracts imports, classes, functions, exported/default declarations, and cursor-active symbol (including `const foo = () => {}` patterns).
- Lightweight regex-based function-call detection to support dangerous call invariants.
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

## Future Hooks (Phase 2+ candidates)
- Additional language grammars.
- CLI/CI integration for policy checks.
- Clipboard copy mode and automated test scaffolding.
- Repository-wide policy summaries without heavy indexing.
- Extended Vitest suite once a Linux-native Node toolchain is standard.

---

*This catalog updates alongside each release milestone.*
