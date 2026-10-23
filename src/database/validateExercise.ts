import type { Database, SqlJsStatic } from 'sql.js';
import { SEED_SQL } from '../data/dataset';
import { exercises } from '../data/exercises';
import { executeSql } from './engine';
import type { CellValue, QueryResult } from './types';

export interface ValidationResult {
  passed: boolean;
  message: string;
}

function rowKey(row: CellValue[]) {
  return JSON.stringify(row.map((cell) => typeof cell === 'number'
    ? ['number', Number.isInteger(cell) ? cell : Number.isFinite(cell) ? Number(cell.toPrecision(12)) : String(cell)]
    : [cell === null ? 'null' : 'text', cell]));
}

export function compareQueryResults(actual: QueryResult, expected: QueryResult, ordered: boolean): ValidationResult {
  if (actual.truncated || expected.truncated) return { passed: false, message: '结果超出校验范围，请精简查询后重试。' };
  if (actual.columns.length !== expected.columns.length) return { passed: false, message: `需要返回 ${expected.columns.length} 列，当前返回 ${actual.columns.length} 列。请检查字段与列顺序，别名不限。` };
  if (actual.values.length !== expected.values.length) return { passed: false, message: `需要返回 ${expected.values.length} 行，当前返回 ${actual.values.length} 行。请检查筛选、关联与重复项。` };
  const actualRows = actual.values.map(rowKey);
  const expectedRows = expected.values.map(rowKey);
  if (!ordered) { actualRows.sort(); expectedRows.sort(); }
  const passed = actualRows.every((row, index) => row === expectedRows[index]);
  return {
    passed,
    message: passed ? '结果与参考答案一致！可以继续尝试其他写法，再自主标记掌握。'
      : ordered ? '结果内容或顺序不一致，请检查排序方向和同值排序规则。'
        : '结果内容不一致，请检查字段顺序、NULL、计算结果与重复项。',
  };
}

function query(db: Database, sql: string) {
  const statements = db.iterateStatements(sql);
  let count = 0;
  for (const statement of statements) {
    count += 1;
    const text = statement.getSQL().replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '');
    if (count > 1 || !/^(SELECT|WITH)\b/i.test(text) || statement.getColumnNames().length === 0) {
      throw new Error('查询练习请提交一条 SELECT 或 WITH 查询，不包含其他操作。');
    }
  }
  if (count !== 1) throw new Error('请先编写一条查询语句。');
  db.run('PRAGMA query_only = ON;');
  const execution = executeSql(db, sql);
  if (execution.error) throw new Error(execution.error);
  return execution.results[0];
}

export function validateExercise(SQL: SqlJsStatic, id: number, sql: string): ValidationResult {
  const exercise = exercises.find((item) => item.id === id);
  if (!exercise || id > 18) return { passed: false, message: '这道题请参照答案自主验证并标记掌握。' };
  if (sql.length > 50_000) return { passed: false, message: 'SQL 超过 50,000 个字符，请精简后重试。' };
  const actual = new SQL.Database();
  const expected = new SQL.Database();
  try {
    actual.run(SEED_SQL);
    expected.run(SEED_SQL);
    return compareQueryResults(query(actual, sql), query(expected, exercise.answer), id === 4 || id === 5);
  } catch (error) {
    return { passed: false, message: `无法完成校验：${error instanceof Error ? error.message : String(error)}` };
  } finally {
    actual.close();
    expected.close();
  }
}
