# Changelog

## v0.2.0
- Added context injection modes (replace, cursor, top, clipboard)
- Added advisory mode control (silent, normal, verbose)
- Smart context skipping when no governance data applies
- Structured SDLC health report output
- Diagnostic hover enhancements with policy/decision/drift metadata
- Determinism and sorting improvements across context rendering and health reports

## v0.3.0
- `lace-cli evaluate` strict-only flag and structured exit codes (0 success, 1 strict violations, 2 CI threshold failure, 3 config validation failure)
- `--json` output mode for deterministic machine-readable evaluation results
- `lace-cli validate-config` for duplicate/orphan detection
- CI threshold enforcement via `.lace/policies.yaml` (`maxContextInflation`, `maxEntropyScore`, `failOnDecisionDrift`)
- `lace-cli pr-summary` aggregates decisions, requirements, new strict violations, and entropy deltas
- Documentation updates (roadmap, features, architecture, README) highlighting CLI capabilities

## v0.4.0
- Formal scientific entropy model with normalized VRS/PDS/DDS/CIS/SCS components and weighted score
- Entropy Trend Index persisted per file in `.lace/state.json`
- CLI evaluate/pr-summary outputs include entropy score and trend
- Hover diagnostics reference actual entropy scores in verbose mode
- Documentation updates (architecture, features, roadmap)

## v0.5.0 (Phase 5A)
- Determinism audit: sorted outputs, repeat-run JSON stability, four-decimal entropy rounding
- ETI tolerance handling (tiny drifts collapse to zero)
- `.lace/state.json` corruption detection, sanitization, and bounded structure enforcement
- Hover + SDLC health now reflect rounded entropy values consistently
- Added determinism + state safety test suites
