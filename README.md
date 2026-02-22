# LACE — Deterministic AI-SDLC Governance (v0.5.0-beta)

## 1. The Problem: AI-Accelerated SDLC Entropy
Code assistants generate drafts faster than teams can review them. A suggestion that violates layering rules, reaches into forbidden modules, or silently alters interfaces can reach the repository before anyone notices. Traditional linting flags syntax or style; it rarely captures the architectural invariants that keep large systems predictable. Prompt engineering helps, but every engineer ends up repeating the same reminders to their AI, wasting tokens and leaving room for drift. LACE exists because entropy accumulates at the architectural level, not just in formatting.

## 2. Deterministic Governance Philosophy
LACE is purposefully deterministic. For any given file, policy set, and cursor position the output is fixed. No heuristics, no probabilistic scoring, no hidden state across machines. Policies live in `.lace/policies.yaml`, decisions in `.lace/decisions.yaml`, and requirements in `.lace/requirements.yaml`. The engine parses only the active file, extracts imports and function calls, evaluates the declarative rules, and emits a compact context block plus diagnostics. Entropy scoring and the Entropy Trend Index are bounded in `[0,1]` with four-decimal rounding. This predictability lets CI treat LACE findings as contractual rather than advisory.

## 3. What LACE Is Not
- Not a linter or formatter. LACE enforces architectural invariants, not style guides.
- Not a background daemon. No indexing threads, no watchers beyond `.lace` file change events.
- Not a prompt generator. It injects deterministic context comments and diagnostics; developers still control Copilot or other assistants.
- Not an embedded LLM. LACE never calls an LLM locally or remotely; it relies on static analysis plus declarative policies.
- Not a replacement for code review or security scanning. It targets the governance layer between architecture and implementation.

## 4. Layered Architecture Overview
1. **Layer 1 – Governance Kernel**: Policy engine, parser, token-bounded context compiler, VSCode command/diagnostics.
2. **Layer 2 – SDLC Memory**: Decision ledger, requirement graph, persistent state (violations, file counts, entropy). All data lives under `.lace/` and is read only when needed.
3. **Layer 3 – Lifecycle Intelligence**: Deterministic analytics (entropy, drift, impact) that operate on evaluation results without repo-wide scans.
4. **Layer 4 – Org & CI Integration**: CLI commands (`evaluate`, `validate-config`, `pr-summary`) and CI exit codes (0 success, 1 strict violations, 2 CI threshold failure, 3 config validation failure).

Each layer is file-scoped and on-demand. No repositories are indexed at startup, no background processes run after evaluation, and caches exist only for the life of a CLI invocation.

## 5. Current Maturity (0.5.0-beta)
- **VSCode Extension**: `LACE: Generate with Governance Context`, `LACE: Refresh Policies`, `LACE: Show SDLC Health`. Context injection modes (replace/cursor/top/clipboard), advisory modes (silent/normal/verbose), smart skip when no governance data applies, hover hints with policy/decision/drift metadata, and on-save evaluations.
- **Policy Evaluation**: YAML-driven rules covering forbidden/required imports and calls, module/function scoping, severity levels, and decision linkages. Tree-sitter is used only on the active file; no repository traversal occurs.
- **Context Compiler**: ≤400 tokens, sorted outputs, deterministic truncation, linked decisions/requirements, entropy-aware metadata.
- **SDLC Memory**: `.lace/decisions.yaml` and `.lace/requirements.yaml` parsed once per CLI process; `.lace/state.json` stores aggregate violation counts and entropy (with corruption recovery and sanitization).
- **Scientific Entropy Model**: VRS/PDS/DDS/CIS/SCS normalized components, weighted formula, ETI persistence with four-decimal rounding and tolerance for sub-0.0001 drift.
- **CLI**: `lace-cli evaluate` (supports `--strict-only`, `--json`, CI thresholds), `lace-cli validate-config`, `lace-cli pr-summary --changed-files`. YAML files are parsed once per command execution. Regex patterns for import/call detection are bounded and tested against 10k-character lines.
- **Testing & Determinism**: Vitest suites cover the policy engine, parser extraction, SDLC memory, entropy math, deterministic repeat-run JSON output, regex safety, YAML caching, hover rendering, and persistent-state recovery.

The system is feature-complete for deterministic governance but remains beta because performance and monorepo stress validation are still underway (Phase 5B2) and CI hardening/documentation polish (Phase 5C) are pending before the 1.0.0 tag.

## 6. Getting Started
1. `npm install`
2. Add `.lace/policies.yaml`, `.lace/decisions.yaml`, and `.lace/requirements.yaml` to your repository. Start with small rule sets targeting your most critical invariants.
3. Launch the VSCode extension in development mode, run “LACE: Generate with Governance Context,” and review the structured context block injected near your cursor (or copied to the clipboard depending on the configured mode).
4. Run `lace-cli evaluate <files>` locally or in CI to enforce policies. Use `--strict-only` if advisory violations should not fail the build and `--json` when machine-readable output is needed. Exit codes: `0` success, `1` strict violations, `2` CI threshold failure, `3` config validation failure.
5. Keep `.lace/state.json` under version control or regenerate it in CI; it only stores aggregate counts and entropy per file and recovers automatically if missing.

## 7. Production Readiness Notes
- **Determinism**: All arrays in outputs are sorted; entropy and ETI values are rounded to four decimals; repeat CLI evaluations of the same file produce identical JSON.
- **Local-First**: No network calls, no remote dependency beyond npm packages already installed. All analysis happens on the developer’s machine or CI runner.
- **Bounded State**: `.lace/state.json` holds only `violations`, `files`, and `entropy`. Corruption triggers a warning and reset; no historical logs or timestamps accumulate.
- **Scoping**: Analyses never cross file boundaries. Parsers only examine the currently evaluated file; SDLC memory just maps policies/decisions/requirements to module globs.
- **CI Usage**: Deterministic exit codes allow CI jobs to enforce policy gates without ambiguity. JSON output makes it easy to turn findings into annotations or dashboards.

## 8. Road to 1.0.0
- **5B2 – Stress & Scaling Validation**: Synthetic monorepo fixtures, linear scaling benchmarks, additional monitoring around regex and YAML performance.
- **5C – CI Robustness & Docs**: Final verification of CI thresholds, documentation polish, governance playbooks.
- **1.0.0 – Stability Release**: After stress and CI phases complete, LACE 1.0.0 will focus on stability, deterministic guarantees, and repeatable integration guidance.

LACE remains focused on one outcome: keep AI-assisted code inside the boundaries defined by the team without introducing nondeterministic dependencies. The current beta is suitable for evaluation in repositories that value architectural discipline and predictable CI behavior.
