import { doc, type DocumentReference, type Firestore } from 'firebase/firestore';
import type { HistoryItem } from './deck';

export interface HistoryVersion {
  history: HistoryItem[];
  updatedAtMs: number;
  clientId: string;
}

export const HISTORY_UPDATED_KEY = 'harsh-bet-cars-v1-updated-at-ms';

export function carsDocument(db: Firestore, vaultId: string): DocumentReference {
  return doc(db, 'users', vaultId, 'cars', 'core');
}

/** A whole-array last-write-wins register. A stable client id breaks millisecond ties. */
export function chooseHistory(local: HistoryVersion, remote: HistoryVersion): HistoryVersion {
  if (local.updatedAtMs !== remote.updatedAtMs) {
    return local.updatedAtMs > remote.updatedAtMs ? local : remote;
  }
  return local.clientId >= remote.clientId ? local : remote;
}

export function parseCloudHistory(value: unknown, knownIds: readonly string[]): HistoryVersion | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.schemaVersion !== 1 || !Array.isArray(row.history)
    || typeof row.updatedAtMs !== 'number' || !Number.isSafeInteger(row.updatedAtMs)
    || typeof row.clientId !== 'string' || !row.clientId) return null;
  const known = new Set(knownIds);
  const seen = new Set<string>();
  const history: HistoryItem[] = [];
  for (const item of row.history) {
    if (!item || typeof item !== 'object') return null;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== 'string' || typeof entry.decision !== 'string'
      || !known.has(entry.id) || seen.has(entry.id)
      || (entry.decision !== 'like' && entry.decision !== 'nope')) return null;
    seen.add(entry.id);
    history.push({ id: entry.id, decision: entry.decision });
  }
  return { history, updatedAtMs: row.updatedAtMs, clientId: row.clientId };
}
