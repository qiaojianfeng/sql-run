import { describe, expect, it } from 'vitest';
import { isFavorites, isHistory, sameQuery } from './queryHistory';

describe('历史记录兼容与收藏', () => {
  it('兼容只有 SQL 和时间的旧记录，并接受新执行状态', () => {
    expect(isHistory([{ sql: 'SELECT 1;', time: '旧记录' }])).toBe(true);
    expect(isHistory([{ id: '1', sql: 'SELECT 1;', time: '现在', status: 'error', duration: 1.5, dataset: '实验库', error: '失败' }])).toBe(true);
  });

  it('拒绝无效持久化状态与超量记录', () => {
    expect(isHistory([{ sql: 'SELECT 1;', time: '', duration: 'bad' }])).toBe(false);
    expect(isHistory([{ sql: '', time: '', status: 'invalid' }])).toBe(false);
    expect(isHistory(Array.from({ length: 31 }, () => ({ sql: '', time: '' })))).toBe(false);
    expect(isFavorites(Array.from({ length: 100 }, () => ({ sql: '', time: '' })))).toBe(true);
  });

  it('收藏按 SQL 和所属实验库去重', () => {
    const record = { sql: 'SELECT 1;', time: '', dataset: 'default' };
    expect(sameQuery(record, { ...record, time: '另一个时间' })).toBe(true);
    expect(sameQuery(record, { ...record, dataset: 'custom' })).toBe(false);
  });
});
