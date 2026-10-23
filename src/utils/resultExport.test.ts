import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../database/types';
import { cellText, resultText } from './resultExport';

const result: QueryResult = {
  sql: '', columns: ['姓名', '内容', '值'],
  values: [['张三', '带逗号,和"引号"\n换行', null], ['李四', '=SUM(A1:A2)', -12]],
  affectedRows: null, truncated: false,
};

describe('查询结果复制与导出', () => {
  it('CSV 保留中文、引号、逗号与换行，区分空字符串和 NULL', () => {
    expect(resultText(result, 'csv')).toBe('姓名,内容,值\r\n张三,"带逗号,和""引号""\n换行",NULL\r\n李四,\'=SUM(A1:A2),-12');
    expect(cellText(null)).toBe('NULL');
    expect(cellText('')).toBe('');
    expect(cellText(0)).toBe('0');
  });

  it('TSV 对制表符及换行转义，表格文本公式按普通文本处理', () => {
    expect(resultText({ ...result, columns: ['x'], values: [['a\tb'], ['@formula']] }, 'tsv'))
      .toBe('x\r\n"a\tb"\r\n\'@formula');
  });

  it('零行结果仍导出表头', () => {
    expect(resultText({ ...result, values: [] }, 'csv')).toBe('姓名,内容,值');
  });
});
