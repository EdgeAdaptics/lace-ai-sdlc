# Lace-AI-SDLC — Lightweight AI-SDLC Governance Engine

## Overview
Lace is a deterministic governance layer that sits beside GitHub Copilot. It loads repository policies, parses only the active file, and injects a compact context block so AI-assisted code stays aligned with architectural invariants. In Phase 1 we activate the Governance Kernel and a minimal SDLC Memory Layer: `.lace/decisions.yaml` and `.lace/requirements.yaml` are parsed on demand, and strict violation counts persist in `.lace/state.json`. No local LLMs, no background daemons, no heavy indexing—just on-demand enforcement that keeps prompts concise.

## Current Phase (Phase 1)
- VSCode extension command: `LACE: Generate with Governance Context`.
- YAML-driven policy engine scoped per module/function with import/call invariants.
- Parser extracts imports/classes/functions from the active document (file-scoped only).
- Token-bounded context compiler (≤400 tokens) emits structured comments, replaces previous LACE blocks, embeds linked decisions/requirements, and feeds the entropy model.
- Context injection modes (`replace`, `cursor`, `top`, `clipboard`) plus smart skip when nothing needs to be shared.
- Advisory mode control (silent/normal/verbose) and diagnostic hovers with policy/decision/drift metadata.
- Automatic `.lace/policies.yaml` watcher keeps policy caches fresh without manual commands.
- On-save evaluation uses the same pipeline to refresh diagnostics without blocking edits.
- SDLC Memory Layer (minimal) parses `.lace/decisions.yaml` / `.lace/requirements.yaml` and tracks strict violation recurrence and entropy per file in `.lace/state.json`.
- Scientific entropy engine (VRS/PDS/DDS/CIS/SCS) computes deterministic scores and Entropy Trend Indexes per file.
- Vitest-based unit coverage for policy engine, parser, SDLC memory, persistent state, and context compiler.

See `docs/FEATURES.md` for the full capability list, `docs/ARCHITECTURE.md` for the complete design document, `docs/DEVELOPMENT.md` for build + testing instructions, and `ROADMAP.md` for the phased plan.

## Repository Structure
```
docs/
  ARCHITECTURE.md
  FEATURES.md
  DEVELOPMENT.md
src/
  core/         # Policy engine, evaluator, severity helpers
  context/      # Token-limited context compiler
  sdlc/         # Decisions, requirements, persistent state
  services/     # Legacy config + parser utilities (migrating toward adapters)
  commands/, vscode/, etc.
.lace/
  policies.yaml
  decisions.yaml
  requirements.yaml
  state.json
```

## Getting Started
1. Install dependencies (after scaffold lands): `npm install`.
2. Create `.lace/policies.yaml`, `.lace/decisions.yaml`, and `.lace/requirements.yaml` with your invariants.
3. Run the VSCode extension in debug mode and invoke “LACE: Generate with Governance Context”.
4. Modify any `.lace/*.yaml` files whenever governance rules change—the watcher automatically clears caches.

## Commands
- `LACE: Generate with Governance Context` — parses the active file, evaluates policies, inserts/replaces the structured context block, and surfaces diagnostics.
- `LACE: Refresh Policies` — clears cached YAML policies so the next run reloads them from `.lace/policies.yaml` (mostly redundant now that watchers exist, but still available for manual resets).
- `LACE: Show SDLC Health` — runs Layer 3 lifecycle analytics (entropy + drift) for the active file and prints a structured report to the output channel.

## CLI Usage
- `lace-cli evaluate <files> [--strict-only] [--json]` — deterministic evaluation with exit codes (0 success, 1 strict violations, 2 CI threshold failure).
- `lace-cli validate-config` — checks `.lace` policies/decisions/requirements for duplicate IDs or orphaned references (exit code 3 on failure).
- `lace-cli pr-summary --changed-files file1 file2` — aggregates affected decisions/requirements, new strict violations, and entropy deltas for PRs.

## Production Readiness Notes
- Outputs (context, CLI, SDLC health) are fully sorted and deterministic.
- Entropy scores and ETI values are rounded to four decimals and persisted in `.lace/state.json` with corruption recovery.
- State persistence contains only aggregate counts and entropy entries—no histories, timestamps, or unbounded growth.
- Exit codes remain fixed: 0 success, 1 strict violations, 2 CI threshold failure, 3 config validation failure.

## Roadmap
- Phase 1: Minimal viable governance layer (in progress).
- Phase 2: Expanded language support, CLI/CI integration.
- Phase 3: Repo-level summaries and CI gates without heavy services.
