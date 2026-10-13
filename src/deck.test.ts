import { decide, forget, HISTORY_STORAGE_KEY, likes, loadHistory, money, remainingIds, saveHistory, undo } from './deck';

describe('deck', () => {
  it('walks the deck and can undo', () => {
    const order = ['a', 'b', 'c'];
    let history = decide([], 'a', 'like');
    history = decide(history, 'b', 'nope');
    expect(remainingIds(order, history)).toEqual(['c']);
    expect(likes(history)).toEqual(['a']);
    history = undo(history);
    expect(remainingIds(order, history)).toEqual(['b', 'c']);
  });

  it('does not record the same car twice', () => {
    const once = decide([], 'a', 'like');
    expect(decide(once, 'a', 'nope')).toBe(once);
  });

  it('undo of an empty history keeps the same array', () => {
    const empty: ReturnType<typeof decide> = [];
    expect(undo(empty)).toBe(empty);
  });

  it('forgets one decision and leaves the others', () => {
    const history = decide(decide([], 'a', 'like'), 'b', 'nope');
    expect(forget(history, 'a')).toEqual([{ id: 'b', decision: 'nope' }]);
    expect(forget(history, 'missing')).toBe(history);
  });

  it('formats dollars', () => {
    expect(money(7500)).toBe('$7,500');
  });

  it('drops unknown ids from storage', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        { id: 'keep', decision: 'like' },
        { id: 'gone', decision: 'nope' },
        { id: 'keep', decision: 'nope' },
        { id: 'keep', decision: 'maybe' },
      ]),
    );
    expect(loadHistory(['keep'])).toEqual([{ id: 'keep', decision: 'like' }]);
    saveHistory([]);
    expect(loadHistory(['keep'])).toEqual([]);
  });
});
