export interface HistoryEntry {
  id?: string;
  sql: string;
  time: string;
  dataset?: string;
  status?: 'running' | 'success' | 'error' | 'interrupted';
  duration?: number;
  error?: string;
}

export function validQueryRecords(value: unknown, limit: number): value is HistoryEntry[] {
  return Array.isArray(value) && value.length <= limit && value.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return typeof record.sql === 'string' && typeof record.time === 'string'
      && (record.id === undefined || typeof record.id === 'string')
      && (record.dataset === undefined || typeof record.dataset === 'string')
      && (record.duration === undefined || typeof record.duration === 'number' && Number.isFinite(record.duration))
      && (record.error === undefined || typeof record.error === 'string')
      && (record.status === undefined || ['running', 'success', 'error', 'interrupted'].includes(String(record.status)));
  });
}

export const isHistory = (value: unknown): value is HistoryEntry[] => validQueryRecords(value, 30);
export const isFavorites = (value: unknown): value is HistoryEntry[] => validQueryRecords(value, 100);

export function sameQuery(a: HistoryEntry, b: HistoryEntry) {
  return a.sql === b.sql && a.dataset === b.dataset;
}
