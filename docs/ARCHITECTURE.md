# Lightweight AI-SDLC Governance Engine — Architecture Design

## 1. Executive Summary
LACE (Local AI-SDLC Cognition & Governance Engine) is a deterministic intelligence layer that governs AI-generated code, enforces architectural invariants, and maintains structured SDLC memory while remaining lightweight and local-first. The VSCode extension reads repository policies (`.lace/policies.yaml`), queries VSCode’s language services for the active file, augments the results with regex scanning, evaluates policy compliance, and emits a deterministic context block plus advisory diagnostics. Everything runs on-demand or on-save, stays under tight CPU/memory budgets, and limits context injection to ≤400 tokens so developers can guide Copilot without manual prompt crafting. Phase 1 implements the Governance Kernel for C++, Python, and Bash; higher layers (SDLC Memory, Lifecycle Intelligence, Org/CI Integration) are designed as extension points for future releases.

## 2. Problem Statement — AI-SDLC Entropy
Generative assistants accelerate development but often violate architectural boundaries, mix forbidden dependencies, or ignore layering contracts—especially in large C++/Python/Bash codebases. Without lightweight guardrails, teams accumulate “AI-driven entropy”: token waste, brittle scripts, and drift from established SDLC processes. Lace injects policy-aware context just-in-time, reminding AI copilots of invariants while staying advisory-first and infrastructure-light.

## 3. Scope (Phase 1 Only)
Phase 1 (Layer 1 — Governance Kernel) delivers a VSCode extension containing:
1. **Policy Engine** (YAML) that loads `.lace/policies.yaml`, evaluates global/module-scoped invariants, and reports forbidden/required imports or function calls.
2. **Multi-language Adapter Layer** using `vscode.executeDocumentSymbolProvider`, `vscode.languages.getDiagnostics`, and regex helpers to gather imports/includes/source directives plus function-call heuristics for C++, Python, and Bash (file-scoped only).
3. **Context Compiler** enforcing a ≤400-token limit while summarizing language, module metadata, active symbol, applicable invariants, and violations.
4. **Context Injection Command** `LACE: Generate with Governance Context` that inserts or replaces structured comments in the active editor.
5. **On-Save Validation Hook** that reruns the same evaluation path whenever a supported file is saved, emitting diagnostics/status updates.
6. **Diagnostics, severity mapping, and logging** to ensure deterministic enforcement.

Out-of-scope: repo-wide indexing, AST graph construction, background daemons, Copilot interception, or non-advisory enforcement.

## 4. Non-Goals
- No local LLM execution or prompt interception.
- No continuous background workers or repo-wide caches.
- No graph DB / SQL storage / background services.
- No full SDLC modeling (requirements, tests, metrics) in Phase 1.
- No blocking developer workflows; enforcement stays advisory-first.

## 5. Layered Architectural Overview
```
Layer 4 ─ Org & CI Integration (CLI, hooks, CI gates, PR summaries)  [Design]
Layer 3 ─ Lifecycle Intelligence (drift, impact, entropy, context deltas) [Design]
Layer 2 ─ SDLC Memory Layer (decisions, requirements, test contracts) [Stub]
Layer 1 ─ Governance Kernel (policies, adapters, context compiler, VSCode integration) [Phase 1]

Layer 1 overview:
  VSCode Cmd/Save ─┬─> Policy Engine (YAML loader & matcher)
                   ├─> Language Adapter (VSCode LSP + regex per language)
                   └─> Context Compiler (token limiter)
                           │
                           ├─> Structured Copilot comment
                           └─> Diagnostics/output channel
Storage: .lace/policies.yaml (+ future `.lace/decisions.yaml`, `.lace/requirements.yaml`)
```

## 6. Layer 1 — Governance Kernel Components
| Component | Responsibilities | Notes |
|-----------|------------------|-------|
| VSCode Extension Core | Activation, command registration, diagnostics, output logging, status bar indicator, save hook wiring. | Activation <200 ms by deferring heavy imports; uses command-only activation plus save listener. |
| Policy Engine | Load YAML, normalize scopes, glob matching, severity handling, advisory vs strict classification, origin metadata for future layering. | Watches `.lace/policies.yaml` and clears cache on change; deterministic evaluation. |
| Policy Watcher | Observes `**/.lace/policies.yaml` and invalidates the policy cache. | Uses VSCode `FileSystemWatcher`; emits lightweight logs only. |
| Language Adapter Layer | Routes by `document.languageId`; invokes `vscode.executeDocumentSymbolProvider`, inspects `vscode.languages.getDiagnostics`, and applies regex scanners for imports/includes/source directives plus function-call heuristics (dangerous commands/calls). | Supports C++ (`cpp`,`c`,`h`,`hpp`), Python (`python`), Bash (`shellscript`) first; extensible registry for future languages; performs best-effort include resolution for quoted headers. |
| Context Compiler | Merge language metadata (symbols/imports/calls) with policy matches, enforce token cap, render structured comment (including decision linkage stub). | Prioritizes strict findings, truncates overflow, offers “replace existing context block” UX (max 5 listed invariants before truncation, ≤400 tokens). |
| Configuration Layer | `.lace` discovery, validation messaging, future `.lace/decisions.yaml` / `.lace/requirements.yaml` hooks. | Optional future config file (Phase 2). |

## 7. Data Flow
1. User runs `LACE: Generate with Governance Context` or saves a supported file.
2. Extension locates `.lace/policies.yaml` by traversing workspace roots upward.
3. Policy Engine loads and caches YAML rules (mtime-based invalidation).
4. Language Adapter detects `document.languageId`, gathers symbols via `vscode.executeDocumentSymbolProvider`, augments with regex-derived imports/includes/source directives and function calls, resolves quoted C++ includes against the workspace, and captures active selection context.
5. Policy Engine evaluates applicable invariants (global + scoped) against imports/calls, combining existing diagnostics from `vscode.languages.getDiagnostics` when useful.
6. Context Compiler assembles the token-limited comment block and advisory payload (strict-first ordering, ≤5 invariants, ≤400 tokens), replacing a previous block if the user chooses.
7. Extension inserts/updates the comment for command runs or just updates diagnostics/status for save events, logs to the output channel, and clears transient state.

### CLI Flow (v0.3)
```
lace-cli evaluate → File Analyzer (regex-based imports/calls)
                  → Policy Engine + SDLC Memory
                  → Context Compiler (for entropy/context inflation metrics)
                  → Output Formatter (text or JSON)
                  → Exit code (0/1/2/3 based on strict violations, CI thresholds, or config errors)

lace-cli validate-config → YAML loaders (.lace/policies|decisions|requirements) → Deterministic rule checks

lace-cli pr-summary --changed-files → evaluate pipeline per file → aggregate decisions/requirements/entropy delta
```

## 12. Scientific Entropy Model (v0.4)
For each evaluated file *f*, the entropy components are normalized to `[0,1]`:

- `VRS(f) = min(strictViolations / 10, 1)`
- `PDS(f) = violatedPolicies / totalApplicablePolicies` (0 when no applicable policies)
- `DDS(f) = decisionLinkedViolations / decisionsAffectingFile` (0 when no decisions)
- `CIS(f) = min(contextTokens / 400, 1)` using the deterministic token estimator (characters ÷ 4)
- `SCS(f) = min(projectRelativeImports / 20, 1)` where project-relative imports/includes are counted via file-scoped regex heuristics

The final entropy score:

```
E(f) = 0.30·VRS + 0.25·PDS + 0.20·DDS + 0.15·CIS + 0.10·SCS
```

`E(f)` is rounded to four decimals. The Entropy Trend Index stores the delta `ETI(f) = E_current(f) – E_previous(f)` inside `.lace/state.json` under `entropy[relativeFilePath]`, enabling deterministic drift analysis without historical series.

## 13. Determinism Guarantees (v0.5 Phase 5A)
- All emitted sequences (context blocks, CLI JSON arrays, SDLC health sections, PR summaries) are sorted and stable across runs.
- Entropy scores and ETI values are rounded to exactly 4 decimals; tiny differences (<0.0001) collapse to zero for stable trend reporting.
- `.lace/state.json` sanitization ensures only aggregate counters (`violations`, `files`, `entropy`) persist; corrupt files are reset safely with warnings.
- CLI evaluate tests verify that repeated evaluations of unchanged files produce byte-identical JSON output.

## 8. Performance Constraints & Resource Budget
- Activation: <200 ms (command-only activation; lazy module loads).
- Command runtime: YAML load <10 ms (≤50 KB), LSP symbol provider typically <40 ms for 1k LOC, regex scan <10 ms, compilation <20 ms; on-save validation targets <50 ms typical files.
- Memory: <100 MB; no external AST grammars (relies on VSCode APIs).
- CPU: single-shot operations; watchers limited to `.lace` files.
- I/O: read `.lace/policies.yaml` only; no writes besides user-approved comment edits.
- No background daemons or polling loops; everything triggered by command invocation or `.lace` change events.

## 9. VSCode Extension Design
- Activation Event: `onCommand:lace.generateContext` keeps idle footprint near zero.
- Commands: primary generation command + `lace.refreshPolicies` (manual cache clear).
- Health Command: `lace.showSdlcHealth` runs Layer 3 entropy/drift analysis and prints structured text to the output channel.
- Context controls: `lace.contextInjectionMode` governs insertion behavior; `lace.advisoryMode` controls diagnostics/hover verbosity; smart skip avoids injecting empty context blocks.
- Diagnostics: `vscode.DiagnosticCollection` for advisory vs strict severity (strict shown as errors but still non-blocking).
- Output Channel: `LACE Governance` for logs/errors.
- Status Bar: optional indicator showing last evaluation (OK/warning/error).
- Uses `vscode.executeDocumentSymbolProvider` & `vscode.languages.getDiagnostics` to avoid bundling per-language parsers.
- Registers `workspace.onDidSaveTextDocument` to trigger lightweight policy evaluation for supported languageIds, reusing diagnostics/status infrastructure.

## 10. Copilot Context Injection Strategy
- The extension never hooks Copilot internals.
- Command builds deterministic block:
  ```
  // LACE CONTEXT:
  // Language: <languageId>
  // File: <relative path>
  // Function: <name or N/A>
  // Applicable Invariants:
  // - <severity> <rule-id>: <summary>
  // Violations:
  // - <rule-id>: <description>
  // ... N additional rules omitted (if truncated)
  ```
- Comment inserted near cursor or replaces previous LACE block. Developers trigger Copilot afterwards.
- Optionally copy to clipboard in future phases.

## 11. Policy Engine Design
- File: `.lace/policies.yaml`.
- Schema:
  ```yaml
  policies:
    - id: CPP-LAYER-001
      description: "Drivers must not include UI headers"
      language: cpp        # cpp | python | bash | all
      scope:
        module_glob: "src/drivers/**"
      forbidden_imports:
        - "src/ui/**"
      required_imports:
        - "<std_log.h>"
      forbidden_calls:
        - "system"
      required_calls:
        - "LACE_LOG"
      severity: strict      # advisory | strict
  ```
- Runtime:
  - YAML parsed via `js-yaml`; schema validated before use.
  - Language routing: `language: all` applies globally; otherwise filtered by `document.languageId`.
  - Module scopes matched via glob (relative path); absence of scope means global rule.
  - Evaluates forbidden/required imports/includes/source directives and forbidden/required function calls detected by adapters.
- Advisory vs Strict: `strict` → VSCode error severity + status highlight; `advisory` → warning. Both remain non-blocking but appear in the context block’s invariant list.

## 12. File-Level Static Analysis (VSCode LSP + Regex)
- **Language Adapter Contract**:
  ```ts
  interface LanguageAdapter {
    supports(languageId: string): boolean;
    extractImports(text: string, documentPath: string): Promise<string[]>;
    extractFunctionCalls(text: string): string[];
  }
  ```
  Adapters also expose helper hooks (e.g., include resolution) but the public shape stays simple.
- **Language Routing**: determine adapter by `document.languageId` (`cpp`, `c`, `h`, `hpp`, `python`, `shellscript`).
- **Symbol Extraction**: rely on `vscode.executeDocumentSymbolProvider` to retrieve functions/classes/definitions; used to discover the active symbol under the cursor or save location reference.
- **Import/Include Detection**:
  - *C++*: regex scans for `#include <...>`, `#include "..."`, and `#import`. Quoted includes trigger an on-demand workspace search (glob) to resolve relative paths for policy matching; angle-bracket includes matched as given. Also detects `using namespace` statements for potential policies.
  - *Python*: regex for `import mod`, `from pkg import sym`, and optional alias capture; generates canonical module identifiers for policy comparison.
  - *Bash*: regex for `source`, `. file`, and external command invocations at line start; commands compared against forbidden imports/calls depending on policy intent.
- **Call Detection**:
  - *C++*: regex `\b([A-Za-z_][A-Za-z0-9_]*)\s*\(` filtered to ignore keywords and include macros configured in policies.
  - *Python*: regex `\b([A-Za-z_][A-Za-z0-9_]*)\s*\(` with simple context heuristics to avoid `class`/`def`.
  - *Bash*: regex for `$(cmd ...)`, backticks, direct command names; highlights dangerous operations (e.g., `rm`, `curl`, `wget`) per policy.
- **Cursor Context**: map selection to the nearest symbol returned by Document Symbols; fallback to file-level scope when unavailable.
- **Diagnostics Integration**: incorporate `vscode.languages.getDiagnostics(document.uri)` to highlight existing include/import issues alongside policy findings.
- **Constraints**: strictly file-scoped, no AST graphs, no repo indexing. If Document Symbols fail, revert to regex-only extraction with an explicit warning.

## 13. Context Compiler Design
- Input: metadata (language, relative path, active symbol, imports/includes list, detected calls, diagnostics) + `PolicyMatch[]`.
- Steps:
  1. Normalize data (language, symbol names, truncated import list, top 5 invariants sorted strict→advisory).
  2. Estimate tokens with `estimateTokens = Math.ceil(charCount / 4)` to enforce ≤400 tokens.
  3. If limit exceeded, progressively truncate invariants/violations and append `// ... N additional rules omitted`.
  4. Render deterministic comment block and produce analytics for UI (counts, truncation info).
- Output consumed for both editor insertion (command flow) and diagnostics logging; no Markdown allowed.

## 14. On-Save Validation Flow
- VSCode hook: `workspace.onDidSaveTextDocument`.
- Guard clauses ensure only supported languageIds (`cpp`, `c`, `h`, `hpp`, `python`, `shellscript`) trigger evaluation.
- Reuses the same pipeline as the command but skips context insertion—only diagnostics/status updates run.
- Strict violations: surfaced as `DiagnosticSeverity.Error`, status bar set to error color, output log entry recorded.
- Advisory violations: surfaced as warnings; status bar indicates “Advisory”.
- Target runtime <50 ms per document by reusing cached policies and LSP data when available.

## 15. Configuration & SDLC Artifacts (`.lace` Folder)
- `.lace/policies.yaml` is mandatory; `.lace/README.md` optional.
- `.lace/decisions.yaml` (design) will capture decision metadata for Layer 2:
  ```yaml
  decisions:
    - id: DECISION-001
      title: "Drivers isolate UI"
      rationale: "Safety-critical separation"
      linked_policies:
        - CPP-LAYER-001
  ```
- `.lace/requirements.yaml` (design) will capture requirement linkages:
  ```yaml
  requirements:
    - id: REQ-042
      description: "CLI tooling must not mutate user config"
      modules:
        - "scripts/**/*.sh"
      decisions:
        - DECISION-010
  ```
- `.lace/state.json` tracks strict violation recurrence counts (per rule + per file) and is updated lazily when strict violations occur.
- Extension searches upward from workspace folders to locate `.lace`.
- File watcher invalidates cached policies immediately on change.
- Future phases may add `.lace/config.json` for thresholds but keep it lightweight.

## 16. Layer 2 — SDLC Memory Layer (Minimal Activation)
- **Purpose**: persist architectural knowledge (decisions, requirements, strict violation counts) for reuse by the Governance Kernel and future lifecycle layers.
- **Modules (`src/sdlc/`)**:
  - `decisionLedger.ts`: parses `.lace/decisions.yaml`, matches `affected_modules` globs and `linked_policies` against the current evaluation, returns up to two decisions deterministically.
  - `requirementGraph.ts`: parses `.lace/requirements.yaml`, matches `modules` globs, filters out `stage: stable`, and returns at most one active requirement per file.
  - `persistentState.ts`: lazily reads/writes `.lace/state.json` to track strict violation recurrence per rule/file with debounced disk writes.
  - `testContractMap.ts`: placeholder for future policy-to-test linkage.
- **Governance Kernel Hooks**:
  - After policy evaluation, strict violations increment recurrence counts via `persistentState`.
  - Context Compiler consumes `DecisionRecord[]` and optional `RequirementRecord` to render the new sections in the context block.
- **Schema Alignment**: `.lace/decisions.yaml`, `.lace/requirements.yaml`, and `.lace/state.json` are all file-scoped; no indexing or background watchers beyond `.lace` invalidation.

## 17. Layer 3 — Lifecycle Intelligence Layer (Interfaces)
- **Purpose**: provide longitudinal insights without violating lightweight constraints; everything runs on-demand using existing evaluation outputs and `.lace/state.json`.
- **Modules (`src/lifecycle/`)**:
  - `entropyEngine.ts`: `EntropyScoreEngine.generateReport({ laceRoot, evaluation }) -> EntropyReport` (violation recurrence, drift indicators, context inflation, coupling metrics).
  - `driftDetector.ts`: `DriftDetector.analyze({ laceRoot, evaluation, violationThreshold }) -> DriftReport` (recurring violations, unstable modules, ignored decisions).
  - `impactAnalyzer.ts`: `ChangeImpactAnalyzer.summarize(laceRoot, evaluation) -> ImpactSummary` (affected requirements/decisions/policies).
  - `contextDeltaOptimizer.ts`: `ContextDeltaOptimizer.optimize(previousContext, data) -> string` to shrink redundant context blocks.
- **Execution Philosophy**: pure synchronous/promise-based helpers; on-demand only (VSCode command “LACE: Show SDLC Health” reuses these reports). No repo indexing, background tasks, or additional storage.

## 18. Layer 4 — Org & CI Integration Layer (Design Only)
- **Purpose**: extend governance beyond local VSCode usage.
- **Planned Components**:
  - `cli/` entrypoint: wraps Governance Kernel evaluation for headless runs.
  - Git hook adapters: scripts invoking the CLI on pre-commit/pre-push.
  - CI policy enforcement: Node CLI or npm script producing JSON summaries for CI pipelines.
  - PR summary generator: uses context compiler outputs + violation lists to annotate pull requests.
- **Principles**: reuse Layer 1 evaluators; no background services or databases. CLI reads `.lace` artifacts, evaluates requested files, and exits with deterministic status codes.

## 19. Advisory vs Strict Mode
- Shared evaluation path; severity only impacts presentation.
- Advisory: warnings in diagnostics + advisory note in context block.
- Strict: VSCode error severity + status bar highlight; still advisory (no file locking or edits).
- Severity controlled per policy in YAML; no runtime toggles in Phase 1.

## 20. Incremental Parsing Strategy
- No repo-wide ASTs or caches. Evaluate one file per command/save.
- LSP requests (`executeDocumentSymbolProvider`) scoped to active document only.
- Regex fallback is also per-file and discardable.
- No background indexing; watchers limited to `.lace`.

## 21. Error Handling Strategy
- Missing `.lace` → warning toast + output log; command exits early.
- YAML syntax errors → diagnostic message referencing `.lace/policies.yaml`.
- LSP failures → log warning and degrade to regex-only scanning; still produce advisory output.
- Regex failures or unexpected issues → log error, mark diagnostics as “degraded mode”.
- Promise rejections guarded to avoid crashing VSCode extension host.

## 22. Open Source Strategy
- MIT license (already present). Encourage contributions via docs & examples.
- Keep dependencies minimal (TypeScript, VSCode API, `js-yaml`, `picomatch`).
- Provide sample `.lace` directory and contributing guide in future commits.
- Lightweight CI (lint/test) planned to stay <1 minute runtime and avoid external services.

## 23. Layered Expansion Plan
- **Layer 1 (Phase 1)**: VSCode Governance Kernel (current work).
- **Layer 2 (Phase 2)**: Activate SDLC Memory Layer (decisions/requirements/test contracts) while keeping deterministic file-scoped operations.
- **Layer 3 (Phase 3)**: Introduce lifecycle intelligence algorithms (drift, impact, entropy, context deltas) that run on-demand/CI.
- **Layer 4 (Phase 4)**: Deliver CLI, git hooks, CI policy gates, and PR summaries.

---

*Last updated: Phase 1 multi-layer baseline focusing on Governance Kernel implementation.*
