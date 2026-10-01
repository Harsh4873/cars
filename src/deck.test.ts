import { decide, likes, loadHistory, money, remainingIds, saveHistory, undo } from './deck';

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
    expect(decide(once, 'a', 'nope')).toEqual(once);
  });

  it('formats dollars', () => {
    expect(money(7500)).toBe('$7,500');
  });

  it('drops unknown ids from storage', () => {
    localStorage.setItem(
      'harsh-bet-cars-v1',
      JSON.stringify([
        { id: 'keep', decision: 'like' },
        { id: 'gone', decision: 'nope' },
        { id: 'keep', decision: 'maybe' },
      ]),
    );
    expect(loadHistory(['keep'])).toEqual([{ id: 'keep', decision: 'like' }]);
    saveHistory([]);
    expect(loadHistory(['keep'])).toEqual([]);
  });
});
