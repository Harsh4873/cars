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
  return history.slice(0, -1);
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

const STORAGE_KEY = 'harsh-bet-cars-v1';

export function loadHistory(knownIds: string[]): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set(knownIds);
    return parsed.filter((item): item is HistoryItem => {
      if (!item || typeof item !== 'object') return false;
      const row = item as HistoryItem;
      return known.has(row.id) && (row.decision === 'like' || row.decision === 'nope');
    });
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
