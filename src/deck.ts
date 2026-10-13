export type Decision = 'like' | 'nope';

export type HistoryItem = {
  id: string;
  decision: Decision;
};

export function remainingIds(order: string[], history: HistoryItem[]): string[] {
  const seen = new Set(history.map((item) => item.id));
  return order.filter((id) => !seen.has(id));
}

export function likes(history: HistoryItem[]): string[] {
  return history.filter((item) => item.decision === 'like').map((item) => item.id);
}

export function decide(history: HistoryItem[], id: string, decision: Decision): HistoryItem[] {
  if (history.some((item) => item.id === id)) return history;
  return [...history, { id, decision }];
}

export function undo(history: HistoryItem[]): HistoryItem[] {
  if (history.length === 0) return history;
  return history.slice(0, -1);
}

export function forget(history: HistoryItem[], id: string): HistoryItem[] {
  if (!history.some((item) => item.id === id)) return history;
  return history.filter((item) => item.id !== id);
}

export function money(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function miles(amount: number): string {
  return `${amount.toLocaleString('en-US')} mi`;
}

export const HISTORY_STORAGE_KEY = 'harsh-bet-cars-v1';

export function loadHistory(knownIds: string[]): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set(knownIds);
    const seen = new Set<string>();
    const history: HistoryItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Partial<HistoryItem>;
      if (typeof row.id !== 'string' || seen.has(row.id) || !known.has(row.id)) continue;
      if (row.decision !== 'like' && row.decision !== 'nope') continue;
      seen.add(row.id);
      history.push({ id: row.id, decision: row.decision });
    }
    return history;
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryItem[]): void {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}
