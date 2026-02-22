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
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const state: PersistentState = parsed ?? { violations: {}, files: {} };
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
