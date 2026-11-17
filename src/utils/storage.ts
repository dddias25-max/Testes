import type { LedgerStore } from '../types/finance';
import { createSeedStore } from './finance';

const STORAGE_KEY = 'planilha_financeira_mensal_v1';
export const DEFAULT_ACTIVE_MONTH = '2026-11';

export function loadLedgerStore(): LedgerStore {
  if (typeof window === 'undefined') {
    return createSeedStore(DEFAULT_ACTIVE_MONTH);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createSeedStore(DEFAULT_ACTIVE_MONTH);
    }
    const parsed = JSON.parse(raw) as LedgerStore;
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
      return createSeedStore(DEFAULT_ACTIVE_MONTH);
    }
    return parsed;
  } catch {
    return createSeedStore(DEFAULT_ACTIVE_MONTH);
  }
}

export function saveLedgerStore(store: LedgerStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetLedgerStore(): LedgerStore {
  const seed = createSeedStore(DEFAULT_ACTIVE_MONTH);
  saveLedgerStore(seed);
  return seed;
}
