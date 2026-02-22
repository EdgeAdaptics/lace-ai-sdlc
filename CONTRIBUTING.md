# Contributing to LACE

LACE enforces deterministic governance over AI-accelerated codebases. Contributions must preserve the guarantees that make the tool reliable. This document outlines the guardrails, workflow, and review expectations. Please read it carefully before opening a pull request.

## Non-Negotiable Guardrails

All changes **must** preserve the following properties:

1. **Determinism**
   - Given the same inputs, LACE must emit the same context blocks, diagnostics, JSON outputs, entropy scores, and exit codes.
   - No randomness, timestamps, or order-dependent object iteration may leak into outputs.

2. **Bounded Entropy**
   - Entropy scores and ETI values remain in `[0,1]`, rounded to four decimals.
   - The VRS/PDS/DDS/CIS/SCS formulas and weights are frozen unless a formal proposal is approved.

3. **File-Scoped Evaluation**
   - No repository-wide indexing, cross-file AST traversal, or background scanning.
   - Evaluations read only the files explicitly requested (current buffer or CLI file list).

4. **No Background Daemons**
   - The VSCode extension and CLI must exit cleanly when done; no resident agents, watchers, or services.

5. **No Hidden AI Prompts or Probabilistic Scoring**
   - LACE does not call LLMs or embed prompts. All logic must be deterministic and explainable.

6. **Configuration Stability**
   - The YAML schema for policies, decisions, and requirements cannot change without a version bump and clear migration guidance.
   - CLI commands, flags, and exit codes cannot change in a backward-incompatible way without a major version bump.

7. **State Boundaries**
   - `.lace/state.json` stores only `violations`, `files`, and `entropy`. No additional fields or history logs.
   - The file must remain safe to reset and sanitize automatically.

Any pull request that violates these guardrails will be rejected.

## Development Workflow

1. **Fork and Clone** the repository.
2. **Install Dependencies**: `npm install`.
3. **Create a Branch** describing the work (e.g., `fix/context-sorting`).
4. **Run Tests Locally**:
   - `npm run build`
   - `npm run test`
   - Ensure `vitest` determinism suites (e.g., `determinism.test.ts`, `yamlCaching.test.ts`, `regexSafety.test.ts`) pass.
5. **Document Changes**: update relevant markdown files; describe why the change is necessary and how it preserves determinism.
6. **Open a Pull Request** with a clear title, scope description, and a note about determinism impact (if any).

## Testing Requirements

Every contribution must include tests covering the behavior change. Specific expectations:

- **Determinism Tests**: If you touch context generation, CLI output, entropy storage, or diagnostics, add/update the determinism suites to prove repeat runs remain identical.
- **Entropy Model**: The VRS/PDS/DDS/CIS/SCS formulas and weights are frozen. Changes require a design proposal and consensus before implementation. Minor bug fixes must include unit tests confirming entropy stays bounded and rounded.
- **State Handling**: Changes touching `.lace/state.json` must include corrupt/missing file tests ensuring safe recovery.
- **Performance/Regex**: If regex patterns or caching behavior change, add regression tests similar to `regexSafety.test.ts` and `yamlCaching.test.ts`.

## Pull Request Expectations

- Keep PRs focused and reviewable. Avoid mixing refactors with feature changes.
- Cite the guardrails being preserved (e.g., “Sorting invariants before output; determinism test updated”).
- Explain how you verified deterministic behavior (e.g., repeated CLI evaluations, JSON diffs, specific Vitest cases).
- If the change affects documentation, update the relevant files in the same PR.
- The maintainers will reject PRs that modify CLI flags, entropy weights, policy schemas, or exit codes without an approved version bump plan.

## Communications and Proposals

- Use GitHub issues or discussions for substantial design proposals (entropy model changes, new adapters, etc.).
- Provide technical detail: problem statement, deterministic impact, proposed tests, rollout plan.
- Expect architectural review—LACE values predictability over rapid feature addition.

## Summary

LACE’s mission is to provide deterministic, file-scoped governance that teams can trust in IDEs and CI. Contributions must respect that mission. Preserve determinism, keep entropy bounded, avoid heavy infrastructure, and prove changes through tests. If in doubt, start a conversation before writing code. Stable governance depends on stable contributors.
