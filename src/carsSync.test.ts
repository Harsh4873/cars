import { describe, expect, it } from 'vitest';
import { adoptPeerHistory, applyCloudHistory, chooseHistory, parseCloudHistory, type HistoryVersion } from './carsSync';

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
  it('rejects a document that is not a history record', () => {
    expect(parseCloudHistory(null, ['a'])).toBeNull();
    expect(parseCloudHistory({ schemaVersion: 2, history: [], updatedAtMs: 10, clientId: 'a' }, ['a'])).toBeNull();
    expect(parseCloudHistory({ schemaVersion: 1, history: 'nope', updatedAtMs: 10, clientId: 'a' }, ['a'])).toBeNull();
    expect(parseCloudHistory({ schemaVersion: 1, history: [], updatedAtMs: 10.5, clientId: 'a' }, ['a'])).toBeNull();
    expect(parseCloudHistory({ schemaVersion: 1, history: [], updatedAtMs: 10, clientId: '' }, ['a'])).toBeNull();
  });
  it('keeps readable rows when the cloud array has junk', () => {
    expect(parseCloudHistory({ schemaVersion: 1, history: [{ id: 'a', decision: 'like' }], updatedAtMs: 10, clientId: 'a' }, ['a'])).toEqual(local);
    expect(parseCloudHistory({
      schemaVersion: 1,
      history: [{ id: 'a', decision: 'like' }, { id: 'a', decision: 'nope' }, null, { id: 'unknown', decision: 'like' }, { id: 'b', decision: 'maybe' }],
      updatedAtMs: 10,
      clientId: 'a',
    }, ['a', 'b'])).toEqual(local);
    expect(parseCloudHistory({ schemaVersion: 1, history: [{ id: 'unknown', decision: 'like' }], updatedAtMs: 10, clientId: 'a' }, ['a'])).toEqual({
      history: [],
      updatedAtMs: 10,
      clientId: 'a',
    });
  });
  it('does not let a salvaged empty cloud array erase local decisions', () => {
    const parsed = parseCloudHistory({ schemaVersion: 1, history: [{ id: 'sold', decision: 'like' }], updatedAtMs: 50, clientId: 'remote' }, ['a']);
    expect(parsed?.history).toEqual([]);
    const applied = applyCloudHistory(local, parsed!, 1);
    expect(applied.repair).toBe(true);
    expect(applied.version.history).toEqual(local.history);
    expect(applied.version.updatedAtMs).toBe(51);
    expect(applied.version.clientId).toBe('a');
  });
  it('still accepts a real reset', () => {
    const cleared: HistoryVersion = { history: [], updatedAtMs: 12, clientId: 'b' };
    expect(applyCloudHistory(local, cleared, 0)).toEqual({ version: cleared, repair: false });
  });
  it('writes a cleaned newer cloud array back without dropping its real decisions', () => {
    const parsed = parseCloudHistory({
      schemaVersion: 1,
      history: [{ id: 'b', decision: 'nope' }, { id: 'sold', decision: 'like' }],
      updatedAtMs: 11,
      clientId: 'b',
    }, ['a', 'b']);
    const applied = applyCloudHistory(local, parsed!, 2);
    expect(applied.repair).toBe(true);
    expect(applied.version.history).toEqual(remote.history);
    expect(applied.version.updatedAtMs).toBe(12);
    expect(applied.version.clientId).toBe(local.clientId);
  });
  it('does not bump again when local is already ahead of a dirty cloud copy', () => {
    const dirty: HistoryVersion = { history: [{ id: 'a', decision: 'like' }], updatedAtMs: 4, clientId: 'b' };
    expect(applyCloudHistory(local, dirty, 2)).toEqual({ version: local, repair: false });
  });
  it('adopts a newer history written by another tab', () => {
    const stored: HistoryVersion = { history: [{ id: 'a', decision: 'like' }, { id: 'b', decision: 'nope' }], updatedAtMs: 11, clientId: 'a' };
    expect(adoptPeerHistory(local, stored)).toBe(stored);
    expect(adoptPeerHistory(stored, local)).toBeNull();
    const tie: HistoryVersion = { history: [{ id: 'b', decision: 'nope' }], updatedAtMs: 10, clientId: 'a' };
    expect(adoptPeerHistory(local, tie)).toBe(tie);
    expect(adoptPeerHistory(local, { ...local })).toBeNull();
  });
});
