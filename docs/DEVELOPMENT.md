# Development & Testing

## Prerequisites
- Node.js 20+ (only needed for building/testing; extension runtime uses VSCode’s Node host).
- VSCode latest stable with “Extension Development Host” capability.

## Install
```bash
npm install
```

## Build / Type Check
```bash
# Compiles TypeScript into dist/ and surfaces any diagnostics
npm run build
```

## Unit Tests
```bash
# Executes Vitest suites (requires a Linux-native Node runtime or container)
npm run test
```
Use `npm run verify` to perform both the build and test steps sequentially when a Linux-ready Node toolchain is available.

## Run the Extension
1. Open this repository in VSCode.
2. Run the “Launch Extension” configuration (Debug panel). This starts an Extension Development Host.
3. Inside the dev host, open or create `.lace/policies.yaml` (sample already included). The extension watches `**/.lace/policies.yaml` and clears caches automatically on change.
4. Open a TypeScript/JavaScript file, place the cursor where you want governance context, and execute **LACE: Generate with Governance Context**.
5. View advisory output in the “LACE Governance” output channel or the VSCode Problems panel.

## Commands
- `LACE: Generate with Governance Context` — parses the active file, evaluates policies, inserts a structured context comment, and emits diagnostics.
- `LACE: Refresh Policies` — clears the YAML policy cache so the next command run reloads from disk.

## Testing Checklist
- ✅ `npm run build` (TypeScript compilation + static checks).
- ✅ `npm run test` (Vitest unit suite) once a Linux-native Node runtime is available.
- ✅ Manual smoke test via VSCode Extension Host:
  - Run `LACE: Generate with Governance Context` and ensure context comment + diagnostics appear.
  - Edit `.lace/policies.yaml` and observe the automatic watcher clearing caches before the next command.

Keep tests lightweight—no background daemons or repo-wide scans.
