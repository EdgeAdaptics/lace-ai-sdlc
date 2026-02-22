import { promises as fs } from 'fs';
import * as path from 'path';

export interface PersistentState {
  violations: Record<string, number>;
  files: Record<
    string,
    {
      violationCount: number;
    }
  >;
  entropy: Record<string, number>;
}

interface StateCacheEntry {
  state: PersistentState;
  initialized: boolean;
}

const stateCache = new Map<string, StateCacheEntry>();
const writeTimers = new Map<string, NodeJS.Timeout>();
const WRITE_DEBOUNCE_MS = 500;

export async function incrementViolation(laceRoot: string, ruleId: string, filePath: string): Promise<void> {
  const state = await loadState(laceRoot);
  state.violations[ruleId] = (state.violations[ruleId] ?? 0) + 1;
  const fileEntry = state.files[filePath] ?? { violationCount: 0 };
  fileEntry.violationCount += 1;
  state.files[filePath] = fileEntry;
  scheduleWrite(laceRoot, state);
}

export async function getViolationCount(laceRoot: string, ruleId: string): Promise<number> {
  const state = await loadState(laceRoot);
  return state.violations[ruleId] ?? 0;
}

export async function getStateSnapshot(laceRoot: string): Promise<PersistentState> {
  return loadState(laceRoot);
}

export async function getEntropyForFile(laceRoot: string, modulePath: string): Promise<number | undefined> {
  const state = await loadState(laceRoot);
  return state.entropy[modulePath];
}

export async function updateEntropyForFile(laceRoot: string, modulePath: string, value: number): Promise<void> {
  const state = await loadState(laceRoot);
  state.entropy[modulePath] = round4(value);
  scheduleWrite(laceRoot, state);
}

async function loadState(laceRoot: string): Promise<PersistentState> {
  const filePath = getStateFile(laceRoot);
  const cached = stateCache.get(filePath);
  if (cached) {
    return cached.state;
  }

  let parsed: PersistentState | undefined;
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    parsed = JSON.parse(raw) as PersistentState;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && code !== 'ENOENT') {
      console.warn('[LACE] Corrupt state.json detected. Resetting persistent state.');
    } else if (!code) {
      console.warn('[LACE] Invalid state.json detected. Resetting persistent state.');
    }
  }

  const state = sanitizeState(parsed);
  stateCache.set(filePath, { state, initialized: true });
  return state;
}

function scheduleWrite(laceRoot: string, state: PersistentState): void {
  const filePath = getStateFile(laceRoot);
  const existingTimer = writeTimers.get(filePath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    writeTimers.delete(filePath);
    try {
      await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('[LACE] Failed to write persistent state:', error);
    }
  }, WRITE_DEBOUNCE_MS);

  writeTimers.set(filePath, timer);
}

function getStateFile(laceRoot: string): string {
  return path.join(laceRoot, 'state.json');
}

function sanitizeState(data: PersistentState | undefined): PersistentState {
  const base: PersistentState = {
    violations: {},
    files: {},
    entropy: {}
  };

  if (!data || typeof data !== 'object') {
    return base;
  }

  if (data.violations && typeof data.violations === 'object') {
    for (const [ruleId, count] of Object.entries(data.violations)) {
      if (typeof ruleId === 'string' && typeof count === 'number' && Number.isFinite(count)) {
        base.violations[ruleId] = count;
      }
    }
  }

  if (data.files && typeof data.files === 'object') {
    for (const [file, info] of Object.entries(data.files)) {
      if (
        typeof file === 'string' &&
        info &&
        typeof info === 'object' &&
        typeof info.violationCount === 'number' &&
        Number.isFinite(info.violationCount)
      ) {
        base.files[file] = { violationCount: info.violationCount };
      }
    }
  }

  if (data.entropy && typeof data.entropy === 'object') {
    for (const [file, score] of Object.entries(data.entropy)) {
      if (typeof file === 'string' && typeof score === 'number' && Number.isFinite(score)) {
        base.entropy[file] = round4(score);
      }
    }
  }

  return base;
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}
