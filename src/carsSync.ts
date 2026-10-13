import { doc, type DocumentReference, type Firestore } from 'firebase/firestore';
import type { HistoryItem } from './deck';

function sameHistory(left: HistoryItem[], right: HistoryItem[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!a || !b || a.id !== b.id || a.decision !== b.decision) return false;
  }
  return true;
}

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
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const decision = entry.decision;
    if (typeof entry.id !== 'string' || seen.has(entry.id) || !known.has(entry.id)) continue;
    if (decision !== 'like' && decision !== 'nope') continue;
    seen.add(entry.id);
    history.push({ id: entry.id, decision });
  }
  return { history, updatedAtMs: row.updatedAtMs, clientId: row.clientId };
}

/**
 * Dropped rows (sold cars, duplicates, junk) must not make the document unreadable.
 * A newer cloud array that salvages to nothing does not erase local decisions.
 * A real reset is an empty list, so it still wins on timestamp.
 * Repair bumps the clock once so the cleaned array can be written back.
 * A local copy that is already strictly newer is uploaded as-is, without another bump.
 */
export function applyCloudHistory(
  local: HistoryVersion,
  remote: HistoryVersion,
  rawCount: number,
): { version: HistoryVersion; repair: boolean } {
  const dropped = Math.max(0, rawCount - remote.history.length);
  if (dropped === 0) return { version: chooseHistory(local, remote), repair: false };
  const keepLocal = remote.history.length === 0 && local.history.length > 0;
  const winner = keepLocal ? local : chooseHistory(local, remote);
  if (winner === local && local.updatedAtMs > remote.updatedAtMs) {
    return { version: local, repair: false };
  }
  return {
    repair: true,
    version: {
      history: winner.history,
      updatedAtMs: Math.max(local.updatedAtMs, remote.updatedAtMs) + 1,
      clientId: local.clientId,
    },
  };
}

/** Another tab wrote local storage. Take that copy when its clock is newer, or when the clock ties and the arrays differ. */
export function adoptPeerHistory(local: HistoryVersion, stored: HistoryVersion): HistoryVersion | null {
  if (stored.updatedAtMs > local.updatedAtMs) return stored;
  if (stored.updatedAtMs === local.updatedAtMs && !sameHistory(local.history, stored.history)) return stored;
  return null;
}
