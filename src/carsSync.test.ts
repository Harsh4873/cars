import { describe, expect, it } from 'vitest';
import { chooseHistory, parseCloudHistory, type HistoryVersion } from './carsSync';

const local: HistoryVersion = { history: [{ id: 'a', decision: 'like' }], updatedAtMs: 10, clientId: 'a' };
const remote: HistoryVersion = { history: [{ id: 'b', decision: 'nope' }], updatedAtMs: 11, clientId: 'b' };

describe('whole-history sync', () => {
  it('uses the newer complete history, so undo and reset can remove decisions', () => {
    expect(chooseHistory(local, remote)).toBe(remote);
    const reset = { history: [], updatedAtMs: 12, clientId: 'a' };
    expect(chooseHistory(reset, remote)).toBe(reset);
  });
  it('breaks timestamp ties with client id', () => {
    expect(chooseHistory({ ...local, updatedAtMs: 11 }, remote)).toBe(remote);
  });
  it('rejects malformed cloud history', () => {
    expect(parseCloudHistory({ schemaVersion: 1, history: [{ id: 'a', decision: 'like' }], updatedAtMs: 10, clientId: 'a' }, ['a'])).toEqual(local);
    expect(parseCloudHistory({ schemaVersion: 1, history: [{ id: 'a', decision: 'like' }, { id: 'a', decision: 'nope' }], updatedAtMs: 10, clientId: 'a' }, ['a'])).toBeNull();
    expect(parseCloudHistory({ schemaVersion: 1, history: [{ id: 'unknown', decision: 'like' }], updatedAtMs: 10, clientId: 'a' }, ['a'])).toBeNull();
  });
});
