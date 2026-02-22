# LACE Design Principles

## Determinism Above All
- Same inputs yield the same outputs across IDEs, CI, and CLI.
- Entropy scores, ETI values, diagnostics, and context blocks are sorted and rounded deterministically.
- There are no stochastic components or hidden heuristics; all behavior derives from declarative YAML.

## Bounded Scoring
- Scientific entropy components (VRS, PDS, DDS, CIS, SCS) are normalized to `[0,1]`.
- Final entropy and ETI values are rounded to four decimals before storage/output.
- CI thresholds operate on bounded values, enabling predictable policy gates.

## Explicit Policy Over Implicit Heuristics
- Policies, decisions, and requirements live in `.lace/` as YAML and undergo code review.
- Violations reference policy IDs and optional decisions so developers can trace the rationale.
- No auto-generated or learned rules exist within the engine.

## Local-First Execution
- No background daemons, databases, or remote services are required.
- The VSCode command and CLI evaluate only the requested files and exit.
- All analysis happens locally; LACE never contacts external APIs.

## File-Scoped Linear Scaling
- Evaluations operate on single files or explicit file lists, never the full repository.
- Parsing time is proportional to file size; policy evaluation is proportional to policy count.
- No repository-wide indexing is performed, keeping runtime predictable.

## No Background Services
- Outside of the VSCode command execution, LACE consumes zero CPU/memory.
- The CLI loads YAML and evaluates files within the process lifetime only.
- Caches are per-invocation; nothing persists beyond the process.

## CI Enforceability
- Exit codes are simple and stable: `0` success, `1` strict violations, `2` CI threshold failure, `3` config validation failure.
- JSON output is deterministic and machine-readable for CI annotations.
- CI thresholds (`maxEntropyScore`, `maxContextInflation`, `failOnDecisionDrift`) are optional but enforceable when set.

## Stable Contracts Before 1.0.0
- Architecture, CLI commands, entropy model, and policy schema remain stable through the beta phases.
- Changes are documented in `ROADMAP.md` and `CHANGELOG.md` before adoption.
- 1.0.0 will ship only after determinism, stress, and CI guarantees are validated.
