## LACE v0.5.0-beta Launch Notes

AI pair programmers accelerate code creation but also amplify architectural entropy. Helper models rarely remember that UI modules must not import storage, or that shell scripts may only call audited tools. LACE (Local AI-SDLC Cognition & Governance Engine) addresses that gap with deterministic governance. Policies, decisions, and requirements live in `.lace/` and are enforced whenever a developer evaluates a file in VSCode or runs the CLI. The result is predictable signal: for a given file, policy set, and cursor position, LACE always produces the same diagnostics, context block, and entropy metrics.

### Problem Statement
AI-generated code often slips past architectural guardrails. Traditional linters focus on syntax and style, while manual prompts rely on developers remembering to ask the assistant for the right constraints. Once the code lands in CI, reviewers must catch architectural violations by hand. This does not scale. LACE keeps governance close to the code by reading file-scoped imports, symbols, and dangerous calls, mapping them to declarative policies, and injecting a structured summary back into the file or onto the clipboard. The same engine powers the CLI so CI can enforce the policies with deterministic exit codes.

### Deterministic Governance Philosophy
LACE avoids heuristics and background daemons. Evaluations read only the files explicitly requested, parse policies/decisions/requirements once per CLI invocation, and output sorted lists with bounded sizes. Entropy scoring uses a deterministic formula: Violation Recurrence, Policy Drift, Decision Drift, Context Inflation, and Coupling scores all live in `[0,1]`. The weighted sum `E(f)` is rounded to four decimals, and the Entropy Trend Index stores `E_current - E_previous` in `.lace/state.json` (also rounded). Differences smaller than 0.0001 collapse to zero, so floating noise never appears in diagnostics. Because the outputs are deterministic, CI can gate merges on strict violations or threshold breaches without worrying about inconsistent results.

### Scope Boundaries
- **File-scoped only**: no repository indexing, no cross-file AST traversal, no daemons.
- **Local-first**: no remote services, no embedded LLMs, no hidden prompts.
- **Explicit policies**: architecture rules live in YAML, undergo code review, and are traceable via IDs.
- **Limited integrations**: LACE does not hijack assistant prompts or keybindings; it emits context blocks and diagnostics for the developer to use.
- **Bounded state**: `.lace/state.json` stores only aggregate violation counts, file counts, and entropy values with corruption recovery.

### Entropy Model and ETI
The scientific entropy model aggregates five normalized components (VRS/PDS/DDS/CIS/SCS) to produce a bounded `E(f)`. ETI captures per-file drift between evaluations, enabling CI thresholds such as `maxEntropyScore`, `maxContextInflation`, and `failOnDecisionDrift`. Scores are stored with four-decimal precision to prevent drift. Entropy is not probabilistic; it is a deterministic summary of policy adherence for that file.

### CI Integration and Determinism Guarantees
`lace-cli evaluate` supports `--strict-only` and `--json` options, returns deterministic JSON (sorted arrays, no timestamps), and exits with stable codes (0 success, 1 strict violations, 2 CI threshold failure). YAML files are parsed once per CLI process, so large policy sets do not incur repeated I/O. Regexes for import and call detection are anchored and tested against 10k-character lines to avoid catastrophic backtracking. Repeat runs over the same files yield byte-identical JSON, and dedicated tests ensure state corruption recovery and entropy rounding remain stable.

### Call to Engineers
LACE is not a marketing demo; it is an engineering tool for teams that value predictable governance around AI-assisted workflows. Version 0.5.0-beta delivers a stable Governance Kernel, SDLC Memory layer, deterministic entropy model, and CLI suitable for CI gating. Upcoming milestones (stress validation and final CI polish) will complete the path to 1.0.0. Until then, contributors are invited to test the current beta, add policies for their repositories, and file issues with determinism or governance observations—always within the constraints of the deterministic architecture.
